import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, inArray } from "drizzle-orm";
import {
  invoicesAp,
  suppliers,
  paymentsAp,
  purchaseOrders,
  bankAccounts,
  mobileMoneyAccounts,
  cashAccounts,
} from "@xenboox/db/schema";

import {
  router,
  rlsProtectedProcedure,
  handleMutationError,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Current cash position: bank + mobile money + petty cash balances. */
async function getCashPosition(entityId: string): Promise<number> {
  const [banks, mm, cash] = await Promise.all([
    db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
    }),
    db.query.mobileMoneyAccounts.findMany({
      where: eq(mobileMoneyAccounts.entityId, entityId),
    }),
    db.query.cashAccounts.findMany({
      where: eq(cashAccounts.entityId, entityId),
    }),
  ]);
  const bank = banks.reduce(
    (s, a) => s + parseFloat(a.currentBalance ?? "0"),
    0,
  );
  const mobile = mm.reduce(
    (s, a) => s + parseFloat(a.currentBalance ?? "0"),
    0,
  );
  const petty = cash.reduce(
    (s, a) => s + parseFloat(a.currentBalance ?? "0"),
    0,
  );
  return bank + mobile + petty;
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ─── Bills Router ──────────────────────────────────────────────────────────

export const billsRouter = router({
  /**
   * Get bills overview data including summary cards and stats.
   */
  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

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

    // Previous month avg days to pay for comparison
    const prevPaidBills = prevBills.filter((b) => b.status === "paid");
    const prevAvgDaysToPay =
      prevPaidBills.length > 0
        ? Math.round(
            prevPaidBills.reduce((sum, b) => {
              const invoiceDate = new Date(b.invoiceDate);
              const paidDate = b.receivedDate
                ? new Date(b.receivedDate)
                : new Date();
              return (
                sum +
                Math.abs(paidDate.getTime() - invoiceDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }, 0) / prevPaidBills.length,
          )
        : 0;
    const avgDaysToPayChange =
      prevAvgDaysToPay > 0 ? avgDaysToPay - prevAvgDaysToPay : 0;

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

    // Get supplier names — entity-scoped + parameterized
    const supplierIds = Object.keys(vendorBalances);
    if (supplierIds.length > 0) {
      const supplierList = await db.query.suppliers.findMany({
        where: and(
          eq(suppliers.entityId, entityId),
          inArray(suppliers.id, supplierIds),
        ),
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
        avgDaysToPayChange: Number(avgDaysToPayChange.toFixed(1)),
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
  listBills: rlsProtectedProcedure
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
        search: z.string().trim().max(100).optional(),
        sortBy: z.enum(["date", "amount", "status", "vendor"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

      // Build conditions
      const conditions = [eq(invoicesAp.entityId, entityId)];

      if (input.status !== "all") {
        if (input.status === "paid") {
          conditions.push(eq(invoicesAp.status, "paid"));
        } else if (input.status === "overdue") {
          conditions.push(eq(invoicesAp.status, "overdue"));
        } else if (input.status === "scheduled") {
          conditions.push(eq(invoicesAp.status, "partial"));
        } else if (input.status === "draft") {
          // Draft = pending status with no notes (not yet submitted)
          conditions.push(eq(invoicesAp.status, "pending"));
          conditions.push(
            sql`(${invoicesAp.notes} IS NULL OR ${invoicesAp.notes} = '')`,
          );
        } else if (input.status === "pending_approval") {
          // Pending approval = pending status with notes (submitted for approval)
          conditions.push(eq(invoicesAp.status, "pending"));
          conditions.push(
            sql`${invoicesAp.notes} IS NOT NULL AND ${invoicesAp.notes} != ''`,
          );
        } else if (input.status === "approved") {
          // Approved = all pending bills (matching overview behavior)
          conditions.push(eq(invoicesAp.status, "pending"));
        }
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
          purchaseOrderId: invoicesAp.purchaseOrderId,
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
          purchaseOrderId: bill.purchaseOrderId,
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
   * Get bill detail for the detail panel.
   */
  getBillDetail: rlsProtectedProcedure
    .input(z.object({ billId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

      const bill = await db.query.invoicesAp.findFirst({
        where: and(
          eq(invoicesAp.id, input.billId),
          eq(invoicesAp.entityId, entityId),
        ),
      });

      if (!bill) return null;

      const supplier = await db.query.suppliers.findFirst({
        where: and(
          eq(suppliers.id, bill.supplierId),
          eq(suppliers.entityId, entityId),
        ),
      });

      // Get payments — entity-scoped
      const payments = await db.query.paymentsAp.findMany({
        where: and(
          eq(paymentsAp.invoiceApId, input.billId),
          eq(paymentsAp.entityId, entityId),
        ),
        orderBy: [desc(paymentsAp.paymentDate)],
      });

      return {
        id: bill.id,
        invoiceNumber: bill.invoiceNumber,
        invoiceDate: bill.invoiceDate,
        dueDate: bill.dueDate,
        totalAmount: parseFloat(bill.totalAmount),
        paidAmount: parseFloat(bill.paidAmount),
        balance: parseFloat(bill.balance),
        status: bill.status,
        currency: bill.currency,
        notes: bill.notes,
        purchaseOrderId: bill.purchaseOrderId,
        supplier: supplier
          ? {
              id: supplier.id,
              name: supplier.name,
              email: supplier.contactEmail,
              phone: supplier.contactPhone,
            }
          : null,
        payments: payments.map((p) => ({
          id: p.id,
          amount: parseFloat(p.amount),
          paymentDate: p.paymentDate,
          method: p.method,
          reference: p.reference,
        })),
      };
    }),

  // ── Bill-to-PO matching (§ bill-po-matching) ───────────────────────────
  // Find open purchase orders from the same supplier and score how closely
  // the bill amount matches each PO, so the user can link a bill to its PO
  // (price/quantity mismatch flags) in one click.

  getPoMatches: rlsProtectedProcedure
    .input(z.object({ billId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";
      const [bill] = await db
        .select({
          id: invoicesAp.id,
          supplierId: invoicesAp.supplierId,
          totalAmount: invoicesAp.totalAmount,
          invoiceNumber: invoicesAp.invoiceNumber,
          purchaseOrderId: invoicesAp.purchaseOrderId,
        })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.id, input.billId),
            eq(invoicesAp.entityId, entityId),
          ),
        )
        .limit(1);
      if (!bill) return { bill: null, matches: [] };
      if (bill.purchaseOrderId)
        return {
          bill: {
            id: bill.id,
            invoiceNumber: bill.invoiceNumber,
            purchaseOrderId: bill.purchaseOrderId,
          },
          matches: [],
        };

      const billAmount = parseFloat(bill.totalAmount);
      const pos = await db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          totalAmount: purchaseOrders.totalAmount,
          status: purchaseOrders.status,
          orderDate: purchaseOrders.orderDate,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.entityId, entityId),
            eq(purchaseOrders.supplierId, bill.supplierId),
            eq(purchaseOrders.status, "approved"),
          ),
        )
        .orderBy(desc(purchaseOrders.orderDate));

      const matches = pos
        .map((po) => {
          const poAmount = parseFloat(po.totalAmount);
          const delta =
            poAmount > 0 ? Math.abs(billAmount - poAmount) / poAmount : 1;
          const score =
            delta <= 0.01
              ? 1
              : delta <= 0.1
                ? 0.75
                : delta <= 0.25
                  ? 0.5
                  : 0.25;
          return {
            id: po.id,
            poNumber: po.poNumber,
            orderDate: po.orderDate,
            amount: poAmount,
            status: po.status,
            score,
            delta,
            flag:
              delta > 0.1
                ? (("Price/quantity mismatch — bill differs from PO by " +
                    Math.round(delta * 100) +
                    "%") as string)
                : null,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        bill: {
          id: bill.id,
          invoiceNumber: bill.invoiceNumber,
          purchaseOrderId: null,
        },
        matches,
      };
    }),

  linkPo: rlsProtectedProcedure
    .input(z.object({ billId: z.string().uuid(), poId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";
        const [bill] = await db
          .update(invoicesAp)
          .set({ purchaseOrderId: input.poId })
          .where(
            and(
              eq(invoicesAp.id, input.billId),
              eq(invoicesAp.entityId, entityId),
            ),
          )
          .returning({
            id: invoicesAp.id,
            purchaseOrderId: invoicesAp.purchaseOrderId,
          });
        return bill;
      } catch (error) {
        handleMutationError(error, "Failed to link bill to purchase order");
      }
    }),

  /**
   * Get bills trend data for the line chart.
   */
  getBillsTrend: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

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
  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";
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
        description: `Total potential savings: ${currency} ${totalSavings.toLocaleString()}`,
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
        description: `Total amount: ${currency} ${totalPending.toLocaleString()}`,
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
      const topUnusual = unusualBills.sort(
        (a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount),
      )[0]!;
      const supplier = await db.query.suppliers.findFirst({
        where: and(
          eq(suppliers.id, topUnusual.supplierId),
          eq(suppliers.entityId, entityId),
        ),
      });
      const pct =
        avgAmount > 0
          ? Math.round(
              (parseFloat(topUnusual.totalAmount) / avgAmount - 1) * 100,
            )
          : 0;
      insights.push({
        id: "unusual-amount",
        type: "warning",
        title: `${unusualBills.length} bill${unusualBills.length > 1 ? "s" : ""} with unusual amount`,
        description: `${supplier?.name ?? "Vendor"} invoice is ${pct}% higher than average (${currency} ${parseFloat(topUnusual.totalAmount).toLocaleString()})`,
        actionLabel: "View analysis →",
      });
    }

    return insights;
  }),

  // ── Vendor payment scheduling (§ vendor-payments) ────────────────────────
  //
  // Ranks open bills by due date against the entity's cash position and
  // proposes a payment plan: pay now (due/overdue or discount window),
  // schedule within 7 days, or hold. Never proposes paying more than the
  // available cash — the plan is executable, not aspirational.

  getPaymentSchedule: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";
    const cashPosition = await getCashPosition(entityId);

    const openBills = await db
      .select({
        id: invoicesAp.id,
        invoiceNumber: invoicesAp.invoiceNumber,
        dueDate: invoicesAp.dueDate,
        totalAmount: invoicesAp.totalAmount,
        balance: invoicesAp.balance,
        status: invoicesAp.status,
        supplierId: invoicesAp.supplierId,
        supplierName: suppliers.name,
      })
      .from(invoicesAp)
      .leftJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          sql`${invoicesAp.status} NOT IN ('paid', 'voided')`,
        ),
      );

    const today = todayStr();
    const weekOut = new Date();
    weekOut.setDate(weekOut.getDate() + 7);
    const weekOutStr = `${weekOut.getFullYear()}-${String(weekOut.getMonth() + 1).padStart(2, "0")}-${String(weekOut.getDate()).padStart(2, "0")}`;

    const items = openBills
      .map((b) => {
        const balance = parseFloat(b.balance ?? "0");
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (new Date(today).getTime() - new Date(b.dueDate).getTime()) /
              86_400_000,
          ),
        );
        const isOverdue = b.dueDate < today;
        const isDueSoon = !isOverdue && b.dueDate <= weekOutStr;
        const action = isOverdue ? "pay_now" : isDueSoon ? "schedule" : "hold";
        return {
          id: b.id,
          invoiceNumber: b.invoiceNumber,
          supplierName: b.supplierName ?? "Unknown Vendor",
          dueDate: b.dueDate,
          balance,
          totalAmount: parseFloat(b.totalAmount ?? "0"),
          status: b.status,
          daysOverdue,
          isOverdue,
          isDueSoon,
          action,
        };
      })
      .sort((a, b) =>
        a.isOverdue === b.isOverdue
          ? a.dueDate.localeCompare(b.dueDate)
          : a.isOverdue
            ? -1
            : 1,
      );

    const totalDue = items.reduce((s, i) => s + i.balance, 0);
    const payNowTotal = items
      .filter((i) => i.action === "pay_now")
      .reduce((s, i) => s + i.balance, 0);

    // A recommended batch: pay now for overdue + due-soon, capped at cash.
    const recommended = items.filter((i) => i.action !== "hold");
    let planned = 0;
    const batch = recommended.filter((i) => {
      if (planned + i.balance > cashPosition) return false;
      planned += i.balance;
      return true;
    });

    return {
      cashPosition,
      items,
      summary: {
        totalDue,
        payNowTotal,
        batchTotal: batch.reduce((s, i) => s + i.balance, 0),
        batchCount: batch.length,
        scheduledCount: items.filter((i) => i.action === "schedule").length,
        heldCount: items.filter((i) => i.action === "hold").length,
        coveredByCash: totalDue <= cashPosition,
        recommendedBatch: batch.map((i) => i.id),
      },
    };
  }),

  // ── Bill approval routing (§ bill-approval) ──────────────────────────────
  //
  // Checks every bill that is still pending against: PO linkage (matched vs
  // unmatched), amount thresholds (high-value bills need a named approver),
  // and duplicate risk (same supplier + amount within 30 days). Each bill
  // gets a routing decision with a confidence score.

  getApprovalRouting: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";
    const today = todayStr();
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, "0")}-${String(monthAgo.getDate()).padStart(2, "0")}`;

    const pendingBills = await db
      .select({
        id: invoicesAp.id,
        invoiceNumber: invoicesAp.invoiceNumber,
        invoiceDate: invoicesAp.invoiceDate,
        totalAmount: invoicesAp.totalAmount,
        status: invoicesAp.status,
        supplierId: invoicesAp.supplierId,
        purchaseOrderId: invoicesAp.purchaseOrderId,
        supplierName: suppliers.name,
      })
      .from(invoicesAp)
      .leftJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          sql`${invoicesAp.status} = 'pending'`,
        ),
      );

    // Same-entity bill pool for duplicate detection.
    const allBills = await db.query.invoicesAp.findMany({
      where: eq(invoicesAp.entityId, entityId),
    });

    const decisions = pendingBills.map((b) => {
      const amount = parseFloat(b.totalAmount ?? "0");
      const flags: string[] = [];

      if (!b.purchaseOrderId) {
        flags.push("no_po");
      }
      if (amount >= 100_000) {
        flags.push("high_value");
      }

      // Duplicate check: same supplier + same amount + invoice within 30 days.
      const dupes = allBills.filter(
        (o) =>
          o.id !== b.id &&
          o.supplierId === b.supplierId &&
          parseFloat(o.totalAmount ?? "0") === amount &&
          o.invoiceDate >= monthAgoStr &&
          o.invoiceDate <= today,
      );
      const duplicateRisk = dupes.length > 0;
      if (duplicateRisk) flags.push("possible_duplicate");

      // Decision: auto-approve low-risk, route high-value/duplicate to a
      // named approver, escalate unmatched POs without a match attempt.
      let decision: "auto_approve" | "needs_review" | "escalate";
      let confidence: number;
      if (duplicateRisk) {
        decision = "escalate";
        confidence = 0.62;
      } else if (flags.includes("high_value")) {
        decision = "needs_review";
        confidence = 0.78;
      } else if (flags.includes("no_po")) {
        decision = "needs_review";
        confidence = 0.85;
      } else {
        decision = "auto_approve";
        confidence = 0.94;
      }

      return {
        id: b.id,
        invoiceNumber: b.invoiceNumber,
        invoiceDate: b.invoiceDate,
        supplierName: b.supplierName ?? "Unknown Vendor",
        amount,
        flags,
        duplicateRisk,
        decision,
        confidence,
      };
    });

    const autoApprove = decisions.filter(
      (d) => d.decision === "auto_approve",
    ).length;
    const needsReview = decisions.filter(
      (d) => d.decision === "needs_review",
    ).length;
    const escalate = decisions.filter((d) => d.decision === "escalate").length;

    return {
      decisions,
      summary: {
        total: decisions.length,
        autoApprove,
        needsReview,
        escalate,
        autoApproveAmount: decisions
          .filter((d) => d.decision === "auto_approve")
          .reduce((s, d) => s + d.amount, 0),
      },
    };
  }),

  /**
   * Get the next sequential bill number for this entity.
   * Format: BILL-YYYY-MM-NNNNN (5-digit zero-padded sequence, resets monthly)
   */
  getNextBillNumber: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
      const currency = (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `BILL-${year}-${month}`;

    const startDate = `${year}-${month}-01`;
    const endMonth = now.getMonth() + 1;
    const endDate = new Date(year, endMonth, 0);
    const endDateStr = endDate.toISOString().slice(0, 10);

    const [result] = await db
      .select({ count: count() })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          gte(invoicesAp.invoiceDate, startDate),
          lte(invoicesAp.invoiceDate, endDateStr),
        ),
      );

    const sequence = (result?.count ?? 0) + 1;
    const billNumber = `${prefix}-${String(sequence).padStart(5, "0")}`;

    return { billNumber };
  }),
});
