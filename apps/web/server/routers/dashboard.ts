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

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
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
        href: "/dashboard/operations",
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
        // Compute actual overdue amount and average days overdue
        const overdueAgg = await safeQuery(
          "overdueAgg",
          async () => {
            const result = await db
              .select({
                total: sum(invoicesAp.totalAmount),
                avgDays: sql<string>`COALESCE(AVG(EXTRACT(DAY FROM NOW() - ${invoicesAp.dueDate}::timestamp)), '0')`,
              })
              .from(invoicesAp)
              .where(
                and(
                  eq(invoicesAp.entityId, entityId),
                  eq(invoicesAp.status, "overdue"),
                ),
              );
            return result[0] ?? { total: null, avgDays: "0" };
          },
          { total: null, avgDays: "0" },
        );
        const overdueAmount = parseFloat(overdueAgg.total ?? "0");
        const avgDaysOverdue = Math.round(
          parseFloat(overdueAgg.avgDays ?? "0"),
        );
        const overdueFmt = new Intl.NumberFormat("en-GM");

        briefingItems.push({
          id: "overdue",
          type: "negative",
          title: `${overdueApCount} invoice${overdueApCount > 1 ? "s" : ""} overdue`,
          value: overdueFmt.format(overdueAmount),
          detail:
            avgDaysOverdue > 0
              ? `${avgDaysOverdue} day${avgDaysOverdue !== 1 ? "s" : ""} overdue on average`
              : "Payment overdue",
          statusLabel: "Follow up required",
          href: "/dashboard/activity-hub",
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
          title: `${pendingJournals} journal entr${pendingJournals > 1 ? "ies" : "y"} pending`,
          value: `${pendingJournals} ${pendingJournals > 1 ? "entries" : "entry"}`,
          detail: "Awaiting approval before posting",
          statusLabel: "Ready for review",
          href: "/dashboard/ledger",
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
          title: `${escalations} item${escalations > 1 ? "s" : ""} need${escalations === 1 ? "s" : ""} review`,
          value: `${escalations} flagged`,
          detail: "AI-flagged transactions requiring review",
          statusLabel: "Review now",
          href: "/dashboard/activity-hub",
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
          href: "/dashboard/operations",
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
          href: "/dashboard/operations",
          audience: ["decision", "operations", "oversight"],
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
          href: "/dashboard/activity-hub",
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
            href: "/dashboard/operations",
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

  // ── Scenario planning inputs (scenario-planning) ───────────────────────
  // Returns the real cash position and trailing burn so the insights page
  // can project runway under user-adjustable assumptions (revenue growth,
  // expense cuts) using the shared runway policy.
  getScenarioData: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

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
    const cashAccountsData = await safeQuery(
      "cashAccounts",
      () =>
        db.query.cashAccounts.findMany({
          where: eq(cashAccounts.entityId, entityId),
          columns: { currentBalance: true },
        }),
      [],
    );
    const totalCashBalance =
      cashBalance +
      cashAccountsData.reduce(
        (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
        0,
      );

    const now = new Date();
    // 6-month window, mirroring the main dashboard sparkline lookback.
    const sparklineStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      .toISOString()
      .slice(0, 10);

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
      6,
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
      6,
      now,
    );

    const burnIndexes = [3, 4, 5];
    const burnValues = burnIndexes.map(
      (i) => (monthlyExpenses[i] ?? 0) - (monthlyRevenues[i] ?? 0),
    );
    const avgMonthlyBurn =
      burnValues.reduce((sum, v) => sum + v, 0) / burnValues.length;

    return {
      cashBalance: totalCashBalance,
      avgMonthlyBurn,
      runwayMonths: computeRunwayMonths(totalCashBalance, avgMonthlyBurn),
      monthlyRevenues,
      monthlyExpenses,
    };
  }),

  // ── Dynamic dashboard suggestions ─────────────────────────────────────
  // Context-aware prompt suggestions for the AI chat input. Returns
  // suggestions driven by the entity's actual state (overdue invoices,
  // pending journals, current month, etc.) instead of hardcoded text.
  getDashboardSuggestions: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();
    const MONTH_NAMES = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentMonth = MONTH_NAMES[now.getMonth()];

    const suggestions: Array<{
      id: string;
      label: string;
      prompt: string;
    }> = [];

    // 1. Overdue invoices (highest priority — urgent action needed)
    const overdueCount = await safeQuery(
      "suggest_overdue",
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

    if (overdueCount > 0) {
      suggestions.push({
        id: "overdue_invoices",
        label: `Follow up ${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`,
        prompt: `Show all ${overdueCount} overdue invoices and help me follow up`,
      });
    }

    // 2. Pending journal entries
    const pendingJournalCount = await safeQuery(
      "suggest_journals",
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

    if (pendingJournalCount > 0) {
      suggestions.push({
        id: "pending_journals",
        label: `Review ${pendingJournalCount} pending journal entr${pendingJournalCount > 1 ? "ies" : "y"}`,
        prompt: `Show me the ${pendingJournalCount} pending journal entries to review`,
      });
    }

    // 3. Pending payroll
    const pendingPayroll = await safeQuery(
      "suggest_payroll",
      () =>
        db.query.payrollRuns.findFirst({
          where: and(
            eq(payrollRuns.entityId, entityId),
            sql`${payrollRuns.status} IN ('draft', 'validated', 'approved')`,
          ),
        }),
      null,
    );

    if (pendingPayroll) {
      suggestions.push({
        id: "payroll",
        label: "Process payroll",
        prompt: "Help me process the pending payroll run",
      });
    }

    // 4. Close current month's books (always shown)
    suggestions.push({
      id: "close_books",
      label: `Close ${currentMonth} books`,
      prompt: `Close the books for ${currentMonth} ${now.getFullYear()}`,
    });

    // 5. Explain cash position (always shown)
    suggestions.push({
      id: "cash_position",
      label: "Explain cash position",
      prompt: "Explain my current cash position",
    });

    // 6. Forecast (always shown)
    suggestions.push({
      id: "forecast",
      label: "Forecast next month",
      prompt: "Forecast cash flow for next month",
    });

    return suggestions.slice(0, 6);
  }),

  // ─── Anomaly Detection ───────────────────────────────────────────────
  // Compares current period metrics to 6-month rolling average.
  // Flags any metric that deviates >1.5 standard deviations.
  detectAnomalies: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get monthly P&L for last 7 months (6 history + current)
    const months: Array<{ year: number; month: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }

    const monthlyData: Array<{
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
    }> = [];

    for (const { year, month } of months) {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

      const entries = await db.query.journalEntries.findMany({
        where: and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
          sql`${journalEntries.date} >= ${startDate}`,
          sql`${journalEntries.date} <= ${endDate}`,
        ),
      });

      const lineIds = entries.map((e) => e.id);
      const lines =
        lineIds.length > 0
          ? await db.query.journalEntryLines.findMany({
              where: inArray(journalEntryLines.journalEntryId, lineIds),
            })
          : [];

      const accounts = await db.query.chartOfAccounts.findMany({
        where: eq(chartOfAccounts.entityId, entityId),
      });
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      let revenue = 0;
      let expenses = 0;

      for (const line of lines) {
        const account = accountMap.get(line.accountId);
        if (!account) continue;
        const amount =
          parseFloat(line.credit ?? "0") - parseFloat(line.debit ?? "0");
        if (account.type === "revenue") revenue += Math.abs(amount);
        if (account.type === "expense") expenses += Math.abs(amount);
      }

      monthlyData.push({
        month: `${MONTH_NAMES[month]} ${year}`,
        revenue,
        expenses,
        profit: revenue - expenses,
      });
    }

    // Calculate rolling statistics (exclude current month)
    const history = monthlyData.slice(0, -1);
    const current = monthlyData[monthlyData.length - 1];

    if (history.length < 3 || !current) {
      return { anomalies: [], monthlyData };
    }

    const calcStats = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        values.length;
      const stdDev = Math.sqrt(variance);
      return { mean, stdDev };
    };

    const revenueStats = calcStats(history.map((h) => h.revenue));
    const expenseStats = calcStats(history.map((h) => h.expenses));
    const profitStats = calcStats(history.map((h) => h.profit));

    type Anomaly = {
      id: string;
      metric: string;
      current: number;
      average: number;
      deviation: number;
      severity: "high" | "medium" | "low";
      direction: "up" | "down";
      message: string;
      aiInsight: string;
    };

    const anomalies: Anomaly[] = [];
    const THRESHOLD = 1.5; // standard deviations

    // Check revenue
    if (revenueStats.stdDev > 0) {
      const zScore =
        (current.revenue - revenueStats.mean) / revenueStats.stdDev;
      if (Math.abs(zScore) > THRESHOLD) {
        const pctChange =
          revenueStats.mean > 0
            ? ((current.revenue - revenueStats.mean) / revenueStats.mean) * 100
            : 0;
        anomalies.push({
          id: "revenue_anomaly",
          metric: "Revenue",
          current: current.revenue,
          average: revenueStats.mean,
          deviation: Math.abs(zScore),
          severity: Math.abs(zScore) > 2.5 ? "high" : "medium",
          direction: zScore > 0 ? "up" : "down",
          message: `Revenue is ${Math.abs(pctChange).toFixed(0)}% ${zScore > 0 ? "above" : "below"} your 6-month average`,
          aiInsight:
            zScore > 0
              ? "Revenue spiked this month. Investigate which customers or contracts drove this increase."
              : "Revenue dropped significantly. Check for lost contracts, seasonal patterns, or delayed invoicing.",
        });
      }
    }

    // Check expenses
    if (expenseStats.stdDev > 0) {
      const zScore =
        (current.expenses - expenseStats.mean) / expenseStats.stdDev;
      if (Math.abs(zScore) > THRESHOLD) {
        const pctChange =
          expenseStats.mean > 0
            ? ((current.expenses - expenseStats.mean) / expenseStats.mean) * 100
            : 0;
        anomalies.push({
          id: "expense_anomaly",
          metric: "Expenses",
          current: current.expenses,
          average: expenseStats.mean,
          deviation: Math.abs(zScore),
          severity: Math.abs(zScore) > 2.5 ? "high" : "medium",
          direction: zScore > 0 ? "up" : "down",
          message: `Expenses are ${Math.abs(pctChange).toFixed(0)}% ${zScore > 0 ? "above" : "below"} your 6-month average`,
          aiInsight:
            zScore > 0
              ? "Expenses surged this month. Review large transactions and check for unusual spending patterns."
              : "Expenses dropped significantly. Verify this isn't a data entry error or missed bills.",
        });
      }
    }

    // Check profit margin
    if (profitStats.stdDev > 0 && current.revenue > 0) {
      const currentMargin = (current.profit / current.revenue) * 100;
      const avgMargin =
        profitStats.mean > 0 && revenueStats.mean > 0
          ? (profitStats.mean / revenueStats.mean) * 100
          : 0;
      const zScore =
        profitStats.stdDev > 0
          ? (current.profit - profitStats.mean) / profitStats.stdDev
          : 0;

      if (Math.abs(zScore) > THRESHOLD) {
        anomalies.push({
          id: "margin_anomaly",
          metric: "Profit Margin",
          current: currentMargin,
          average: avgMargin,
          deviation: Math.abs(zScore),
          severity: Math.abs(zScore) > 2.5 ? "high" : "low",
          direction: zScore > 0 ? "up" : "down",
          message: `Profit margin is ${currentMargin.toFixed(1)}% vs ${avgMargin.toFixed(1)}% average`,
          aiInsight:
            zScore > 0
              ? "Margin improved significantly. Identify what changed — pricing, cost control, or mix shift."
              : "Margin compressed. Usually driven by expense growth outpacing revenue growth.",
        });
      }
    }

    // Check for negative cash flow (expenses > revenue)
    if (current.expenses > current.revenue && current.revenue > 0) {
      const burnRate = current.expenses - current.revenue;
      anomalies.push({
        id: "negative_cashflow",
        metric: "Cash Flow",
        current: current.profit,
        average: profitStats.mean,
        deviation: 0,
        severity: "high",
        direction: "down",
        message: `Spending GMD ${burnRate.toLocaleString()} more than you're earning this month`,
        aiInsight:
          "You're burning cash. At this rate, review your runway and consider cost cuts or revenue acceleration.",
      });
    }

    return { anomalies, monthlyData };
  }),

  // ─── AI Financial Narrative ─────────────────────────────────────────
  // Generates a natural language narrative from real financial data.
  // Uses Haiku for speed. Cached for 10 minutes per entity.
  getAiNarrative: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const entityName = ctx.entityName ?? "your business";
    const currency = ctx.currency ?? "GMD";
    const now = new Date();

    // Check Redis cache first
    const cacheKey = `narrative:${entityId}`;
    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as {
            text: string;
            confidence: number;
            generatedAt: string;
            highlights: string[];
            concerns: string[];
          };
        }
      }
    } catch {
      // Cache unavailable — continue without it
    }

    // Gather financial context
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`;

    const entries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`,
      ),
    });

    const lineIds = entries.map((e) => e.id);
    const lines =
      lineIds.length > 0
        ? await db.query.journalEntryLines.findMany({
            where: inArray(journalEntryLines.journalEntryId, lineIds),
          })
        : [];

    const accounts = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.entityId, entityId),
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let revenue = 0;
    let expenses = 0;
    const revenueByAccount: Record<string, number> = {};
    const expensesByAccount: Record<string, number> = {};

    for (const line of lines) {
      const account = accountMap.get(line.accountId);
      if (!account) continue;
      const amount =
        parseFloat(line.credit ?? "0") - parseFloat(line.debit ?? "0");
      if (account.type === "revenue") {
        revenue += Math.abs(amount);
        revenueByAccount[account.name] =
          (revenueByAccount[account.name] ?? 0) + Math.abs(amount);
      }
      if (account.type === "expense") {
        expenses += Math.abs(amount);
        expensesByAccount[account.name] =
          (expensesByAccount[account.name] ?? 0) + Math.abs(amount);
      }
    }

    const netProfit = revenue - expenses;
    const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

    // Get prior month for comparison
    const priorMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const priorYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const priorStart = `${priorYear}-${String(priorMonth + 1).padStart(2, "0")}-01`;
    const priorEnd = `${priorYear}-${String(priorMonth + 1).padStart(2, "0")}-${new Date(priorYear, priorMonth + 1, 0).getDate()}`;

    const priorEntries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.date} >= ${priorStart}`,
        sql`${journalEntries.date} <= ${priorEnd}`,
      ),
    });

    const priorLineIds = priorEntries.map((e) => e.id);
    const priorLines =
      priorLineIds.length > 0
        ? await db.query.journalEntryLines.findMany({
            where: inArray(journalEntryLines.journalEntryId, priorLineIds),
          })
        : [];

    let priorRevenue = 0;
    let priorExpenses = 0;

    for (const line of priorLines) {
      const account = accountMap.get(line.accountId);
      if (!account) continue;
      const amount =
        parseFloat(line.credit ?? "0") - parseFloat(line.debit ?? "0");
      if (account.type === "revenue") priorRevenue += Math.abs(amount);
      if (account.type === "expense") priorExpenses += Math.abs(amount);
    }

    const revenueChange =
      priorRevenue > 0 ? ((revenue - priorRevenue) / priorRevenue) * 100 : 0;
    const expensesChange =
      priorExpenses > 0
        ? ((expenses - priorExpenses) / priorExpenses) * 100
        : 0;

    // Get banking context
    const bankAccounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
    });
    const cashBalance = bankAccounts.reduce(
      (sum, a) => sum + parseFloat(a.balance ?? "0"),
      0,
    );

    // Build context for AI
    const topExpenses = Object.entries(expensesByAccount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(
        ([name, amount]) => `${name}: ${currency} ${amount.toLocaleString()}`,
      )
      .join("\n");

    const topRevenue = Object.entries(revenueByAccount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(
        ([name, amount]) => `${name}: ${currency} ${amount.toLocaleString()}`,
      )
      .join("\n");

    const prompt = `You are a CFO AI assistant for ${entityName}. Generate a concise, insightful financial narrative for this month (${MONTH_NAMES[currentMonth]} ${currentYear}).

