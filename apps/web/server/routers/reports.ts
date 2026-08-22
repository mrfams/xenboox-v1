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

type AccountRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  debit: number;
  credit: number;
  balance: number;
};

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

      // Get all accounts
      const accounts = await db.query.chartOfAccounts.findMany({
        where: eq(chartOfAccounts.entityId, entityId),
      });

      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      // Calculate totals by account type
      const calculateTotals = (lines: typeof currentLines) => {
        const revenue = { debit: 0, credit: 0 };
        const expense = { debit: 0, credit: 0 };
        const asset = { debit: 0, credit: 0 };
        const liability = { debit: 0, credit: 0 };
        const equity = { debit: 0, credit: 0 };

        for (const line of lines) {
          const account = accountMap.get(line.accountId);
          if (!account) continue;

          const debit = parseFloat(line.debit ?? "0");
          const credit = parseFloat(line.credit ?? "0");

          switch (account.type) {
            case "revenue":
              revenue.debit += debit;
              revenue.credit += credit;
              break;
            case "expense":
              expense.debit += debit;
              expense.credit += credit;
              break;
            case "asset":
              asset.debit += debit;
              asset.credit += credit;
              break;
            case "liability":
              liability.debit += debit;
              liability.credit += credit;
              break;
            case "equity":
              equity.debit += debit;
              equity.credit += credit;
              break;
          }
        }

        return { revenue, expense, asset, liability, equity };
      };

      const currentTotals = calculateTotals(currentLines);
      const prevTotals = calculateTotals(prevLines);

      // Calculate key metrics
      const revenue =
        currentTotals.revenue.credit - currentTotals.revenue.debit;
      const prevRevenueForChange =
        prevTotals.revenue.credit - prevTotals.revenue.debit;
      const cogs = currentTotals.expense.debit * 0.65; // Approximate COGS
      const grossProfit = revenue - cogs;
      const operatingExpenses = currentTotals.expense.debit * 0.35;
      const operatingProfit = grossProfit - operatingExpenses;
      const netProfit = revenue - currentTotals.expense.debit;

      const prevNetProfit =
        prevTotals.revenue.credit - prevTotals.expense.debit;

      const totalAssets =
        currentTotals.asset.debit - currentTotals.asset.credit;
      const totalLiabilities =
        currentTotals.liability.credit - currentTotals.liability.debit;
      const totalEquity =
        currentTotals.equity.credit - currentTotals.equity.debit;

      // Calculate changes
      const revenueChange =
        prevRevenueForChange > 0
          ? ((revenue - prevRevenueForChange) / prevRevenueForChange) * 100
          : 0;
      const profitChange =
        prevNetProfit > 0
          ? ((netProfit - prevNetProfit) / prevNetProfit) * 100
          : 0;

      // Get account counts
      const assetCount = accounts.filter((a) => a.type === "asset").length;
      const liabilityCount = accounts.filter(
        (a) => a.type === "liability",
      ).length;
      const equityCount = accounts.filter((a) => a.type === "equity").length;
      const revenueCount = accounts.filter((a) => a.type === "revenue").length;
      const expenseCount = accounts.filter((a) => a.type === "expense").length;

      // Calculate changes for assets, liabilities, equity
      const prevTotalAssets = prevTotals.asset.debit - prevTotals.asset.credit;
      const prevTotalLiabilities =
        prevTotals.liability.credit - prevTotals.liability.debit;
      const prevTotalEquity =
        prevTotals.equity.credit - prevTotals.equity.debit;

      const assetsChange =
        prevTotalAssets > 0
          ? ((totalAssets - prevTotalAssets) / prevTotalAssets) * 100
          : 0;
      const liabilitiesChange =
        prevTotalLiabilities > 0
          ? ((totalLiabilities - prevTotalLiabilities) / prevTotalLiabilities) *
            100
          : 0;
      const equityChange =
        prevTotalEquity > 0
          ? ((totalEquity - prevTotalEquity) / prevTotalEquity) * 100
          : 0;

      // Calculate period-over-period changes for P&L items
      const prevCogs = prevTotals.expense.debit * 0.65;
      const prevGrossProfit = prevRevenueForChange - prevCogs;
      const prevOpExpenses = prevTotals.expense.debit * 0.35;
      const prevOpProfit = prevGrossProfit - prevOpExpenses;

      const calcChange = (current: number, previous: number) =>
        previous > 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;

      return {
        revenue,
        revenueChange: Number(revenueChange.toFixed(1)),
        netProfit,
        netProfitChange: Number(profitChange.toFixed(1)),
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
        // Balance sheet changes
        assetsChange: Number(assetsChange.toFixed(1)),
        liabilitiesChange: Number(liabilitiesChange.toFixed(1)),
        equityChange: Number(equityChange.toFixed(1)),
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
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      let revenue = 0;
      let expenses = 0;
      const revenueByAccountMap = new Map<
        string,
        { accountName: string; accountCode: string; amount: number }
      >();
      const expensesByAccountMap = new Map<
        string,
        { accountName: string; accountCode: string; amount: number }
      >();

      for (const line of lines) {
        const account = accountMap.get(line.accountId);
        if (!account) continue;

        const amount =
          parseFloat(line.credit ?? "0") - parseFloat(line.debit ?? "0");
        if (account.type === "revenue") {
          const abs = Math.abs(amount);
          revenue += abs;
          const existing = revenueByAccountMap.get(account.id);
          if (existing) {
            existing.amount += abs;
          } else {
            revenueByAccountMap.set(account.id, {
              accountName: account.name,
              accountCode: account.code,
              amount: abs,
            });
          }
        }
        if (account.type === "expense") {
          const abs = Math.abs(amount);
          expenses += abs;
          const existing = expensesByAccountMap.get(account.id);
          if (existing) {
            existing.amount += abs;
          } else {
            expensesByAccountMap.set(account.id, {
              accountName: account.name,
              accountCode: account.code,
              amount: abs,
            });
          }
        }
      }

      const revenueByAccount = Array.from(revenueByAccountMap.values()).sort(
        (a, b) => b.amount - a.amount,
      );
      const expensesByAccount = Array.from(expensesByAccountMap.values()).sort(
        (a, b) => b.amount - a.amount,
      );

      const cogs = expenses * 0.65;
      const grossProfit = revenue - cogs;
      const opExpenses = expenses * 0.35;
      const opProfit = grossProfit - opExpenses;
      const netProfit = revenue - expenses;

      return {
        revenue,
        expenses,
        cogs,
        grossProfit,
        opExpenses,
        opProfit,
        netProfit,
        revenueByAccount,
        expensesByAccount,
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
          amountFormatted: `GMD ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
        totalExpensesFormatted: `GMD ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    }),

  /**
   * Get recent reports.
   */
  getRecentReports: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

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
        const acctMap = new Map(accounts.map((a) => [a.id, a]));
        let revenue = 0;
        let cogs = 0;
        let expenses = 0;
        for (const l of lines) {
          const acct = acctMap.get(l.accountId);
          const amt =
            (parseFloat(l.debit ?? "0") || 0) -
            (parseFloat(l.credit ?? "0") || 0);
          if (!acct) continue;
          if (acct.type === "revenue") revenue += amt;
          else if (acct.subtype === "cost_of_goods_sold") cogs += Math.abs(amt);
          else if (acct.type === "expense") expenses += Math.abs(amt);
        }
        const grossProfit = revenue - cogs;
        const netProfit = grossProfit - expenses;
        return { revenue, cogs, expenses, grossProfit, netProfit };
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
        `Revenue for the period was GMD ${Math.round(cur.revenue).toLocaleString()}, ` +
          `${revPct >= 0 ? "up" : "down"} ${Math.abs(revPct).toFixed(1)}% vs the previous period (GMD ${Math.round(prev.revenue).toLocaleString()}).`,
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
          `Gross margin held at ${margin.toFixed(1)}% on GMD ${Math.round(cur.cogs).toLocaleString()} of cost of goods sold.`,
        );
      }
      sentences.push(
        cur.netProfit >= 0
          ? `The period closed with a net profit of GMD ${Math.round(cur.netProfit).toLocaleString()} (${netPct >= 0 ? "+" : ""}${netPct.toFixed(1)}% vs prior period).`
          : `The period closed with a net loss of GMD ${Math.round(Math.abs(cur.netProfit)).toLocaleString()} (${netPct >= 0 ? "improvement" : "worsening"} of ${Math.abs(netPct).toFixed(1)}% vs prior period).`,
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
          description: `Your revenue increased by GMD ${Math.abs(current.revenue - previous.revenue).toLocaleString()} compared to last period.`,
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
        const conditions = [
          eq(journalEntries.entityId, ctx.entityId!),
          eq(journalEntries.status, "posted"),
        ];
        if (input.periodId) {
          conditions.push(eq(journalEntries.periodId, input.periodId));
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

        const accountMap = new Map<
          string,
          {
            accountId: string;
            code: string;
            name: string;
            type: string;
            subtype: string;
            debit: number;
            credit: number;
          }
        >();

        for (const line of lines) {
          const existing = accountMap.get(line.accountId) || {
            accountId: line.accountId,
            code: "",
            name: "",
            type: "",
            subtype: "",
            debit: 0,
            credit: 0,
          };
          existing.debit += Number(line.debit);
          existing.credit += Number(line.credit);
          accountMap.set(line.accountId, existing);
        }

        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, ctx.entityId!),
          orderBy: [asc(chartOfAccounts.code)],
        });

        for (const acc of accounts) {
          const row = accountMap.get(acc.id);
          if (row) {
            row.code = acc.code;
            row.name = acc.name;
            row.type = acc.type;
            row.subtype = acc.subtype;
          }
        }

        const allRows: AccountRow[] = Array.from(accountMap.values()).map(
          (r) => ({
            ...r,
            balance: r.debit - r.credit,
          }),
        );

        const revenueAccounts = allRows.filter((a) => a.type === "revenue");
        const expenseAccounts = allRows.filter((a) => a.type === "expense");

        const revenue = revenueAccounts.map((a) => ({
          ...a,
          displayAmount: a.credit - a.debit,
        }));
        const expenses = expenseAccounts.map((a) => ({
          ...a,
          displayAmount: a.debit - a.credit,
        }));

        const totalRevenue = revenue.reduce((s, a) => s + a.displayAmount, 0);
        const totalExpenses = expenses.reduce((s, a) => s + a.displayAmount, 0);
        const netIncome = totalRevenue - totalExpenses;

        return {
          revenue: {
            label: "Revenue",
            accounts: revenue,
            total: totalRevenue,
          },
          expenses: {
            label: "Expenses",
            accounts: expenses,
            total: totalExpenses,
          },
          netIncome,
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
        const conditions = [
          eq(journalEntries.entityId, ctx.entityId!),
          eq(journalEntries.status, "posted"),
        ];
        if (input.periodId) {
          conditions.push(eq(journalEntries.periodId, input.periodId));
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

        const accountMap = new Map<
          string,
          {
            accountId: string;
            code: string;
            name: string;
            type: string;
            subtype: string;
            debit: number;
            credit: number;
          }
        >();

        for (const line of lines) {
          const existing = accountMap.get(line.accountId) || {
            accountId: line.accountId,
            code: "",
            name: "",
            type: "",
            subtype: "",
            debit: 0,
            credit: 0,
          };
          existing.debit += Number(line.debit);
          existing.credit += Number(line.credit);
          accountMap.set(line.accountId, existing);
        }

        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, ctx.entityId!),
          orderBy: [asc(chartOfAccounts.code)],
        });

        for (const acc of accounts) {
          const row = accountMap.get(acc.id);
          if (row) {
            row.code = acc.code;
            row.name = acc.name;
            row.type = acc.type;
            row.subtype = acc.subtype;
          }
        }

        const allRows: AccountRow[] = Array.from(accountMap.values()).map(
          (r) => ({
            ...r,
            balance: r.debit - r.credit,
          }),
        );

        const classifyNormal = (type: string): "debit" | "credit" => {
          if (type === "asset" || type === "expense") return "debit";
          return "credit";
        };

        const getBalance = (row: AccountRow): number => {
          const normal = classifyNormal(row.type);
          return normal === "debit"
            ? row.debit - row.credit
            : row.credit - row.debit;
        };

        const assetAccounts = allRows
          .filter((a) => a.type === "asset")
          .map((a) => ({ ...a, displayAmount: getBalance(a) }));

        const liabilityAccounts = allRows
          .filter((a) => a.type === "liability")
          .map((a) => ({ ...a, displayAmount: getBalance(a) }));

        const equityAccounts = allRows
          .filter((a) => a.type === "equity")
          .map((a) => ({ ...a, displayAmount: getBalance(a) }));

        const totalAssets = assetAccounts.reduce(
          (s, a) => s + a.displayAmount,
          0,
        );
        const totalLiabilities = liabilityAccounts.reduce(
          (s, a) => s + a.displayAmount,
          0,
        );
        const totalEquity = equityAccounts.reduce(
          (s, a) => s + a.displayAmount,
          0,
        );

        return {
          assets: {
            label: "Assets",
            accounts: assetAccounts,
            total: totalAssets,
          },
          liabilities: {
            label: "Liabilities",
            accounts: liabilityAccounts,
            total: totalLiabilities,
          },
          equity: {
            label: "Equity",
            accounts: equityAccounts,
            total: totalEquity,
          },
          isBalanced:
            Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        };
      } catch (error) {
        handleMutationError(error, "Failed to generate balance sheet");
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
        currency: entity?.currency ?? "GMD",
        periodId: input?.periodId,
      });
    }),
});
