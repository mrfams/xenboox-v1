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
  ne,
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
import { entitySettings } from "@xenboox/db/schema/entity-settings";
import { entities } from "@xenboox/db/schema/organization";

import { rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { getEntityLocale } from "@/lib/entity-locale";
import {
  buildRunwayBriefing,
  computeRunwayMonths,
  computeRunwaySparkline,
} from "@/lib/dashboard-runway";
import {
  pctChange,
  fillMonthlyWindow,
  safeQuery,
  filingTypeLabels,
} from "./_helpers";

/**
 * Single aggregation endpoint for all dashboard data.
 * Fetches executive briefing, business health, activity feed,
 * pending approvals, active agents, right sidebar data.
 *
 * Each query is individually try/caught so that missing tables or schema
 * mismatches on production don't crash the entire dashboard.
 */
export const getDashboardData = rlsProtectedProcedure
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

    // A/R outstanding
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

    // A/P outstanding
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
              ne(salesInvoices.status, "voided"),
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

    // ── Cash Runway ─────────────────────────────────────────────────────
    const burnMonthIndexes = [3, 4, 5];
    const burnValues = burnMonthIndexes.map(
      (i) => (monthlyExpenses[i] ?? 0) - (monthlyRevenues[i] ?? 0),
    );
    const avgMonthlyBurn =
      burnValues.reduce((sum, v) => sum + v, 0) / burnValues.length;
    const runwayMonths = computeRunwayMonths(totalCashBalance, avgMonthlyBurn);
    const runwaySparkline = computeRunwaySparkline(
      cashSparkline,
      avgMonthlyBurn,
    );

    // ── Executive Briefing Items ─────────────────────────────────────────
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
      const avgDaysOverdue = Math.round(parseFloat(overdueAgg.avgDays ?? "0"));
      // Resolve entity locale for formatting
      const [entityRow, settingsRow] = await Promise.all([
        db.query.entities.findFirst({
          where: eq(entities.id, entityId),
          columns: { baseCurrency: true },
        }),
        db.query.entitySettings.findFirst({
          where: eq(entitySettings.entityId, entityId),
        }),
      ]);
      const entityLocale = getEntityLocale(
        settingsRow,
        entityRow?.baseCurrency,
      );
      const overdueFmt = new Intl.NumberFormat(entityLocale);

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
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const deadlines: Array<{
      id: string;
      label: string;
      date: string;
      urgency: string;
      href: string;
    }> = [];

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
        href: "/dashboard/operations",
      });
    }

    if (upcomingFilings.length > 0) {
      const next = upcomingFilings[0];
      const due = new Date(next.dueDate);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86400000);
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
        arOutstanding,
        apOutstanding,
        cashChange,
        revenueChange: Number(revenueChange.toFixed(1)),
        expensesChange: Number(expensesChange.toFixed(1)),
        runwayMonths,
        monthlyBurn: Number(avgMonthlyBurn.toFixed(0)),
        cashSparkline,
        revenueSparkline: monthlyRevenues,
        expensesSparkline: monthlyExpenses,
        runwaySparkline,
      },

      briefingItems,

      pendingApprovals: pendingApprovalItems.slice(0, 5),

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

      recentConversations: recentConversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        summary: conv.summary,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
      })),

      agentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        createdAt: a.createdAt,
      })),

      suggestedActions,

      deadlines,

      pendingApprovalsCount: pendingApprovalItems.length,
      agentEscalationsCount: escalations,
      deadlinesTotal: deadlines.length,
      suggestedActionsTotal: suggestedActions.length,
    };
  });
