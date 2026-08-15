import { z } from "zod";
import {
  eq,
  and,
  desc,
  sql,
  gte,
  lte,
  count,
  sum,
  asc,
  inArray,
} from "drizzle-orm";
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
  documentViews,
  conversations,
  chatMessages,
  auditLog,
  agentRoutingLogs,
  complianceDeadlines,
  payrollRuns,
} from "@xenboox/db/schema";
import { logger } from "@/lib/logger";
import {
  buildRunwayBriefing,
  computeRunwayMonths,
  computeRunwaySparkline,
} from "@/lib/dashboard-runway";

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

// Fills the trailing N-month window (index 0 = N months back, last = current)
// from a single GROUP BY-month query — the replacement for the old
// per-month-query sparkline loops (7 round-trips × 3 series = 21 queries).
function fillMonthlyWindow(
  rows: Array<{ month: string | null; total: string | null }>,
  monthsBack: number,
  now: Date,
): number[] {
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    if (r.month) byMonth.set(r.month, parseFloat(r.total ?? "0"));
  }
  const out: number[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push(byMonth.get(key) ?? 0);
  }
  return out;
}

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
  getDashboardData: rlsProtectedProcedure
    .input(
      z.object({
        period: z
          .enum(["this_month", "last_month", "this_quarter"])
          .default("this_month"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const now = new Date();

      // ── Period ranges (Business Health selector) ───────────────────────
      // Revenue / expenses / profit follow the selected period and compare
      // against the equivalent previous window. Cash, A/R and A/P are
      // point-in-time snapshots and intentionally don't follow the selector.
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      const periodConfig: Record<
        "this_month" | "last_month" | "this_quarter",
        {
          label: string;
          compareLabel: string;
          start: Date;
          end: Date;
          prevStart: Date;
          prevEnd: Date;
        }
      > = {
        this_month: {
          label: "this month",
          compareLabel: "vs last month",
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          prevEnd: new Date(now.getFullYear(), now.getMonth(), 0),
        },
        last_month: {
          label: "last month",
          compareLabel: "vs previous month",
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
          prevStart: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          prevEnd: new Date(now.getFullYear(), now.getMonth() - 1, 0),
        },
        this_quarter: {
          label: "this quarter",
          compareLabel: "vs last quarter",
          start: new Date(now.getFullYear(), quarterStart, 1),
          end: new Date(now.getFullYear(), quarterStart + 3, 0),
          prevStart: new Date(now.getFullYear(), quarterStart - 3, 1),
          prevEnd: new Date(now.getFullYear(), quarterStart, 0),
        },
      };
      const cfg = periodConfig[input.period] ?? periodConfig.this_month;
      const startOfPeriod = cfg.start;
      const endOfPeriod = cfg.end;
      const prevStartOfPeriod = cfg.prevStart;
      const prevEndOfPeriod = cfg.prevEnd;

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

      // Revenue — sum of sales invoices in the selected period
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
                  startOfPeriod.toISOString().split("T")[0],
                ),
                lte(
                  salesInvoices.invoiceDate,
                  endOfPeriod.toISOString().split("T")[0],
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
                  prevStartOfPeriod.toISOString().split("T")[0],
                ),
                lte(
                  salesInvoices.invoiceDate,
                  prevEndOfPeriod.toISOString().split("T")[0],
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
                  startOfPeriod.toISOString().split("T")[0],
                ),
                lte(
                  invoicesAp.invoiceDate,
                  endOfPeriod.toISOString().split("T")[0],
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
                  prevStartOfPeriod.toISOString().split("T")[0],
                ),
                lte(
                  invoicesAp.invoiceDate,
                  prevEndOfPeriod.toISOString().split("T")[0],
                ),
              ),
            ),
        [{ total: null }],
      );
      const prevExpenses = parseFloat(prevExpensesResult[0]?.total ?? "0");

      // Calculate percentage changes
      const revenueChange =
        prevRevenue > 0
          ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
          : 0;
      const expensesChange =
        prevExpenses > 0
          ? ((currentExpenses - prevExpenses) / prevExpenses) * 100
          : 0;

      // ── Sparkline Data (Last 6 months) ────────────────────────────────────
      // One GROUP BY-month query per series (was 7 sequential per-month
      // queries per series — 21 round-trips on the hottest endpoint).
      // `to_char(..., 'YYYY-MM')` keys match the window fill below; a missing
      // month simply fills 0 rather than erroring.
      const SPARKLINE_MONTHS = 6;
      const sparklineStart = new Date(
        now.getFullYear(),
        now.getMonth() - SPARKLINE_MONTHS,
        1,
      )
        .toISOString()
        .split("T")[0];

      const revenueRows = await safeQuery(
        "monthlyRevenues",
        () =>
          db
            .select({
              month: sql<string>`to_char(${salesInvoices.invoiceDate}::date, 'YYYY-MM')`,
              total: sum(salesInvoices.totalAmount),
            })
            .from(salesInvoices)
            .where(
              and(
                eq(salesInvoices.entityId, entityId),
                gte(salesInvoices.invoiceDate, sparklineStart),
              ),
            )
            .groupBy(sql`1`),
        [],
      );
      const monthlyRevenues = fillMonthlyWindow(
        revenueRows as Array<{ month: string | null; total: string | null }>,
        SPARKLINE_MONTHS,
        now,
      );

      const expenseRows = await safeQuery(
        "monthlyExpenses",
        () =>
          db
            .select({
              month: sql<string>`to_char(${invoicesAp.invoiceDate}::date, 'YYYY-MM')`,
              total: sum(invoicesAp.totalAmount),
            })
            .from(invoicesAp)
            .where(
              and(
                eq(invoicesAp.entityId, entityId),
                gte(invoicesAp.invoiceDate, sparklineStart),
              ),
            )
            .groupBy(sql`1`),
        [],
      );
      const monthlyExpenses = fillMonthlyWindow(
        expenseRows as Array<{ month: string | null; total: string | null }>,
        SPARKLINE_MONTHS,
        now,
      );

      // ── Cash Balance Sparkline (real data from bank transactions) ──────
      // Single grouped query (was 7 per-month queries).
      const cashFlowRows = await safeQuery(
        "monthlyCashFlows",
        () =>
          db
            .select({
              month: sql<string>`to_char(${bankTransactions.transactionDate}::date, 'YYYY-MM')`,
              total: sum(bankTransactions.amount),
            })
            .from(bankTransactions)
            .where(
              and(
                eq(bankTransactions.entityId, entityId),
                gte(bankTransactions.transactionDate, sparklineStart),
              ),
            )
            .groupBy(sql`1`),
        [],
      );
      const monthlyCashFlows = fillMonthlyWindow(
        cashFlowRows as Array<{ month: string | null; total: string | null }>,
        SPARKLINE_MONTHS,
        now,
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

      // ── Cash Runway (months of cash at the current burn rate) ────────────
      // Burn = average net (expenses − revenue) across the last three
      // completed months. If the business is cash-flow positive (burn ≤ 0),
      // runway is effectively unbounded — surfaced as "sustainable" rather
      // than a misleading finite number.
      const burnMonthIndexes = [3, 4, 5]; // 3, 2, 1 months back (0 = current)
      const burnValues = burnMonthIndexes.map(
        (i) => (monthlyExpenses[i] ?? 0) - (monthlyRevenues[i] ?? 0),
      );
      const avgMonthlyBurn =
        burnValues.reduce((sum, v) => sum + v, 0) / burnValues.length;
      // Threshold policy, sparkline and briefing copy live in
      // apps/web/lib/dashboard-runway.ts so server and client can never drift.
      const runwayMonths = computeRunwayMonths(
        totalCashBalance,
        avgMonthlyBurn,
      );
      const runwaySparkline = computeRunwaySparkline(
        cashSparkline,
        avgMonthlyBurn,
      );

      // ── Executive Briefing Items ─────────────────────────────────────────

      // `audience` decides which roles see each insight (see ROLE_AUDIENCES in
      // apps/web/lib/dashboard-audiences.ts). decision = financial pulse,
      // operations = work queue, oversight = verifiable state for auditors.
      const briefingItems: Array<{
        id: string;
        type: "positive" | "warning" | "negative" | "neutral";
        title: string;
        value: string;
        detail: string;
        statusLabel: string;
        href: string;
        audience: Array<"decision" | "operations" | "oversight">;
      }> = [];

      // Runway — the one forward-looking number an executive acts on. It
      // replaces the KPI-duplicate cards (revenue/expenses/profit/AR/AP/cash)
      // which now live in Business Health; the briefing stays attention-first.
      briefingItems.push({
        id: "runway",
        ...buildRunwayBriefing(runwayMonths, avgMonthlyBurn),
        href: "/dashboard/banking",
        audience: ["decision", "oversight"],
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
          audience: ["decision", "operations"],
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
          audience: ["operations"],
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
          audience: ["decision", "operations"],
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

      // Per-user read state: which of these docs has the current user opened?
      // (rlsProtectedProcedure guarantees a session; the ?? "" guard just keeps
      // the query safe if a caller ever lacks one — matches nothing.)
      const recentDocIds = recentDocs.map((d) => d.id);
      const recentDocViews = await safeQuery(
        "recentDocViews",
        () =>
          db.query.documentViews.findMany({
            where: and(
              eq(documentViews.entityId, entityId),
              eq(documentViews.userId, ctx.session?.user?.id ?? ""),
              recentDocIds.length > 0
                ? inArray(documentViews.documentId, recentDocIds)
                : undefined,
            ),
            columns: { documentId: true, viewedAt: true },
          }),
        [],
      );
      const viewedMap = new Map(
        recentDocViews.map((v) => [v.documentId, v.viewedAt]),
      );

      // Totals for "View all (N)" links — only shown when N > 5.
      const recentDocumentsTotal = await safeQuery(
        "recentDocumentsTotal",
        async () => {
          const r = await db
            .select({ c: count() })
            .from(documents)
            .where(eq(documents.entityId, entityId));
          return r[0]?.c ?? 0;
        },
        0,
      );

      const recentConversationsTotal = await safeQuery(
        "recentConversationsTotal",
        async () => {
          const r = await db
            .select({ c: count() })
            .from(conversations)
            .where(
              and(
                eq(conversations.entityId, entityId),
                eq(conversations.status, "active"),
              ),
            );
          return r[0]?.c ?? 0;
        },
        0,
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
        // Each deadline links to the module that owns it (filing → tax,
        // invoice → bills, payroll → payroll) — never a generic catch-all.
        href: string;
      }> = [];

      // 1. Compliance / filing deadlines due from today onwards
      // (limits tuned so the combined deadlines list can exceed 5 — the right
      // panel's "View all (N)" only appears when total > 5)
      const upcomingFilings = await safeQuery(
        "upcomingFilings",
        () =>
          db.query.complianceDeadlines.findMany({
            where: and(
              eq(complianceDeadlines.entityId, entityId),
              gte(complianceDeadlines.dueDate, new Date()),
            ),
            orderBy: [asc(complianceDeadlines.dueDate)],
            limit: 3,
          }),
        [],
      );

      for (const filing of upcomingFilings) {
        const due = new Date(filing.dueDate);
        const daysLeft = Math.ceil(
          (due.getTime() - today.getTime()) / 86400000,
        );
        deadlines.push({
          id: `filing-${filing.id}`,
          label: filingTypeLabels[filing.filingType] ?? filing.name,
          date: due.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          urgency: daysLeft <= 7 ? "upcoming" : "normal",
          href: "/dashboard/tax-compliance",
        });
      }

      // Briefing item: the next compliance filing — gives the oversight
      // audience (auditors/donors) and decision-makers a real compliance pulse.
      if (upcomingFilings.length > 0) {
        const next = upcomingFilings[0];
        const due = new Date(next.dueDate);
        const daysLeft = Math.ceil(
          (due.getTime() - today.getTime()) / 86400000,
        );
        briefingItems.push({
          id: `filing-${next.id}`,
          type: daysLeft <= 7 ? "warning" : "neutral",
          title: filingTypeLabels[next.filingType] ?? next.name,
          value: due.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          detail:
            daysLeft <= 7
              ? `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
              : `Due in ${daysLeft} days`,
          statusLabel: daysLeft <= 7 ? "Due soon" : "On schedule",
          href: "/dashboard/tax-compliance",
          audience: ["decision", "oversight"],
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
            limit: 3,
          }),
        [],
      );

      for (const invoice of upcomingApInvoices) {
        deadlines.push({
          id: `ap-${invoice.id}`,
          label: `Invoice ${invoice.invoiceNumber} due`,
          date: invoice.dueDate,
          urgency: "normal",
          href: "/dashboard/bills",
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
            href: "/dashboard/payroll",
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
          // A/R and A/P are no longer displayed as Business Health cards, but
          // the chat context still reads them as signals — keep them in the
          // payload (already computed above).
          arOutstanding,
          apOutstanding,
          cashChange,
          revenueChange: Number(revenueChange.toFixed(1)),
          expensesChange: Number(expensesChange.toFixed(1)),
          // Cash runway — months of cash at the current burn rate (null =
          // cash-flow positive / sustainable).
          runwayMonths,
          monthlyBurn: Number(avgMonthlyBurn.toFixed(0)),
          // Sparkline data for charts
          cashSparkline,
          revenueSparkline: monthlyRevenues,
          expensesSparkline: monthlyExpenses,
          runwaySparkline,
        },

        // Executive briefing
        briefingItems,

        // Pending approvals
        pendingApprovals: pendingApprovalItems.slice(0, 5),

        // Recent documents (max 5) with per-user read state
        recentDocuments: recentDocs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          createdAt: doc.createdAt,
          viewed: viewedMap.has(doc.id),
          viewedAt: viewedMap.get(doc.id) ?? null,
        })),
        recentDocumentsTotal,
        recentConversationsTotal,

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

        // Deadlines (each row links to its owning module)
        deadlines,

        // Counts
        pendingApprovalsCount: pendingApprovalItems.length,
        agentEscalationsCount: escalations,
        deadlinesTotal: deadlines.length,
        suggestedActionsTotal: suggestedActions.length,
      };
    }),
});
