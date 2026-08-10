import { z } from "zod";
import { eq, and, desc, sql, gte, lte, count, sum, asc } from "drizzle-orm";
import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  bankAccounts,
  cashAccounts,
  bankTransactions,
  invoicesAp,
  salesInvoices,
  journalEntries,
  documents,
  conversations,
  chatMessages,
  auditLog,
  agentRoutingLogs,
  complianceDeadlines,
  payrollRuns,
} from "@xenboox/db/schema";
import { logger } from "@/lib/logger";

// ─── Helper ────────────────────────────────────────────────────────────────
function pctChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

const filingTypeLabels: Record<string, string> = {
  vat: "VAT Return Due",
  paye: "PAYE Return Due",
  withholding: "Withholding Tax Due",
  corporate_tax: "Corporate Tax Due",
  social_security: "SSNIT Due",
};

// ─── Safe query helper ─────────────────────────────────────────────────────
// Wraps a DB query in try/catch so a single failing table doesn't crash the
// entire dashboard endpoint. Returns the fallback on error.

async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err, query: label }, `Dashboard query failed: ${label}`);
    return fallback;
  }
}

// ─── Dashboard Router ──────────────────────────────────────────────────────

export const dashboardRouter = router({
  /**
   * Single aggregation endpoint for all dashboard data.
   * Fetches executive briefing, business health, activity feed,
   * pending approvals, active agents, right sidebar data.
   *
   * Each query is individually try/caught so that missing tables or schema
   * mismatches on production don't crash the entire dashboard.
   */
  getDashboardData: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();

    // ── Business Health Metrics ──────────────────────────────────────────

    // Cash balance from bank accounts
    const bankAccountsData = await safeQuery(
      "bankAccounts",
      () =>
        db.query.bankAccounts.findMany({
          where: eq(bankAccounts.entityId, entityId),
          columns: { currentBalance: true },
        }),
      [],
    );
    const cashBalance = bankAccountsData.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
      0,
    );

    // Cash accounts balance
    const cashAccountsData = await safeQuery(
      "cashAccounts",
      () =>
        db.query.cashAccounts.findMany({
          where: eq(cashAccounts.entityId, entityId),
          columns: { currentBalance: true },
        }),
      [],
    );
    const pettyCashBalance = cashAccountsData.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
      0,
    );
    const totalCashBalance = cashBalance + pettyCashBalance;

    // A/R outstanding — sum of unpaid sales invoices.
    // NOTE: ar_status enum only contains pending/partial/paid/overdue/voided.
    // "draft" = pending without sentAt, "sent" = pending with sentAt,
    // "viewed" = partial — so unpaid invoices are pending/partial/overdue.
    const arResult = await safeQuery(
      "arOutstanding",
      () =>
        db
          .select({ total: sum(salesInvoices.totalAmount) })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.entityId, entityId),
              sql`${salesInvoices.status} IN ('pending', 'partial', 'overdue')`,
            ),
          ),
      [{ total: null }],
    );
    const arOutstanding = parseFloat(arResult[0]?.total ?? "0");

    // A/P outstanding — sum of unpaid AP invoices
    const apResult = await safeQuery(
      "apOutstanding",
      () =>
        db
          .select({ total: sum(invoicesAp.totalAmount) })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              sql`${invoicesAp.status} IN ('pending', 'partial', 'overdue')`,
            ),
          ),
      [{ total: null }],
    );
    const apOutstanding = parseFloat(apResult[0]?.total ?? "0");

    // Revenue — sum of paid/overdue sales invoices (this month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevStartOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEndOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const revenueResult = await safeQuery(
      "revenue",
      () =>
        db
          .select({ total: sum(salesInvoices.totalAmount) })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.entityId, entityId),
              gte(
                salesInvoices.invoiceDate,
                startOfMonth.toISOString().split("T")[0],
              ),
              lte(
                salesInvoices.invoiceDate,
                endOfMonth.toISOString().split("T")[0],
              ),
            ),
          ),
      [{ total: null }],
    );
    const currentRevenue = parseFloat(revenueResult[0]?.total ?? "0");

    const prevRevenueResult = await safeQuery(
      "prevRevenue",
      () =>
        db
          .select({ total: sum(salesInvoices.totalAmount) })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.entityId, entityId),
              gte(
                salesInvoices.invoiceDate,
                prevStartOfMonth.toISOString().split("T")[0],
              ),
              lte(
                salesInvoices.invoiceDate,
                prevEndOfMonth.toISOString().split("T")[0],
              ),
            ),
          ),
      [{ total: null }],
    );
    const prevRevenue = parseFloat(prevRevenueResult[0]?.total ?? "0");

    // Expenses — sum of AP invoices this month
    const expensesResult = await safeQuery(
      "expenses",
      () =>
        db
          .select({ total: sum(invoicesAp.totalAmount) })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              gte(
                invoicesAp.invoiceDate,
                startOfMonth.toISOString().split("T")[0],
              ),
              lte(
                invoicesAp.invoiceDate,
                endOfMonth.toISOString().split("T")[0],
              ),
            ),
          ),
      [{ total: null }],
    );
    const currentExpenses = parseFloat(expensesResult[0]?.total ?? "0");

    const prevExpensesResult = await safeQuery(
      "prevExpenses",
      () =>
        db
          .select({ total: sum(invoicesAp.totalAmount) })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              gte(
                invoicesAp.invoiceDate,
                prevStartOfMonth.toISOString().split("T")[0],
              ),
              lte(
                invoicesAp.invoiceDate,
                prevEndOfMonth.toISOString().split("T")[0],
              ),
            ),
          ),
      [{ total: null }],
    );
    const prevExpenses = parseFloat(prevExpensesResult[0]?.total ?? "0");

    const currentProfit = currentRevenue - currentExpenses;
    const prevProfit = prevRevenue - prevExpenses;

    // Calculate percentage changes
    const revenueChange =
      prevRevenue > 0
        ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
        : 0;
    const expensesChange =
      prevExpenses > 0
        ? ((currentExpenses - prevExpenses) / prevExpenses) * 100
        : 0;
    const profitChange =
      prevProfit > 0 ? ((currentProfit - prevProfit) / prevProfit) * 100 : 0;
    const arChange = 0;
    const apChange = 0;

    // ── Sparkline Data (Last 6 months) ────────────────────────────────────
    const getMonthlyData = async (monthsBack: number) => {
      const results: number[] = [];
      for (let i = monthsBack; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const revenueRes = await safeQuery(
          `revenue-month-${i}`,
          () =>
            db
              .select({ total: sum(salesInvoices.totalAmount) })
              .from(salesInvoices)
              .where(
                and(
                  eq(salesInvoices.entityId, entityId),
                  gte(
                    salesInvoices.invoiceDate,
                    monthStart.toISOString().split("T")[0],
                  ),
                  lte(
                    salesInvoices.invoiceDate,
                    monthEnd.toISOString().split("T")[0],
                  ),
                ),
              ),
          [{ total: null }],
        );
        results.push(parseFloat(revenueRes[0]?.total ?? "0"));
      }
      return results;
    };

    const monthlyRevenues = await safeQuery(
      "monthlyRevenues",
      () => getMonthlyData(6),
      [0, 0, 0, 0, 0, 0, 0],
    );

    const getMonthlyExpenses = async (monthsBack: number) => {
      const results: number[] = [];
      for (let i = monthsBack; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const expensesRes = await safeQuery(
          `expenses-month-${i}`,
          () =>
            db
              .select({ total: sum(invoicesAp.totalAmount) })
              .from(invoicesAp)
              .where(
                and(
                  eq(invoicesAp.entityId, entityId),
                  gte(
                    invoicesAp.invoiceDate,
                    monthStart.toISOString().split("T")[0],
                  ),
                  lte(
                    invoicesAp.invoiceDate,
                    monthEnd.toISOString().split("T")[0],
                  ),
                ),
              ),
          [{ total: null }],
        );
        results.push(parseFloat(expensesRes[0]?.total ?? "0"));
      }
      return results;
    };

    const monthlyExpenses = await safeQuery(
      "monthlyExpenses",
      () => getMonthlyExpenses(6),
      [0, 0, 0, 0, 0, 0, 0],
    );
    const monthlyProfits = monthlyRevenues.map(
      (r, i) => r - (monthlyExpenses[i] || 0),
    );

    // ── Cash Balance Sparkline (real data from bank transactions) ──────
    const getMonthlyNetCashFlow = async (monthsBack: number) => {
      const results: number[] = [];
      for (let i = monthsBack; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const flowRes = await safeQuery(
          `cashflow-month-${i}`,
          () =>
            db
              .select({ total: sum(bankTransactions.amount) })
              .from(bankTransactions)
              .where(
                and(
                  eq(bankTransactions.entityId, entityId),
                  gte(
                    bankTransactions.transactionDate,
                    monthStart.toISOString().split("T")[0],
                  ),
                  lte(
                    bankTransactions.transactionDate,
                    monthEnd.toISOString().split("T")[0],
                  ),
                ),
              ),
          [{ total: null }],
        );
        results.push(parseFloat(flowRes[0]?.total ?? "0"));
      }
      return results;
    };

    const monthlyCashFlows = await safeQuery(
      "monthlyCashFlows",
      () => getMonthlyNetCashFlow(6),
      [0, 0, 0, 0, 0, 0, 0],
    );

    // Build sparkline backwards from current balance
    const cashSparkline: number[] = [];
    let runningBalance = totalCashBalance;
    for (let i = monthlyCashFlows.length - 1; i >= 0; i--) {
      cashSparkline.unshift(runningBalance);
      runningBalance -= monthlyCashFlows[i];
    }

    // Cash change = this month vs last month balance
    const prevCashBalance = runningBalance;
    const cashChange = Number(
      pctChange(totalCashBalance, prevCashBalance).toFixed(1),
    );

    // A/R sparkline — REAL open balances: outstanding customer invoices
    // (pending/partial/overdue) grouped by invoice month, across the last six
    // months (NOT just the current month, which would zero out 5 of 6 points).
    const sparklineStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const arMonthlyResult = await safeQuery(
      "arMonthlyBalances",
      () =>
        db
          .select({
            month: sql<string>`substr(${salesInvoices.invoiceDate}, 1, 7)`,
            openBalance: sql<string>`sum(${salesInvoices.balance})`,
          })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.entityId, entityId),
              sql`${salesInvoices.status} IN ('pending', 'partial', 'overdue')`,
              gte(
                salesInvoices.invoiceDate,
                sparklineStart.toISOString().split("T")[0],
              ),
            ),
          )
          .groupBy(sql`substr(${salesInvoices.invoiceDate}, 1, 7)`),
      [],
    );
    const arByMonth = new Map(
      arMonthlyResult.map((r) => [r.month, parseFloat(r.openBalance ?? "0")]),
    );
    const monthKeyFor = (i: number): string => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const arSparkline = monthlyRevenues.map((_, i) => {
      return arByMonth.get(monthKeyFor(i)) ?? 0;
    });
    arSparkline[arSparkline.length - 1] = arOutstanding;

    // A/P sparkline — REAL open balances: outstanding vendor bills
    // (pending/partial/overdue) grouped by invoice month, last six months.
    const apMonthlyResult = await safeQuery(
      "apMonthlyBalances",
      () =>
        db
          .select({
            month: sql<string>`substr(${invoicesAp.invoiceDate}, 1, 7)`,
            openBalance: sql<string>`sum(${invoicesAp.balance})`,
          })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              sql`${invoicesAp.status} IN ('pending', 'partial', 'overdue')`,
              gte(
                invoicesAp.invoiceDate,
                sparklineStart.toISOString().split("T")[0],
              ),
            ),
          )
          .groupBy(sql`substr(${invoicesAp.invoiceDate}, 1, 7)`),
      [],
    );
    const apByMonth = new Map(
      apMonthlyResult.map((r) => [r.month, parseFloat(r.openBalance ?? "0")]),
    );
    const apSparkline = monthlyExpenses.map((_, i) => {
      return apByMonth.get(monthKeyFor(i)) ?? 0;
    });
    apSparkline[apSparkline.length - 1] = apOutstanding;

    // ── Executive Briefing Items ─────────────────────────────────────────

    const briefingItems: Array<{
      id: string;
      type: "positive" | "warning" | "negative" | "neutral";
      title: string;
      value: string;
      detail: string;
      statusLabel: string;
      href: string;
    }> = [];

    // Core metrics — always shown so the briefing is never a single lonely
    // card. Each card links to the module page that owns that metric.
    briefingItems.push({
      id: "revenue",
      type: currentRevenue > 0 && revenueChange >= 0 ? "positive" : "neutral",
      title:
        currentRevenue > 0
          ? `Revenue ${revenueChange >= 0 ? "up" : "down"} ${Math.abs(revenueChange).toFixed(0)}%`
          : "No revenue this month",
      value: `${currentRevenue.toLocaleString()}`,
      detail: "vs last month",
      statusLabel:
        currentRevenue > 0
          ? revenueChange >= 0
            ? "Strong performance"
            : "Declining"
          : "—",
      href: "/dashboard/invoicing",
    });

    briefingItems.push({
      id: "expenses",
      type: currentExpenses > 0 && expensesChange <= 0 ? "positive" : "neutral",
      title:
        currentExpenses > 0
          ? `Expenses ${expensesChange <= 0 ? "down" : "up"} ${Math.abs(expensesChange).toFixed(0)}%`
          : "No expenses this month",
      value: `${currentExpenses.toLocaleString()}`,
      detail: "vs last month",
      statusLabel:
        currentExpenses > 0
          ? expensesChange <= 0
            ? "Under control"
            : "Increasing"
          : "—",
      href: "/dashboard/expenses",
    });

    briefingItems.push({
      id: "profit",
      type: currentProfit >= 0 ? "positive" : "negative",
      title:
        currentProfit >= 0 ? "Profitable this month" : "Operating at a loss",
      value: `${currentProfit.toLocaleString()}`,
      detail: "Revenue minus expenses",
      statusLabel: currentProfit >= 0 ? "Profitable" : "Loss",
      href: "/dashboard/reports",
    });

    briefingItems.push({
      id: "ar",
      type: arOutstanding > 0 ? "warning" : "positive",
      title: arOutstanding > 0 ? "Money owed to you" : "No outstanding A/R",
      value: `${arOutstanding.toLocaleString()}`,
      detail: "Unpaid customer invoices",
      statusLabel: arOutstanding > 0 ? "Collect soon" : "All collected",
      href: "/dashboard/customers",
    });

    briefingItems.push({
      id: "ap",
      type: apOutstanding > 0 ? "warning" : "positive",
      title: apOutstanding > 0 ? "Money you owe" : "No outstanding A/P",
      value: `${apOutstanding.toLocaleString()}`,
      detail: "Unpaid bills to vendors",
      statusLabel: apOutstanding > 0 ? "Pay soon" : "All paid",
      href: "/dashboard/bills",
    });

    briefingItems.push({
      id: "cash",
      type: cashChange >= 0 ? "positive" : "warning",
      title:
        cashChange >= 0 ? "Cash position is healthy" : "Cash balance declined",
      value: `${totalCashBalance.toLocaleString()}`,
      detail: `${cashChange >= 0 ? "+" : ""}${cashChange}% vs last month`,
      statusLabel: `${cashChange >= 0 ? "+" : ""}${cashChange}% vs last month`,
      href: "/dashboard/banking",
    });

    // Overdue invoices
    const overdueApCount = await safeQuery(
      "overdueApCount",
      async () => {
        const result = await db
          .select({ count: count() })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              eq(invoicesAp.status, "overdue"),
            ),
          );
        return result[0]?.count ?? 0;
      },
      0,
    );

    if (overdueApCount > 0) {
      briefingItems.push({
        id: "overdue",
        type: "negative",
        title: `${overdueApCount} invoices overdue`,
        value: "Requires attention",
        detail: "Overdue by 30+ days",
        statusLabel: "Follow up required",
        href: "/dashboard/bills",
      });
    }

    // Pending journal entries
    const pendingJournals = await safeQuery(
      "pendingJournals",
      async () => {
        const result = await db
          .select({ count: count() })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.entityId, entityId),
              eq(journalEntries.status, "draft"),
            ),
          );
        return result[0]?.count ?? 0;
      },
      0,
    );

    if (pendingJournals > 0) {
      briefingItems.push({
        id: "journals",
        type: "neutral",
        title: `${pendingJournals} journal entries pending`,
        value: "Ready for review",
        detail: "Awaiting approval",
        statusLabel: "Ready for review",
        href: "/dashboard/journal",
      });
    }

    // Suspicious transactions — use agent escalations
    const escalations = await safeQuery(
      "escalations",
      async () => {
        const result = await db
          .select({ count: count() })
          .from(agentRoutingLogs)
          .where(
            and(
              eq(agentRoutingLogs.entityId, entityId),
              eq(agentRoutingLogs.decision, "escalated"),
            ),
          );
        return result[0]?.count ?? 0;
      },
      0,
    );

    if (escalations > 0) {
      briefingItems.push({
        id: "escalations",
        type: "warning",
        title: `${escalations} items need review`,
        value: "Flagged by AI",
        detail: "Requires attention",
        statusLabel: "Review now",
        href: "/dashboard/review-queue",
      });
    }

    // ── Pending Approvals ────────────────────────────────────────────────

    const pendingApprovalItems: Array<{
      id: string;
      type: string;
      title: string;
      subtitle: string;
      amount: string;
      status: "pending" | "review";
    }> = [];

    // Pending journal entries
    const draftEntries = await safeQuery(
      "draftEntries",
      () =>
        db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "draft"),
          ),
          orderBy: [desc(journalEntries.createdAt)],
          limit: 5,
        }),
      [],
    );

    for (const entry of draftEntries) {
      pendingApprovalItems.push({
        id: entry.id,
        type: "journal_entry",
        title: `Journal Entry ${entry.entryNumber ?? "#Draft"}`,
        subtitle: entry.description ?? "No description",
        amount: "—",
        status: "pending",
      });
    }

    // Agent escalations
    const recentEscalations = await safeQuery(
      "recentEscalations",
      () =>
        db.query.agentRoutingLogs.findMany({
          where: and(
            eq(agentRoutingLogs.entityId, entityId),
            eq(agentRoutingLogs.decision, "escalated"),
          ),
          orderBy: [desc(agentRoutingLogs.createdAt)],
          limit: 5,
        }),
      [],
    );

    for (const log of recentEscalations) {
      pendingApprovalItems.push({
        id: log.id,
        type: "agent_escalation",
        title: `Escalation: ${log.intentType}`,
        subtitle: log.inputSummary,
        amount: "—",
        status: "review",
      });
    }

    // ── Recent Documents ─────────────────────────────────────────────────

    const recentDocs = await safeQuery(
      "recentDocs",
      () =>
        db.query.documents.findMany({
          where: eq(documents.entityId, entityId),
          orderBy: [desc(documents.createdAt)],
          limit: 5,
        }),
      [],
    );

    // ── Recent Conversations ─────────────────────────────────────────────

    const recentConversations = await safeQuery(
      "recentConversations",
      () =>
        db.query.conversations.findMany({
          where: and(
            eq(conversations.entityId, entityId),
            eq(conversations.status, "active"),
          ),
          orderBy: [desc(conversations.lastMessageAt)],
          limit: 5,
        }),
      [],
    );

    // ── Agent Activity (recent audit log entries) ────────────────────────

    const recentActivity = await safeQuery(
      "recentActivity",
      () =>
        db.query.auditLog.findMany({
          where: eq(auditLog.entityId, entityId),
          orderBy: [desc(auditLog.createdAt)],
          limit: 10,
        }),
      [],
    );

    // ── Suggested Actions ────────────────────────────────────────────────

    const suggestedActions: string[] = [];
    if (overdueApCount > 0) {
      suggestedActions.push(
        `Follow up ${overdueApCount} overdue invoice${overdueApCount > 1 ? "s" : ""}`,
      );
    }
    if (pendingJournals > 0) {
      suggestedActions.push(
        `Review ${pendingJournals} pending journal entr${pendingJournals > 1 ? "ies" : "y"}`,
      );
    }
    if (escalations > 0) {
      suggestedActions.push(
        `Review ${escalations} AI-flagged transaction${escalations > 1 ? "s" : ""}`,
      );
    }
    if (recentDocs.length === 0) {
      suggestedActions.push("Upload your first document");
    }

    // ── Upcoming Deadlines (real, entity-scoped) ─────────────────────────
    // Combines compliance/filing deadlines, unresolved AP invoices, and
    // in-progress payroll runs. No hardcoded dates.

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const deadlines: Array<{
      id: string;
      label: string;
      date: string;
      urgency: string;
    }> = [];

    // 1. Compliance / filing deadlines due from today onwards
    const upcomingFilings = await safeQuery(
      "upcomingFilings",
      () =>
        db.query.complianceDeadlines.findMany({
          where: and(
            eq(complianceDeadlines.entityId, entityId),
            gte(complianceDeadlines.dueDate, new Date()),
          ),
          orderBy: [asc(complianceDeadlines.dueDate)],
          limit: 2,
        }),
      [],
    );

    for (const filing of upcomingFilings) {
      const due = new Date(filing.dueDate);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      deadlines.push({
        id: `filing-${filing.id}`,
        label: filingTypeLabels[filing.filingType] ?? filing.name,
        date: due.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        urgency: daysLeft <= 7 ? "upcoming" : "normal",
      });
    }

    // 2. Unpaid AP invoices due in the future (open balances).
    const upcomingApInvoices = await safeQuery(
      "upcomingApInvoices",
      () =>
        db.query.invoicesAp.findMany({
          where: and(
            eq(invoicesAp.entityId, entityId),
            sql`${invoicesAp.status} IN ('pending', 'partial', 'overdue')`,
            gte(invoicesAp.dueDate, todayStr),
          ),
          orderBy: [asc(invoicesAp.dueDate)],
          limit: 2,
        }),
      [],
    );

    for (const invoice of upcomingApInvoices) {
      deadlines.push({
        id: `ap-${invoice.id}`,
        label: `Invoice ${invoice.invoiceNumber} due`,
        date: invoice.dueDate,
        urgency: "normal",
      });
    }

    // 3. In-progress payroll runs — the next payment is due at period end.
    const inProgressPayroll = await safeQuery(
      "inProgressPayroll",
      () =>
        db.query.payrollRuns.findFirst({
          where: and(
            eq(payrollRuns.entityId, entityId),
            sql`${payrollRuns.status} IN ('draft', 'validated', 'approved')`,
          ),
          orderBy: [desc(payrollRuns.period)],
        }),
      null,
    );

    if (inProgressPayroll) {
      const periodParts = (inProgressPayroll.period || "").split("-");
      const periodYear = parseInt(
        periodParts[0] ?? String(today.getFullYear()),
        10,
      );
      const periodMonth =
        parseInt(periodParts[1] ?? String(today.getMonth() + 1), 10) - 1;
      const runEnd = new Date(periodYear, periodMonth + 1, 0);
      const daysLeft = Math.ceil(
        (runEnd.getTime() - today.getTime()) / 86400000,
      );
      if (daysLeft >= 0) {
        deadlines.push({
          id: "payroll",
          label: "Payroll Payment",
          date: runEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          urgency: daysLeft <= 7 ? "upcoming" : "normal",
        });
      }
    }

    deadlines.sort((a, b) => a.date.localeCompare(b.date));

    return {
      // Business health
      businessHealth: {
        cashBalance: totalCashBalance,
        revenue: currentRevenue,
        expenses: currentExpenses,
        profit: currentProfit,
        arOutstanding,
        apOutstanding,
        cashChange,
        revenueChange: Number(revenueChange.toFixed(1)),
        expensesChange: Number(expensesChange.toFixed(1)),
        profitChange: Number(profitChange.toFixed(1)),
        arChange: Number(arChange.toFixed(1)),
        apChange: Number(apChange.toFixed(1)),
        // Sparkline data for charts
        cashSparkline,
        revenueSparkline: monthlyRevenues,
        expensesSparkline: monthlyExpenses,
        profitSparkline: monthlyProfits,
        arSparkline,
        apSparkline,
      },

      // Executive briefing
      briefingItems,

      // Pending approvals
      pendingApprovals: pendingApprovalItems.slice(0, 5),

      // Recent documents
      recentDocuments: recentDocs.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        createdAt: doc.createdAt,
      })),

      // Recent conversations
      recentConversations: recentConversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        summary: conv.summary,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
      })),

      // Agent activity
      agentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        createdAt: a.createdAt,
      })),

      // Suggested actions
      suggestedActions,

      // Deadlines
      deadlines,

      // Counts
      pendingApprovalsCount: pendingApprovalItems.length,
      agentEscalationsCount: escalations,
    };
  }),
});
