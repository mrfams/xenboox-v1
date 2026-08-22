import { eq, and, sql, inArray } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema";

import { rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { MONTH_NAMES } from "./_helpers";

/**
 * Compares current period metrics to 6-month rolling average.
 * Flags any metric that deviates >1.5 standard deviations.
 */
export const detectAnomalies = rlsProtectedProcedure.query(async ({ ctx }) => {
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
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
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
    const zScore = (current.revenue - revenueStats.mean) / revenueStats.stdDev;
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
    const zScore = (current.expenses - expenseStats.mean) / expenseStats.stdDev;
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
});
