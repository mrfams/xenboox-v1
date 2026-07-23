import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { chartOfAccounts } from "@xenboox/db/schema/accounting";
import type { FinancialRatio, AnalyticsSummary } from "./state";

// ─── Financial Ratios ──────────────────────────────────────────────────────

export async function getFinancialRatios(
  entityId: string,
): Promise<FinancialRatio[]> {
  // Get account balances by type
  const assetAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "asset"),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  const liabilityAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "liability"),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  const equityAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "equity"),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  const revenueAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "revenue"),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  const expenseAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "expense"),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  // Compute totals (balances default to 0 until journal entries exist)
  const totalAssets = assetAccounts.reduce((s, _a) => s + 0, 0);
  const totalLiabilities = liabilityAccounts.reduce((s, _a) => s + 0, 0);
  const totalEquity = equityAccounts.reduce((s, _a) => s + 0, 0);
  const totalRevenue = revenueAccounts.reduce((s, _a) => s + 0, 0);
  const totalExpenses = expenseAccounts.reduce((s, _a) => s + 0, 0);

  const ratios: FinancialRatio[] = [
    {
      name: "Current Ratio",
      value: totalLiabilities > 0 ? totalAssets / totalLiabilities : 0,
      description: "Ability to pay short-term obligations",
      benchmark: "> 1.5",
      status:
        totalLiabilities > 0 && totalAssets / totalLiabilities >= 1.5
          ? "good"
          : "warning",
    },
    {
      name: "Debt-to-Equity",
      value: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
      description: "Financial leverage",
      benchmark: "< 2.0",
      status:
        totalEquity > 0 && totalLiabilities / totalEquity < 2.0
          ? "good"
          : "warning",
    },
    {
      name: "Net Profit Margin",
      value:
        totalRevenue > 0
          ? ((totalRevenue - totalExpenses) / totalRevenue) * 100
          : 0,
      description: "Profitability per unit of revenue",
      benchmark: "> 10%",
      status:
        totalRevenue > 0 &&
        ((totalRevenue - totalExpenses) / totalRevenue) * 100 >= 10
          ? "good"
          : "warning",
    },
    {
      name: "Return on Assets",
      value:
        totalAssets > 0
          ? ((totalRevenue - totalExpenses) / totalAssets) * 100
          : 0,
      description: "Efficiency in using assets",
      benchmark: "> 5%",
      status: "warning",
    },
    {
      name: "Working Capital",
      value: totalAssets - totalLiabilities,
      description: "Operating liquidity",
      benchmark: "> 0",
      status: totalAssets - totalLiabilities > 0 ? "good" : "critical",
    },
  ];

  return ratios;
}

// ─── KPI Dashboard ─────────────────────────────────────────────────────────

export async function getKpiDashboard(
  entityId: string,
): Promise<AnalyticsSummary> {
  const ratios = await getFinancialRatios(entityId);

  const insights: string[] = [];

  if (
    ratios.find((r) => r.name === "Current Ratio" && r.status === "warning")
  ) {
    insights.push("Current ratio below benchmark — review liquidity position");
  }
  if (
    ratios.find((r) => r.name === "Net Profit Margin" && r.status === "warning")
  ) {
    insights.push("Net profit margin below target — analyze cost structure");
  }

  return {
    period: new Date().toISOString().slice(0, 7),
    ratios,
    insights,
    kpis: {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      netIncome: 0,
    },
  };
}

// ─── Trend Analysis ────────────────────────────────────────────────────────

export async function getTrendAnalysis(
  entityId: string,
  periods: number = 6,
): Promise<AnalyticsSummary> {
  const ratios = await getFinancialRatios(entityId);

  return {
    period: `Last ${periods} periods`,
    ratios,
    insights: ["Trend analysis requires historical journal entry data"],
    kpis: {
      periodCount: periods,
    },
  };
}

// ─── Cash Flow Analysis ────────────────────────────────────────────────────

export async function getCashFlowAnalysis(
  entityId: string,
): Promise<AnalyticsSummary> {
  const ratios = await getFinancialRatios(entityId);

  return {
    period: new Date().toISOString().slice(0, 7),
    ratios: ratios.filter((r) =>
      ["Current Ratio", "Working Capital"].includes(r.name),
    ),
    insights: [
      "Cash flow analysis requires bank and cash account transaction data",
    ],
    kpis: {
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      netCashFlow: 0,
    },
  };
}
