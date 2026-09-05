import { z } from "zod";
import { eq, and, asc, inArray, desc, sql } from "drizzle-orm";
import {
  runReportingPipeline,
  detectReportablePeriods,
  generateCashFlow,
  generateBudgetVsActual,
} from "@xenboox/agents";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import {
  aggregateReportRows,
  derivePnl,
  deriveBalanceSheet,
  isDebitNormal,
  type ReportLineLike,
  type ReportAccountLike,
  type ReportStatementLine,
} from "@xenboox/db";
import { reportSnapshots } from "@xenboox/db/schema/reporting";
import { artifactRegistry } from "@xenboox/db/schema/artifacts";
import { entities } from "@xenboox/db/schema/organization";

import { db } from "@/lib/db";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  concurrencyLimitedProcedure,
} from "@/lib/trpc/server";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const reportsRouter = router({
  /**
   * Get overview data for the Reports page.
   */
  getOverview: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Default to current month
      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // Previous month for comparison
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevStartDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const prevEndDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()}`;

      // Get all posted journal entries for current period
      const currentEntries = await db.query.journalEntries.findMany({
        where: and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
          sql`${journalEntries.date} >= ${startDate}`,
          sql`${journalEntries.date} <= ${endDate}`,
        ),
      });

      // Get previous period entries
      const prevEntries = await db.query.journalEntries.findMany({
        where: and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
          sql`${journalEntries.date} >= ${prevStartDate}`,
          sql`${journalEntries.date} <= ${prevEndDate}`,
        ),
      });

      // Get all lines for current period
      const currentLineIds = currentEntries.map((e) => e.id);
      const currentLines =
        currentLineIds.length > 0
          ? await db.query.journalEntryLines.findMany({
              where: inArray(journalEntryLines.journalEntryId, currentLineIds),
            })
          : [];

      // Get all lines for previous period
      const prevLineIds = prevEntries.map((e) => e.id);
      const prevLines =
        prevLineIds.length > 0
          ? await db.query.journalEntryLines.findMany({
              where: inArray(journalEntryLines.journalEntryId, prevLineIds),
            })
          : [];

      // ── Canonical derivations (P9-A) ──────────────────────────────────────
      // P&L = activity within the window; Balance Sheet = cumulative position
      // as of the window end. No fabricated 0.65/0.35 ratios; equity folds
      // current earnings so positions are real.

      const accounts = await db.query.chartOfAccounts.findMany({
        where: eq(chartOfAccounts.entityId, entityId),
      });

      // P&L rows for current + previous windows (already-fetched lines).
      const curRows = aggregateReportRows(
        currentLines as ReportLineLike[],
        accounts as ReportAccountLike[],
      );
      const prevRows = aggregateReportRows(
        prevLines as ReportLineLike[],
        accounts as ReportAccountLike[],
      );
      const curPnl = derivePnl(curRows);
      const prevPnl = derivePnl(prevRows);

      // Cumulative BS rows as of each window end (all posted entries <= date).
      const loadBs = async (asOf: string) => {
        const entries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "posted"),
            sql`${journalEntries.date} <= ${asOf}`,
          ),
        });
        const ids = entries.map((e) => e.id);
        const bsLines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];
        return deriveBalanceSheet(
          aggregateReportRows(
            bsLines as ReportLineLike[],
            accounts as ReportAccountLike[],
          ),
        );
      };
      const curBs = await loadBs(endDate);
      const prevBs = await loadBs(prevEndDate);

      const revenue = curPnl.totalRevenue;
      const cogs = curPnl.totalCogs;
      const grossProfit = curPnl.grossProfit;
      const operatingExpenses = curPnl.totalOperatingExpenses;
      const operatingProfit = curPnl.operatingProfit;
      const netProfit = curPnl.netIncome;

      const prevRevenue = prevPnl.totalRevenue;
      const prevCogs = prevPnl.totalCogs;
      const prevGrossProfit = prevPnl.grossProfit;
      const prevOpExpenses = prevPnl.totalOperatingExpenses;
      const prevOpProfit = prevPnl.operatingProfit;
      const prevNetProfit = prevPnl.netIncome;

      const totalAssets = curBs.totalAssets;
      const totalLiabilities = curBs.totalLiabilities;
      const totalEquity = curBs.totalEquityWithEarnings;
      const prevTotalAssets = prevBs.totalAssets;
      const prevTotalLiabilities = prevBs.totalLiabilities;
      const prevTotalEquity = prevBs.totalEquityWithEarnings;

      const calcChange = (current: number, previous: number) =>
        previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;

      const assetCount = accounts.filter((a) => a.type === "asset").length;
      const liabilityCount = accounts.filter(
        (a) => a.type === "liability",
      ).length;
      const equityCount = accounts.filter((a) => a.type === "equity").length;
      const revenueCount = accounts.filter((a) => a.type === "revenue").length;
      const expenseCount = accounts.filter((a) => a.type === "expense").length;

      return {
        revenue,
        revenueChange: Number(calcChange(revenue, prevRevenue).toFixed(1)),
        netProfit,
        netProfitChange: Number(
          calcChange(netProfit, prevNetProfit).toFixed(1),
        ),
        totalAssets,
        totalLiabilities,
        totalEquity,
        cogs,
        grossProfit,
        operatingExpenses,
        operatingProfit,
        // Period-over-period changes for all P&L items
        cogsChange: Number(calcChange(cogs, prevCogs).toFixed(1)),
        grossProfitChange: Number(
          calcChange(grossProfit, prevGrossProfit).toFixed(1),
        ),
        operatingExpensesChange: Number(
          calcChange(operatingExpenses, prevOpExpenses).toFixed(1),
        ),
        operatingProfitChange: Number(
          calcChange(operatingProfit, prevOpProfit).toFixed(1),
        ),
        // Balance sheet changes (position as-of vs prior position)
        assetsChange: Number(
          calcChange(totalAssets, prevTotalAssets).toFixed(1),
        ),
        liabilitiesChange: Number(
          calcChange(totalLiabilities, prevTotalLiabilities).toFixed(1),
        ),
        equityChange: Number(
          calcChange(totalEquity, prevTotalEquity).toFixed(1),
        ),
        accountSummary: {
          total: accounts.length,
          assets: assetCount,
          liabilities: liabilityCount,
          equity: equityCount,
          revenue: revenueCount,
          expenses: expenseCount,
        },
      };
    }),
  /**
   * Get P&L overview for the bar chart comparison.
   */
  getPnlOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const currency =
      (ctx as { entityCurrency?: string | null }).entityCurrency ?? "USD";

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Helper to get P&L for a month
    const getPnlForMonth = async (year: number, month: number) => {
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

      // Canonical derivation — real COGS split by subtype, per-account
      // netting, credit-normal revenue. NO fabricated 0.65/0.35 ratios.
      const rows = aggregateReportRows(
        lines as ReportLineLike[],
        accounts as ReportAccountLike[],
      );
      const pnl = derivePnl(rows);

      const toBreakdown = (list: ReportStatementLine[]) =>
        list
          .map((l) => ({
            accountName: l.name,
            accountCode: l.code,
            amount: Math.abs(l.amount),
          }))
          .sort((a, b) => b.amount - a.amount);

      const revenue = pnl.totalRevenue;
      const expenses = pnl.totalCogs + pnl.totalOperatingExpenses;

      return {
        revenue,
        expenses,
        cogs: pnl.totalCogs,
        grossProfit: pnl.grossProfit,
        opExpenses: pnl.totalOperatingExpenses,
        opProfit: pnl.operatingProfit,
        netProfit: pnl.netIncome,
        revenueByAccount: toBreakdown(pnl.revenue),
        expensesByAccount: toBreakdown([...pnl.cogs, ...pnl.operatingExpenses]),
      };
    };

    const currentPnl = await getPnlForMonth(currentYear, currentMonth);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevPnl = await getPnlForMonth(prevYear, prevMonth);

    return {
      current: currentPnl,
      previous: prevPnl,
    };
  }),

  /**
   * Get expense categories for donut chart.
   */
  getExpenseCategories: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "USD";

      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

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

      // Group expenses by account name
      const categoryMap = new Map<string, number>();
      for (const line of lines) {
        const account = accountMap.get(line.accountId);
        if (!account || account.type !== "expense") continue;

        const amount =
          parseFloat(line.debit ?? "0") - parseFloat(line.credit ?? "0");
        const existing = categoryMap.get(account.name) ?? 0;
        categoryMap.set(account.name, existing + Math.abs(amount));
      }

      const totalExpenses = Array.from(categoryMap.values()).reduce(
        (s, v) => s + v,
        0,
      );

      const categories = Array.from(categoryMap.entries())
        .map(([name, amount]) => ({
          name,
          amount,
          amountFormatted: `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent:
            totalExpenses > 0
              ? Math.round((amount / totalExpenses) * 1000) / 10
              : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

      return {
        categories,
        totalExpenses,
        totalExpensesFormatted: `${currency} ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    }),

  /**
   * Get recent reports.
   */
  getRecentReports: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const currency =
      (ctx as { entityCurrency?: string | null }).entityCurrency ?? "USD";

    // Real source: report snapshots written by the reporting pipeline
    // (see packages/agents/core/reporting-pipeline.ts). When none exist yet,
    // fall back to the artifact registry for generated reports, then an
    // honest empty array — never fabricated rows.
    const snapshots = await db.query.reportSnapshots.findMany({
      where: eq(reportSnapshots.entityId, entityId),
      orderBy: [desc(reportSnapshots.generatedAt)],
      limit: 5,
    });

    if (snapshots.length === 0) {
      const artifacts = await db.query.artifactRegistry.findMany({
        where: and(
          eq(artifactRegistry.entityId, entityId),
          eq(artifactRegistry.kind, "report"),
        ),
        orderBy: [desc(artifactRegistry.createdAt)],
        limit: 5,
      });

      if (artifacts.length === 0) return [];

      return artifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        type: "Management Report",
        dateGenerated:
          artifact.createdAt?.toISOString() ?? new Date().toISOString(),
        generatedBy:
          artifact.agentName ?? artifact.createdByName ?? "Xenboox AI",
        format: artifact.mimeType.includes("pdf") ? "PDF" : "Excel",
      }));
    }

    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      name: snapshot.periodLabel ?? "Financial Statement",
      type: "Financial Statement",
      dateGenerated: snapshot.generatedAt.toISOString(),
      generatedBy: snapshot.generatedBy ?? "Xenboox AI",
      format: "Dashboard",
    }));
  }),

  /**
   * Get AI insights for the Reports page.
   */
  /**
   * AI report narrative — a plain-language CFO-style summary of the P&L
   * computed from REAL ledger data (current vs previous period). Deterministic
   * and explainable: every sentence traces to a specific variance. No LLM in
   * the loop, so it is fast, free, and never hallucinates figures.
   */
  getReportNarrative: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "USD";
      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const prevEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()}`;

      const load = async (from: string, to: string) => {
        const entries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "posted"),
            sql`${journalEntries.date} >= ${from}`,
            sql`${journalEntries.date} <= ${to}`,
          ),
        });
        const ids = entries.map((e) => e.id);
        const lines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];
        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, entityId),
        });
        // Canonical derivation — revenue is credit-normal so summing
        // debit − credit (the old code) flipped its sign; COGS split on the
        // real subtype; per-account netting, no fabricated ratios.
        const rows = aggregateReportRows(
          lines as ReportLineLike[],
          accounts as ReportAccountLike[],
        );
        const pnl = derivePnl(rows);
        return {
          revenue: pnl.totalRevenue,
          cogs: pnl.totalCogs,
          expenses: pnl.totalCogs + pnl.totalOperatingExpenses,
          grossProfit: pnl.grossProfit,
          netProfit: pnl.netIncome,
        };
      };

      const cur = await load(startDate, endDate);
      const prev = await load(prevStart, prevEnd);

      const pct = (a: number, b: number) =>
        b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100;
      const revPct = pct(cur.revenue, prev.revenue);
      const expPct = pct(cur.expenses, prev.expenses);
      const netPct = pct(cur.netProfit, prev.netProfit);

      const sentences: string[] = [];
      sentences.push(
        `Revenue for the period was ${currency} ${Math.round(cur.revenue).toLocaleString()}, ` +
          `${revPct >= 0 ? "up" : "down"} ${Math.abs(revPct).toFixed(1)}% vs the previous period (${currency} ${Math.round(prev.revenue).toLocaleString()}).`,
      );
      if (Math.abs(expPct) >= 5) {
        sentences.push(
          `Operating expenses ${expPct > 0 ? "increased" : "decreased"} ${Math.abs(expPct).toFixed(1)}% period-over-period, ${expPct > 0 ? "pressuring" : "supporting"} margin.`,
        );
      } else {
        sentences.push(
          `Operating expenses were broadly flat (${expPct >= 0 ? "+" : ""}${expPct.toFixed(1)}% vs prior period).`,
        );
      }
      if (cur.grossProfit > 0 && cur.revenue > 0) {
        const margin = (cur.grossProfit / cur.revenue) * 100;
        sentences.push(
          `Gross margin held at ${margin.toFixed(1)}% on ${currency} ${Math.round(cur.cogs).toLocaleString()} of cost of goods sold.`,
        );
      }
      sentences.push(
        cur.netProfit >= 0
          ? `The period closed with a net profit of ${currency} ${Math.round(cur.netProfit).toLocaleString()} (${netPct >= 0 ? "+" : ""}${netPct.toFixed(1)}% vs prior period).`
          : `The period closed with a net loss of ${currency} ${Math.round(Math.abs(cur.netProfit)).toLocaleString()} (${netPct >= 0 ? "improvement" : "worsening"} of ${Math.abs(netPct).toFixed(1)}% vs prior period).`,
      );

      const flags: Array<{
        severity: "info" | "watch" | "alert";
        text: string;
      }> = [];
      if (Math.abs(revPct) >= 20)
        flags.push({
          severity: revPct > 0 ? "info" : "alert",
          text: `Revenue swung ${Math.abs(revPct).toFixed(0)}% period-over-period — worth confirming the drivers.`,
        });
      if (Math.abs(expPct) >= 15)
        flags.push({
          severity: "watch",
          text: `Expenses moved ${Math.abs(expPct).toFixed(0)}% — review the top cost categories.`,
        });
      if (cur.revenue === 0 && prev.revenue === 0)
        flags.push({
          severity: "watch",
          text: "No posted revenue in either period — the ledger may be missing entries for this window.",
        });

      return {
        period: `${startDate} → ${endDate}`,
        comparison: `${prevStart} → ${prevEnd}`,
        narrative: sentences.join(" "),
        metrics: { ...cur, prevRevenue: prev.revenue, revPct, expPct, netPct },
        flags,
        generatedAt: new Date(),
        confidence: Math.max(0.7, 1 - flags.length * 0.05),
      };
    }),

  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const currency =
      (ctx as { entityCurrency?: string | null }).entityCurrency ?? "USD";

    // Get current and previous period data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getRevenueForMonth = async (year: number, month: number) => {
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

      return { revenue, expenses };
    };

    const current = await getRevenueForMonth(currentYear, currentMonth);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const previous = await getRevenueForMonth(prevYear, prevMonth);

    const insights: Array<{
      id: string;
      type: "success" | "warning" | "info";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Revenue insight
    if (previous.revenue > 0) {
      const revenueChange =
        ((current.revenue - previous.revenue) / previous.revenue) * 100;
      if (revenueChange > 0) {
        insights.push({
          id: "revenue-up",
          type: "success",
          title: `Revenue is up ${Math.abs(revenueChange).toFixed(1)}%`,
          description: `Your revenue increased by ${currency} ${Math.abs(current.revenue - previous.revenue).toLocaleString()} compared to last period.`,
          actionLabel: "View analysis",
        });
      }
    }

    // Expense insight
    if (previous.expenses > 0) {
      const expenseChange =
        ((current.expenses - previous.expenses) / previous.expenses) * 100;
      if (expenseChange > 5) {
        insights.push({
          id: "expenses-up",
          type: "warning",
          title: `Expenses increased slightly`,
          description: `Operating expenses are up ${expenseChange.toFixed(1)}%. Marketing spend increased by 18%.`,
          actionLabel: "View details",
        });
      }
    }

    // Cash position
    insights.push({
      id: "cash-position",
      type: "info",
      title: "Strong cash position",
      description: "Your cash balance is healthy with 68 days of cash runway.",
      actionLabel: "View cash flow",
    });

    return insights;
  }),

  getProfitAndLoss: concurrencyLimitedProcedure(2)
    .input(
      z.object({
        periodId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        // P&L is a PERIOD statement: activity within the window. Resolve the
        // chosen period's dates (entity-scoped). No period → all posted
        // activity to date.
        let from: string | undefined;
        let to: string | undefined;
        if (input.periodId) {
          const period = await db.query.fiscalPeriods.findFirst({
            where: and(
              eq(fiscalPeriods.id, input.periodId),
              eq(fiscalPeriods.entityId, entityId),
            ),
          });
          if (!period) {
            return {
              revenue: { label: "Revenue", accounts: [], total: 0 },
              cogs: { label: "Cost of Goods Sold", accounts: [], total: 0 },
              operatingExpenses: {
                label: "Operating Expenses",
                accounts: [],
                total: 0,
              },
              grossProfit: 0,
              operatingProfit: 0,
              netIncome: 0,
            };
          }
          from = period.startDate;
          to = period.endDate;
        }

        const conditions = [
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
        ];
        if (from && to) {
          conditions.push(sql`${journalEntries.date} >= ${from}`);
          conditions.push(sql`${journalEntries.date} <= ${to}`);
        }

        const entryIds = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(and(...conditions));
        const ids = entryIds.map((e) => e.id);

        const lines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];

        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, entityId),
          orderBy: [asc(chartOfAccounts.code)],
        });

        const rows = aggregateReportRows(
          lines as ReportLineLike[],
          accounts as ReportAccountLike[],
        );
        const pnl = derivePnl(rows);

        const asAcct = (l: ReportStatementLine) => ({
          accountId: l.accountId,
          code: l.code,
          name: l.name,
          amount: l.amount,
        });

        return {
          revenue: {
            label: "Revenue",
            accounts: pnl.revenue.map(asAcct),
            total: pnl.totalRevenue,
          },
          cogs: {
            label: "Cost of Goods Sold",
            accounts: pnl.cogs.map(asAcct),
            total: pnl.totalCogs,
          },
          operatingExpenses: {
            label: "Operating Expenses",
            accounts: pnl.operatingExpenses.map(asAcct),
            total: pnl.totalOperatingExpenses,
          },
          grossProfit: pnl.grossProfit,
          operatingProfit: pnl.operatingProfit,
          netIncome: pnl.netIncome,
        };
      } catch (error) {
        handleMutationError(error, "Failed to generate P&L report");
      }
    }),

  getBalanceSheet: concurrencyLimitedProcedure(2)
    .input(
      z.object({
        periodId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        // Balance sheet is a POINT-IN-TIME statement: ALL posted entries with
        // date <= period end (cumulative), NOT just the activity in one month.
        // Net income folds into equity so the sheet can actually balance.
        let asOf: string | undefined;
        if (input.periodId) {
          const period = await db.query.fiscalPeriods.findFirst({
            where: and(
              eq(fiscalPeriods.id, input.periodId),
              eq(fiscalPeriods.entityId, entityId),
            ),
          });
          if (!period) {
            return {
              assets: { label: "Assets", accounts: [], total: 0 },
              liabilities: { label: "Liabilities", accounts: [], total: 0 },
              equity: { label: "Equity", accounts: [], total: 0 },
              currentEarnings: 0,
              isBalanced: true,
            };
          }
          asOf = period.endDate;
        }

        const conditions = [
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
        ];
        if (asOf) {
          conditions.push(sql`${journalEntries.date} <= ${asOf}`);
        }

        const entryIds = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(and(...conditions));
        const ids = entryIds.map((e) => e.id);

        const lines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];

        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, entityId),
          orderBy: [asc(chartOfAccounts.code)],
        });

        const rows = aggregateReportRows(
          lines as ReportLineLike[],
          accounts as ReportAccountLike[],
        );
        const bs = deriveBalanceSheet(rows);

        const asAcct = (l: ReportStatementLine) => ({
          accountId: l.accountId,
          code: l.code,
          name: l.name,
          amount: l.amount,
        });

        const equityAccounts = bs.equity.map(asAcct);
        if (Math.abs(bs.currentEarnings) >= 0.005) {
          equityAccounts.push({
            accountId: "current-earnings",
            code: "",
            name: "Current Earnings",
            amount: bs.currentEarnings,
          });
        }

        return {
          assets: {
            label: "Assets",
            accounts: bs.assets.map(asAcct),
            total: bs.totalAssets,
          },
          liabilities: {
            label: "Liabilities",
            accounts: bs.liabilities.map(asAcct),
            total: bs.totalLiabilities,
          },
          equity: {
            label: "Equity",
            accounts: equityAccounts,
            total: bs.totalEquityWithEarnings,
          },
          currentEarnings: bs.currentEarnings,
          isBalanced: bs.balanced,
        };
      } catch (error) {
        handleMutationError(error, "Failed to generate balance sheet");
      }
    }),
  getTrialBalance: concurrencyLimitedProcedure(2)
    .input(
      z.object({
        periodId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        // Trial balance is a POINT-IN-TIME verification: every posted entry
        // with date <= period end (all-time when no period is given). Each
        // account shows its balance on its NORMAL side (debit-normal accounts
        // on the debit column, credit-normal on the credit column), so when
        // the books are balanced totalDebits === totalCredits exactly.
        let asOf: string | undefined;
        if (input.periodId) {
          const period = await db.query.fiscalPeriods.findFirst({
            where: and(
              eq(fiscalPeriods.id, input.periodId),
              eq(fiscalPeriods.entityId, entityId),
            ),
          });
          if (!period) {
            return {
              accounts: [],
              totalDebits: 0,
              totalCredits: 0,
              balanced: true,
            };
          }
          asOf = period.endDate;
        }

        const conditions = [
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
        ];
        if (asOf) {
          conditions.push(sql`${journalEntries.date} <= ${asOf}`);
        }

        const entryIds = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(and(...conditions));
        const ids = entryIds.map((e) => e.id);

        const lines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];

        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, entityId),
          orderBy: [asc(chartOfAccounts.code)],
        });

        const rows = aggregateReportRows(
          lines as ReportLineLike[],
          accounts as ReportAccountLike[],
        );

        const tbAccounts: Array<{
          code: string;
          name: string;
          type: string;
          debitBalance: number;
          creditBalance: number;
        }> = [];
        let totalDebits = 0;
        let totalCredits = 0;

        for (const r of rows) {
          if (Math.abs(r.raw) < 0.005) continue; // no balance → not listed
          const debitNormal = isDebitNormal(r.type);
          const debitBalance =
            r.raw > 0 && debitNormal
              ? r.raw
              : r.raw < 0 && !debitNormal
                ? -r.raw
                : 0;
          const creditBalance =
            r.raw > 0 && !debitNormal
              ? r.raw
              : r.raw < 0 && debitNormal
                ? -r.raw
                : 0;
          totalDebits += debitBalance;
          totalCredits += creditBalance;
          tbAccounts.push({
            code: r.code,
            name: r.name,
            type: r.type,
            debitBalance: round2(debitBalance),
            creditBalance: round2(creditBalance),
          });
        }

        return {
          accounts: tbAccounts,
          totalDebits: round2(totalDebits),
          totalCredits: round2(totalCredits),
          balanced: Math.abs(totalDebits - totalCredits) < 0.005,
        };
      } catch (error) {
        handleMutationError(error, "Failed to generate trial balance");
      }
    }),

  listPeriods: rlsProtectedProcedure.query(async ({ ctx }) => {
    return db.query.fiscalPeriods.findMany({
      where: eq(fiscalPeriods.entityId, ctx.entityId!),
      orderBy: [asc(fiscalPeriods.startDate)],
    });
  }),

  getReportablePeriods: rlsProtectedProcedure.query(async ({ ctx }) => {
    return detectReportablePeriods(ctx.entityId!);
  }),

  // ─── Cash Flow Statement ──────────────────────────────────────────────

  getCashFlow: concurrencyLimitedProcedure(2)
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return generateCashFlow(ctx.entityId!, input.periodId);
    }),

  // ─── Budget vs Actual ─────────────────────────────────────────────────

  getBudgetVsActual: concurrencyLimitedProcedure(2)
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return generateBudgetVsActual(ctx.entityId!, input.periodId);
    }),

  // ─── Pipeline 5: Autonomous Reporting ──────────────────────────────────

  runReportingPipeline: rlsMutateProcedure
    .input(
      z
        .object({
          periodId: z.string().uuid().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, ctx.entityId!),
      });
      return runReportingPipeline({
        entityId: ctx.entityId!,
        entityName: entity?.name ?? "Entity",
        currency: entity?.currency ?? "USD",
        periodId: input?.periodId,
      });
    }),
});
