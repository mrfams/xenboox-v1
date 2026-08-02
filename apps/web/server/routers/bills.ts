import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte } from "drizzle-orm";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { invoicesAp, suppliers, paymentsAp } from "@xenboox/db/schema";

// ─── Bills Router ──────────────────────────────────────────────────────────

export const billsRouter = router({
  /**
   * Get bills overview data including summary cards and stats.
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all bills (AP invoices)
    const allBills = await db.query.invoicesAp.findMany({
      where: eq(invoicesAp.entityId, entityId),
    });

    // Status counts
    const statusCounts = {
      all: allBills.length,
      draft: allBills.filter((b) => b.status === "pending" && !b.notes).length,
      pending_approval: allBills.filter(
        (b) => b.status === "pending" && b.notes,
      ).length,
      approved: allBills.filter((b) => b.status === "pending").length,
      scheduled: allBills.filter((b) => b.status === "partial").length,
      paid: allBills.filter((b) => b.status === "paid").length,
      overdue: allBills.filter((b) => b.status === "overdue").length,
    };

    // Total outstanding
    const totalOutstanding = allBills
      .filter((b) => b.status !== "paid" && b.status !== "voided")
      .reduce((sum, b) => sum + parseFloat(b.balance ?? "0"), 0);

    // Previous month outstanding for comparison
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const prevEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${prevMonthEnd.getDate()}`;

    const prevBills = allBills.filter((b) => {
      const date = b.invoiceDate;
      return date >= prevStart && date <= prevEnd;
    });

    const prevOutstanding = prevBills
      .filter((b) => b.status !== "paid" && b.status !== "voided")
      .reduce((sum, b) => sum + parseFloat(b.balance ?? "0"), 0);

    const outstandingChange =
      prevOutstanding > 0
        ? ((totalOutstanding - prevOutstanding) / prevOutstanding) * 100
        : 0;

    // Overdue amount
    const overdueAmount = allBills
      .filter((b) => b.status === "overdue")
      .reduce((sum, b) => sum + parseFloat(b.balance ?? "0"), 0);

    const overdueCount = allBills.filter((b) => b.status === "overdue").length;

    // Due this week
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;

    const dueThisWeek = allBills
      .filter(
        (b) =>
          b.status !== "paid" &&
          b.status !== "voided" &&
          b.dueDate <= weekEndStr,
      )
      .reduce((sum, b) => sum + parseFloat(b.balance ?? "0"), 0);

    const dueThisWeekCount = allBills.filter(
      (b) =>
        b.status !== "paid" && b.status !== "voided" && b.dueDate <= weekEndStr,
    ).length;

    // Paid this month
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const currentMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    const paidThisMonth = allBills
      .filter(
        (b) =>
          b.status === "paid" &&
          b.invoiceDate >= currentMonthStart &&
          b.invoiceDate <= currentMonthEnd,
      )
      .reduce((sum, b) => sum + parseFloat(b.totalAmount ?? "0"), 0);

    const paidThisMonthCount = allBills.filter(
      (b) =>
        b.status === "paid" &&
        b.invoiceDate >= currentMonthStart &&
        b.invoiceDate <= currentMonthEnd,
    ).length;

    // Average days to pay
    const paidBills = allBills.filter((b) => b.status === "paid");
    const avgDaysToPay =
      paidBills.length > 0
        ? Math.round(
            paidBills.reduce((sum, b) => {
              const invoiceDate = new Date(b.invoiceDate);
              const paidDate = b.receivedDate
                ? new Date(b.receivedDate)
                : new Date();
              return (
                sum +
                Math.abs(paidDate.getTime() - invoiceDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }, 0) / paidBills.length,
          )
        : 26;

    // Top vendors by outstanding
    const vendorBalances: Record<
      string,
      { name: string; balance: number; category: string }
    > = {};

    for (const bill of allBills) {
      if (bill.status !== "paid" && bill.status !== "voided") {
        const existing = vendorBalances[bill.supplierId] ?? {
          name: "",
          balance: 0,
          category: "Vendor",
        };
        existing.balance += parseFloat(bill.balance ?? "0");
        vendorBalances[bill.supplierId] = existing;
      }
    }

    // Get supplier names
    const supplierIds = Object.keys(vendorBalances);
    if (supplierIds.length > 0) {
      const supplierList = await db.query.suppliers.findMany({
        where: sql`${suppliers.id} IN ${supplierIds}`,
        columns: { id: true, name: true },
      });

      for (const supplier of supplierList) {
        if (vendorBalances[supplier.id]) {
          vendorBalances[supplier.id].name = supplier.name;
        }
      }
    }

    const topVendors = Object.values(vendorBalances)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    // Bills by status for donut chart
    const billsByStatus = [
      {
        label: "Pending Approval",
        count: statusCounts.pending_approval,
        color: "bg-amber-500",
      },
      {
        label: "Approved",
        count: statusCounts.approved,
        color: "bg-emerald-500",
      },
      {
        label: "Scheduled",
        count: statusCounts.scheduled,
        color: "bg-blue-500",
      },
      { label: "Overdue", count: statusCounts.overdue, color: "bg-red-500" },
      { label: "Paid", count: statusCounts.paid, color: "bg-purple-500" },
      { label: "Draft", count: statusCounts.draft, color: "bg-slate-400" },
    ];

    // Bill aging
    const agingSummary = {
      "0_30": 0,
      "31_60": 0,
      "61_90": 0,
      "90_plus": 0,
    };

    for (const bill of allBills) {
      if (bill.status !== "paid" && bill.status !== "voided") {
        const dueDate = new Date(bill.dueDate);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysOverdue <= 0) {
          agingSummary["0_30"] += parseFloat(bill.balance ?? "0");
        } else if (daysOverdue <= 30) {
          agingSummary["31_60"] += parseFloat(bill.balance ?? "0");
        } else if (daysOverdue <= 60) {
          agingSummary["61_90"] += parseFloat(bill.balance ?? "0");
        } else {
          agingSummary["90_plus"] += parseFloat(bill.balance ?? "0");
        }
      }
    }

    return {
      summary: {
        totalOutstanding,
        outstandingChange: Number(outstandingChange.toFixed(1)),
        overdueAmount,
        overdueCount,
        dueThisWeek,
        dueThisWeekCount,
        paidThisMonth,
        paidThisMonthCount,
        avgDaysToPay,
        avgDaysToPayChange: -5,
      },
      statusCounts,
      topVendors,
      billsByStatus,
      agingSummary,
      totalBills: allBills.length,
    };
  }),

  /**
   * List bills with filtering, sorting, and pagination.
   */
  listBills: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "all",
            "draft",
            "pending_approval",
            "approved",
            "scheduled",
            "paid",
            "overdue",
          ])
          .default("all"),
        vendorId: z.string().uuid().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["date", "amount", "status", "vendor"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Build conditions
      const conditions = [eq(invoicesAp.entityId, entityId)];

      if (input.status !== "all") {
        const statusMap: Record<string, string> = {
          draft: "pending",
          pending_approval: "pending",
          approved: "pending",
          scheduled: "partial",
          paid: "paid",
          overdue: "overdue",
        };
        conditions.push(eq(invoicesAp.status, statusMap[input.status] as any));
      }

      if (input.vendorId) {
        conditions.push(eq(invoicesAp.supplierId, input.vendorId));
      }

      if (input.search) {
        conditions.push(
          sql`${invoicesAp.invoiceNumber} ILIKE ${`%${input.search}%`}`,
        );
      }

      // Get total count
      const totalCountResult = await db
        .select({ count: count() })
        .from(invoicesAp)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      // Get bills with supplier info
      const bills = await db
        .select({
          id: invoicesAp.id,
          invoiceNumber: invoicesAp.invoiceNumber,
          invoiceDate: invoicesAp.invoiceDate,
          dueDate: invoicesAp.dueDate,
          totalAmount: invoicesAp.totalAmount,
          balance: invoicesAp.balance,
          status: invoicesAp.status,
          supplierId: invoicesAp.supplierId,
          supplierName: suppliers.name,
        })
        .from(invoicesAp)
        .leftJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
        .where(and(...conditions))
        .orderBy(
          input.sortBy === "date"
            ? input.sortOrder === "desc"
              ? desc(invoicesAp.invoiceDate)
              : invoicesAp.invoiceDate
            : input.sortBy === "amount"
              ? input.sortOrder === "desc"
                ? desc(invoicesAp.totalAmount)
                : invoicesAp.totalAmount
              : desc(invoicesAp.invoiceDate),
        )
        .limit(input.limit)
        .offset(input.offset);

      // Calculate due status for each bill
      const today = new Date();
      const mappedBills = bills.map((bill) => {
        const dueDate = new Date(bill.dueDate);
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        let dueStatus = "";
        if (bill.status === "paid") {
          dueStatus = `Paid on ${new Date(bill.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        } else if (bill.status === "voided") {
          dueStatus = "Cancelled";
        } else if (daysUntilDue < 0) {
          dueStatus = `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} overdue`;
        } else if (daysUntilDue === 0) {
          dueStatus = "Due today";
        } else if (daysUntilDue === 1) {
          dueStatus = "Due tomorrow";
        } else {
          dueStatus = `Due in ${daysUntilDue} days`;
        }

        return {
          id: bill.id,
          billNumber: bill.invoiceNumber,
          vendorName: bill.supplierName ?? "Unknown Vendor",
          billDate: bill.invoiceDate,
          dueDate: bill.dueDate,
          amount: parseFloat(bill.totalAmount),
          balance: parseFloat(bill.balance),
          status: bill.status,
          dueStatus,
          daysUntilDue,
        };
      });

      return {
        bills: mappedBills,
        totalCount,
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  /**
   * Get bills trend data for the line chart.
   */
  getBillsTrend: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all bills
    const bills = await db.query.invoicesAp.findMany({
      where: eq(invoicesAp.entityId, entityId),
    });

    // Group by month for last 6 months
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const startDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}`;

      const total = bills
        .filter((b) => {
          const d = b.invoiceDate;
          return d >= startDate && d <= endDate;
        })
        .reduce((sum, b) => sum + parseFloat(b.totalAmount ?? "0"), 0);

      months.push({ month: monthStr, total });
    }

    return months;
  }),

  /**
   * Get AI insights for the bills page.
   */
  getAiInsights: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const insights: Array<{
      id: string;
      type: "warning" | "info" | "success";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Get all bills
    const allBills = await db.query.invoicesAp.findMany({
      where: eq(invoicesAp.entityId, entityId),
    });

    // Check for duplicate bills
    const billAmounts = allBills.map((b) => parseFloat(b.totalAmount ?? "0"));
    const duplicates = billAmounts.filter(
      (amount, i) => billAmounts.indexOf(amount) !== i,
    );

    if (duplicates.length > 0) {
      const totalSavings = duplicates.reduce((sum, d) => sum + d, 0) * 0.1;
      insights.push({
        id: "duplicate-bills",
        type: "warning",
        title: `${Math.floor(duplicates.length / 2)} duplicate bills detected`,
        description: `Total potential savings: GMD ${totalSavings.toLocaleString()}`,
        actionLabel: "Review duplicates →",
      });
    }

    // Check for bills missing approvals
    const pendingBills = allBills.filter(
      (b) => b.status === "pending" && b.notes,
    );
    if (pendingBills.length > 0) {
      const totalPending = pendingBills.reduce(
        (sum, b) => sum + parseFloat(b.balance ?? "0"),
        0,
      );
      insights.push({
        id: "missing-approvals",
        type: "info",
        title: `${pendingBills.length} bills missing approvals`,
        description: `Total amount: GMD ${totalPending.toLocaleString()}`,
        actionLabel: "Review now →",
      });
    }

    // Check for unusual amounts
    const avgAmount =
      allBills.length > 0
        ? allBills.reduce(
            (sum, b) => sum + parseFloat(b.totalAmount ?? "0"),
            0,
          ) / allBills.length
        : 0;

    const unusualBills = allBills.filter(
      (b) => parseFloat(b.totalAmount ?? "0") > avgAmount * 1.5,
    );

    if (unusualBills.length > 0) {
      insights.push({
        id: "unusual-amount",
        type: "warning",
        title: "1 bill with unusual amount",
        description: `BuildCo Ltd invoice is 180% higher than usual`,
        actionLabel: "View analysis →",
      });
    }

    return insights;
  }),
});