CURRENT MONTH:
- Revenue: ${currency} ${revenue.toLocaleString()}${revenueChange !== 0 ? ` (${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs prior)` : ""}
- Expenses: ${currency} ${expenses.toLocaleString()}${expensesChange !== 0 ? ` (${expensesChange > 0 ? "+" : ""}${expensesChange.toFixed(1)}% vs prior)` : ""}
- Net Profit: ${currency} ${netProfit.toLocaleString()} (${margin}% margin)
- Cash Balance: ${currency} ${cashBalance.toLocaleString()}

TOP REVENUE SOURCES:
${topRevenue || "No data"}

TOP EXPENSE CATEGORIES:
${topExpenses || "No data"}

PRIOR MONTH:
- Revenue: ${currency} ${priorRevenue.toLocaleString()}
- Expenses: ${currency} ${priorExpenses.toLocaleString()}
- Net Profit: ${currency} ${(priorRevenue - priorExpenses).toLocaleString()}

Write a 2-3 paragraph narrative that:
1. Summarizes the financial position in plain English
2. Highlights what's working well (positive trends)
3. Flags concerns or areas needing attention
4. Ends with 1-2 actionable recommendations

Keep it professional but conversational. Use specific numbers. Don't be generic.`;

    try {
      const { getLLMRegistry } =
        await import("@xenboox/agents/core/llm/registry");
      const registry = getLLMRegistry();
      const { model } = await registry.getModel("fast");

      const result = await model.invoke(prompt);
      const text =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);

      // Extract highlights and concerns from the narrative
      const highlights: string[] = [];
      const concerns: string[] = [];

      if (revenueChange > 5)
        highlights.push(
          `Revenue grew ${revenueChange.toFixed(1)}% vs prior month`,
        );
      if (expensesChange < -5)
        highlights.push(
          `Expenses reduced ${Math.abs(expensesChange).toFixed(1)}% vs prior month`,
        );
      if (margin > 20) highlights.push(`Healthy ${margin}% profit margin`);
      if (cashBalance > expenses * 3)
        highlights.push(
          `Strong cash position with ${Math.round(cashBalance / (expenses || 1))} months of runway`,
        );

      if (revenueChange < -10)
        concerns.push(
          `Revenue declined ${Math.abs(revenueChange).toFixed(1)}% vs prior month`,
        );
      if (expensesChange > 15)
        concerns.push(
          `Expenses increased ${expensesChange.toFixed(1)}% — investigate unusual spending`,
        );
      if (margin < 10 && revenue > 0)
        concerns.push(
          `Thin ${margin}% margin — consider pricing or cost optimization`,
        );
      if (cashBalance < expenses * 1)
        concerns.push(
          `Low cash balance — less than 1 month of expenses covered`,
        );

      const narrative = {
        text,
        confidence: 0.85,
        generatedAt: now.toISOString(),
        highlights,
        concerns,
      };

      // Cache for 10 minutes
      try {
        const { getRedis } = await import("@/lib/redis");
        const redis = getRedis();
        if (redis) {
          await redis.setex(cacheKey, 600, JSON.stringify(narrative));
        }
      } catch {
        // Cache write failed — non-critical
      }

      return narrative;
    } catch (error) {
      logger.error(
        { err: error },
        "[dashboard] AI narrative generation failed",
      );

      // Fallback to assembled narrative
      const parts: string[] = [];
      if (revenue > 0)
        parts.push(
          `Revenue is ${currency} ${revenue.toLocaleString()}${revenueChange !== 0 ? ` (${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs prior)` : ""}.`,
        );
      if (expenses > 0)
        parts.push(
          `Expenses are ${currency} ${expenses.toLocaleString()}${expensesChange !== 0 ? ` (${expensesChange > 0 ? "+" : ""}${expensesChange.toFixed(1)}%)` : ""}.`,
        );
      parts.push(
        `Net ${netProfit >= 0 ? "profit" : "loss"} is ${currency} ${Math.abs(netProfit).toLocaleString()} (${margin}% margin).`,
      );

      return {
        text: parts.join(" "),
        confidence: 0.5,
        generatedAt: now.toISOString(),
        highlights:
          revenueChange > 5
            ? [`Revenue grew ${revenueChange.toFixed(1)}%`]
            : [],
        concerns:
          revenueChange < -10
            ? [`Revenue declined ${Math.abs(revenueChange).toFixed(1)}%`]
            : [],
      };
    }
  }),
});
