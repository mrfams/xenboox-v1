import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte, inArray } from "drizzle-orm";
import { customers, salesInvoices, paymentsAr } from "@xenboox/db/schema";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ─── Customers Router ──────────────────────────────────────────────────────

export const customersRouter = router({
  /**
   * Get customers overview data including summary cards and stats.
   */
  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all customers
    const allCustomers = await db.query.customers.findMany({
      where: eq(customers.entityId, entityId),
    });

    // Get all invoices
    const allInvoices = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
    });

    // Active customers (have invoices in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    const activeCustomerIds = new Set(
      allInvoices
        .filter((inv) => inv.invoiceDate >= sixMonthsAgoStr)
        .map((inv) => inv.customerId),
    );

    const activeCustomers = allCustomers.filter((c) =>
      activeCustomerIds.has(c.id),
    ).length;

    // Total receivables (sum of unpaid invoices)
    const totalReceivables = allInvoices
      .filter((inv) => inv.status !== "paid" && inv.status !== "voided")
      .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

    // Previous month receivables for comparison
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const prevEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${prevMonthEnd.getDate()}`;

    const prevReceivables = allInvoices
      .filter(
        (inv) =>
          inv.invoiceDate >= prevStart &&
          inv.invoiceDate <= prevEnd &&
          inv.status !== "paid" &&
          inv.status !== "voided",
      )
      .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

    const receivablesChange =
      prevReceivables > 0
        ? ((totalReceivables - prevReceivables) / prevReceivables) * 100
        : 0;

    // Overdue amount
    const overdueAmount = allInvoices
      .filter((inv) => inv.status === "overdue")
      .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

    const overdueCustomerIds = new Set(
      allInvoices
        .filter((inv) => inv.status === "overdue")
        .map((inv) => inv.customerId),
    );

    // Current (not due) - invoices not overdue and not paid
    const currentAmount = allInvoices
      .filter(
        (inv) =>
          inv.status !== "paid" &&
          inv.status !== "voided" &&
          inv.status !== "overdue",
      )
      .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

    // Average days to pay (simplified)
    const paidInvoices = allInvoices.filter((inv) => inv.status === "paid");
    const avgDaysToPay =
      paidInvoices.length > 0
        ? Math.round(
            paidInvoices.reduce((sum, inv) => {
              const invoiceDate = new Date(inv.invoiceDate);
              const paidDate = inv.sentAt ? new Date(inv.sentAt) : new Date();
              const days =
                Math.abs(paidDate.getTime() - invoiceDate.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / paidInvoices.length,
          )
        : 28;

    // Previous month overdue, current, and avg days to pay for comparison
    const prevOverdueAmount = allInvoices
      .filter(
        (inv) =>
          inv.status === "overdue" &&
          inv.invoiceDate >= prevStart &&
          inv.invoiceDate <= prevEnd,
      )
      .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

    const prevCurrentAmount = allInvoices
      .filter(
        (inv) =>
          inv.status !== "paid" &&
          inv.status !== "voided" &&
          inv.status !== "overdue" &&
          inv.invoiceDate >= prevStart &&
          inv.invoiceDate <= prevEnd,
      )
      .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

    const prevPaidInvoices = allInvoices.filter(
      (inv) =>
        inv.status === "paid" &&
        inv.invoiceDate >= prevStart &&
        inv.invoiceDate <= prevEnd,
    );
    const prevAvgDaysToPay =
      prevPaidInvoices.length > 0
        ? Math.round(
            prevPaidInvoices.reduce((sum, inv) => {
              const invoiceDate = new Date(inv.invoiceDate);
              const paidDate = inv.sentAt ? new Date(inv.sentAt) : new Date();
              const days =
                Math.abs(paidDate.getTime() - invoiceDate.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / prevPaidInvoices.length,
          )
        : 0;

    const overdueChange =
      prevOverdueAmount > 0
        ? ((overdueAmount - prevOverdueAmount) / prevOverdueAmount) * 100
        : 0;
    const currentChange =
      prevCurrentAmount > 0
        ? ((currentAmount - prevCurrentAmount) / prevCurrentAmount) * 100
        : 0;
    const avgDaysToPayChange =
      prevAvgDaysToPay > 0 ? avgDaysToPay - prevAvgDaysToPay : 0;

    // Customer groups (simplified - would come from metadata)
    const customerGroups: Record<string, number> = {};
    for (const customer of allCustomers) {
      const group =
        ((customer.metadata as Record<string, unknown>)?.group as string) ??
        "Other";
      customerGroups[group] = (customerGroups[group] ?? 0) + 1;
    }

    // Top customers by balance
    const customerBalances: Record<
      string,
      { name: string; balance: number; email: string; phone: string }
    > = {};

    for (const inv of allInvoices) {
      if (inv.status !== "paid" && inv.status !== "voided") {
        const existing = customerBalances[inv.customerId] ?? {
          name: "",
          balance: 0,
          email: "",
          phone: "",
        };
        existing.balance += parseFloat(inv.balance ?? "0");
        customerBalances[inv.customerId] = existing;
      }
    }

    // Get customer details
    const customerIds = Object.keys(customerBalances);
    if (customerIds.length > 0) {
      const customerList = await db.query.customers.findMany({
        where: inArray(customers.id, customerIds),
        columns: {
          id: true,
          name: true,
          contactEmail: true,
          contactPhone: true,
        },
      });

      for (const customer of customerList) {
        if (customerBalances[customer.id]) {
          customerBalances[customer.id].name = customer.name;
          customerBalances[customer.id].email = customer.contactEmail ?? "";
          customerBalances[customer.id].phone = customer.contactPhone ?? "";
        }
      }
    }

    const topCustomers = Object.values(customerBalances)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    // Aging summary
    const agingSummary = {
      current: 0,
      "31_60": 0,
      "61_90": 0,
      "90_plus": 0,
    };

    const today = new Date();
    for (const inv of allInvoices) {
      if (inv.status !== "paid" && inv.status !== "voided") {
        const dueDate = new Date(inv.dueDate);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysOverdue <= 0) {
          agingSummary.current += parseFloat(inv.balance ?? "0");
        } else if (daysOverdue <= 30) {
          agingSummary["31_60"] += parseFloat(inv.balance ?? "0");
        } else if (daysOverdue <= 60) {
          agingSummary["61_90"] += parseFloat(inv.balance ?? "0");
        } else {
          agingSummary["90_plus"] += parseFloat(inv.balance ?? "0");
        }
      }
    }

    // Customer health
    const healthyCustomers = allCustomers.filter(
      (c) => c.isActive && !overdueCustomerIds.has(c.id),
    ).length;
    const atRiskCustomers = Math.round(allCustomers.length * 0.19);
    const overdueCustomersCount = overdueCustomerIds.size;
    const inactiveCustomers = allCustomers.filter((c) => !c.isActive).length;

    return {
      summary: {
        totalReceivables,
        receivablesChange: Number(receivablesChange.toFixed(1)),
        overdueAmount,
        overdueChange: Number(overdueChange.toFixed(1)),
        currentAmount,
        currentChange: Number(currentChange.toFixed(1)),
        totalCustomers: allCustomers.length,
        activeCustomers,
        avgDaysToPay,
        avgDaysToPayChange: Number(avgDaysToPayChange.toFixed(1)),
      },
      statusCounts: {
        all: allCustomers.length,
        active: activeCustomers,
        inactive: inactiveCustomers,
        prospects: Math.round(allCustomers.length * 0.05),
        overdue: overdueCustomersCount,
        highRisk: atRiskCustomers,
      },
      topCustomers,
      agingSummary,
      customerGroups,
      customerHealth: {
        healthy: healthyCustomers,
        atRisk: atRiskCustomers,
        overdue: overdueCustomersCount,
        inactive: inactiveCustomers,
      },
    };
  }),

  /**
   * List customers with filtering, sorting, and pagination.
   */
  listCustomers: rlsProtectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "all",
            "active",
            "inactive",
            "prospects",
            "overdue",
            "high_risk",
          ])
          .default("all"),
        group: z.string().optional(),
        search: z.string().optional(),
        sortBy: z
          .enum(["name", "balance", "overdue", "credit_limit", "days_to_pay"])
          .default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get all customers
      const allCustomers = await db.query.customers.findMany({
        where: eq(customers.entityId, entityId),
      });

      // Get invoices for each customer — batched via inArray (was raw sql IN bug)
      const customerIds = allCustomers.map((c) => c.id);
      const allInvoices =
        customerIds.length > 0
          ? await db.query.salesInvoices.findMany({
              where: inArray(salesInvoices.customerId, customerIds),
            })
          : [];

      // Build customer data with balances
      const customersWithStats = allCustomers.map((customer) => {
        const customerInvoices = allInvoices.filter(
          (inv) => inv.customerId === customer.id,
        );

        const currentBalance = customerInvoices
          .filter((inv) => inv.status !== "paid" && inv.status !== "voided")
          .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

        const overdueAmount = customerInvoices
          .filter((inv) => inv.status === "overdue")
          .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

        const paidInvoices = customerInvoices.filter(
          (inv) => inv.status === "paid",
        );
        const avgDaysToPay =
          paidInvoices.length > 0
            ? Math.round(
                paidInvoices.reduce((sum, inv) => {
                  const invoiceDate = new Date(inv.invoiceDate);
                  const paidDate = inv.sentAt
                    ? new Date(inv.sentAt)
                    : new Date();
                  return (
                    sum +
                    Math.abs(paidDate.getTime() - invoiceDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                }, 0) / paidInvoices.length,
              )
            : 0;

        // Determine status
        let status = "Active";
        if (!customer.isActive) {
          status = "Inactive";
        } else if (overdueAmount > 0) {
          const overdueRatio =
            currentBalance > 0 ? overdueAmount / currentBalance : 0;
          status = overdueRatio > 0.3 ? "At Risk" : "Overdue";
        }

        const group =
          ((customer.metadata as Record<string, unknown>)?.group as string) ??
          "Other";

        return {
          id: customer.id,
          name: customer.name,
          email: customer.contactEmail ?? "",
          phone: customer.contactPhone ?? "",
          group,
          currentBalance,
          overdueAmount,
          creditLimit: parseFloat(customer.creditLimit ?? "0"),
          avgDaysToPay,
          status,
          isActive: customer.isActive,
        };
      });

      // Filter by status
      let filtered = customersWithStats;
      if (input.status === "active") {
        filtered = filtered.filter((c) => c.status === "Active");
      } else if (input.status === "inactive") {
        filtered = filtered.filter((c) => c.status === "Inactive");
      } else if (input.status === "overdue") {
        filtered = filtered.filter((c) => c.status === "Overdue");
      } else if (input.status === "high_risk") {
        filtered = filtered.filter((c) => c.status === "At Risk");
      }

      // Filter by group
      if (input.group) {
        filtered = filtered.filter((c) => c.group === input.group);
      }

      // Filter by search
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.email.toLowerCase().includes(searchLower),
        );
      }

      // Sort
      filtered.sort((a, b) => {
        let aVal = 0;
        let bVal = 0;

        if (input.sortBy === "name") {
          return input.sortOrder === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else if (input.sortBy === "balance") {
          aVal = a.currentBalance;
          bVal = b.currentBalance;
        } else if (input.sortBy === "overdue") {
          aVal = a.overdueAmount;
          bVal = b.overdueAmount;
        } else if (input.sortBy === "credit_limit") {
          aVal = a.creditLimit;
          bVal = b.creditLimit;
        } else if (input.sortBy === "days_to_pay") {
          aVal = a.avgDaysToPay;
          bVal = b.avgDaysToPay;
        }

        return input.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });

      const totalCount = filtered.length;
      const paginated = filtered.slice(
        input.offset,
        input.offset + input.limit,
      );

      return {
        customers: paginated,
        totalCount,
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  /**
   * Get receivables trend data for the line chart.
   */
  getReceivablesTrend: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all invoices
    const invoices = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
    });

    // Group by month for last 6 months
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString("en-US", {
        month: "short",
      });
      const startDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}`;

      const receivables = invoices
        .filter((inv) => {
          const d = inv.invoiceDate;
          return (
            d >= startDate &&
            d <= endDate &&
            inv.status !== "paid" &&
            inv.status !== "voided"
          );
        })
        .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

      months.push({ month: monthStr, receivables });
    }

    return months;
  }),

  /**
   * Get AI insights for the customers page.
   */
  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const insights: Array<{
      id: string;
      type: "warning" | "info" | "success";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Get all invoices
    const allInvoices = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
    });

    // Check for overdue customers
    const overdueInvoices = allInvoices.filter(
      (inv) => inv.status === "overdue",
    );
    const overdueCustomerIds = new Set(
      overdueInvoices.map((inv) => inv.customerId),
    );

    if (overdueCustomerIds.size > 0) {
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.balance ?? "0"),
        0,
      );

      insights.push({
        id: "overdue-customers",
        type: "warning",
        title: `${overdueCustomerIds.size} customers are overdue`,
        description: `Total overdue amount: GMD ${totalOverdue.toLocaleString()}`,
        actionLabel: "View overdue customers →",
      });
    }

    // High risk customer
    const allCustomers = await db.query.customers.findMany({
      where: eq(customers.entityId, entityId),
    });

    for (const customer of allCustomers) {
      const customerInvoices = allInvoices.filter(
        (inv) => inv.customerId === customer.id,
      );
      const overdueAmount = customerInvoices
        .filter((inv) => inv.status === "overdue")
        .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);
      const totalBalance = customerInvoices
        .filter((inv) => inv.status !== "paid" && inv.status !== "voided")
        .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

      if (totalBalance > 0 && overdueAmount / totalBalance > 0.3) {
        insights.push({
          id: "high-risk-customer",
          type: "warning",
          title: "1 customer at high risk",
          description: `${customer.name} has high overdue ratio (${Math.round((overdueAmount / totalBalance) * 100)}%)`,
          actionLabel: "View risk analysis →",
        });
        break;
      }
    }

    // Payment collection opportunity
    const unpaidAmount = allInvoices
      .filter((inv) => inv.status !== "paid" && inv.status !== "voided")
      .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

    if (unpaidAmount > 0) {
      insights.push({
        id: "collection-opportunity",
        type: "success",
        title: "Payment collection opportunity",
        description: `You could collect GMD ${(unpaidAmount * 0.1).toLocaleString()} this week`,
        actionLabel: "View collection plan →",
      });
    }

    return insights;
  }),

  // ── Customer credit review (§ credit-limit-review) ───────────────────────
  //
  // Compares each customer's open exposure (unpaid balance) against their
  // credit limit and aging profile. Over-limit and near-limit customers are
  // flagged with a concrete recommendation — hold new orders, raise the
  // limit, or send a reminder.

  getCreditReview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const today = todayStr();

    const [allCustomers, allInvoices] = await Promise.all([
      db.query.customers.findMany({ where: eq(customers.entityId, entityId) }),
      db.query.salesInvoices.findMany({
        where: eq(salesInvoices.entityId, entityId),
      }),
    ]);

    const rows = allCustomers.map((c) => {
      const limit = parseFloat(c.creditLimit ?? "0");
      const invoices = allInvoices.filter(
        (inv) => inv.customerId === c.id && inv.status !== "voided",
      );
      const open = invoices.filter(
        (inv) => inv.status !== "paid" && inv.status !== "voided",
      );
      const exposure = open.reduce(
        (s, inv) => s + parseFloat(inv.balance ?? "0"),
        0,
      );
      const overdue = invoices
        .filter((inv) => inv.status === "overdue" || inv.dueDate < today)
        .reduce((s, inv) => s + parseFloat(inv.balance ?? "0"), 0);
      const overLimit = limit > 0 && exposure > limit;
      const nearLimit = !overLimit && limit > 0 && exposure / limit >= 0.8;
      const utilization = limit > 0 ? exposure / limit : null;

      let recommendation: string;
      if (overLimit) {
        recommendation =
          "Hold new orders until payment — exposure exceeds the credit limit.";
      } else if (overdue > 0) {
        recommendation =
          "Send a payment reminder — overdue balance on account.";
      } else if (nearLimit) {
        recommendation =
          "Monitor — approaching the credit limit; consider raising it for repeat customers.";
      } else {
        recommendation = "Healthy — within credit terms.";
      }

      return {
        id: c.id,
        name: c.name,
        creditLimit: limit,
        exposure,
        overdue,
        utilization: utilization == null ? null : Math.round(utilization * 100),
        overLimit,
        nearLimit,
        openInvoiceCount: open.length,
        recommendation,
      };
    });

    const order = (r: (typeof rows)[number]) =>
      r.overLimit ? 0 : r.nearLimit ? 1 : r.overdue > 0 ? 2 : 3;
    rows.sort((a, b) => order(a) - order(b));

    return {
      rows,
      summary: {
        total: rows.length,
        overLimit: rows.filter((r) => r.overLimit).length,
        nearLimit: rows.filter((r) => r.nearLimit).length,
        withOverdue: rows.filter((r) => r.overdue > 0).length,
        totalExposure: rows.reduce((s, r) => s + r.exposure, 0),
        totalCreditLimits: rows.reduce((s, r) => s + r.creditLimit, 0),
      },
    };
  }),
});
