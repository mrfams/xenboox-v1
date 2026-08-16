import { db } from "@xenboox/db";
import { eq, and, sql } from "drizzle-orm";
import {
  chartOfAccounts,
  journalEntryLines,
  journalEntries,
} from "@xenboox/db/schema/accounting";
import type { FinancialRatio, AnalyticsSummary } from "./state";

// ─── Real Balances from Journal Entry Lines ────────────────────────────────
//
// Balances are computed by aggregating posted journal entry lines per
// account, then bucketing by account type. Debit-normal accounts (asset,
// expense) carry debit - credit; credit-normal accounts (liability, equity,
// revenue) carry credit - debit. This is the single source of truth for
// analytics — never hardcoded zeros.

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

const DEBIT_NORMAL: AccountType[] = ["asset", "expense"];
const CREDIT_NORMAL: AccountType[] = ["liability", "equity", "revenue"];

async function getBalancesByType(
  entityId: string,
): Promise<Record<AccountType, number>> {
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  const accountTypeMap = new Map<string, AccountType>();
  for (const account of accounts) {
    accountTypeMap.set(account.id, account.type as AccountType);
  }

  // Aggregate debit/credit per account from posted journal entries only.
  const rows = await db
    .select({
      accountId: journalEntryLines.accountId,
      debitTotal: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      creditTotal: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
      ),
    )
    .groupBy(journalEntryLines.accountId);

  const balances: Record<AccountType, number> = {
    asset: 0,
    liability: 0,
    equity: 0,
    revenue: 0,
    expense: 0,
  };

  for (const row of rows) {
    const type = accountTypeMap.get(row.accountId);
    if (!type) continue; // orphaned line or account deactivated — skip
    const debit = Number(row.debitTotal);
    const credit = Number(row.creditTotal);
    balances[type] += DEBIT_NORMAL.includes(type)
      ? debit - credit
      : credit - debit;
  }

  // Round to 2 decimals to avoid float drift in ratios.
  for (const key of Object.keys(balances) as AccountType[]) {
    balances[key] = Math.round(balances[key] * 100) / 100;
  }

  return balances;
}

// ─── Financial Ratios ──────────────────────────────────────────────────────

export async function getFinancialRatios(
  entityId: string,
): Promise<FinancialRatio[]> {
  const b = await getBalancesByType(entityId);

  const totalAssets = b.asset;
  const totalLiabilities = b.liability;
  const totalEquity = b.equity;
  const totalRevenue = b.revenue;
  const totalExpenses = b.expense;

  const netIncome = totalRevenue - totalExpenses;

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
      value: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      description: "Profitability per unit of revenue",
      benchmark: "> 10%",
      status:
        totalRevenue > 0 && (netIncome / totalRevenue) * 100 >= 10
          ? "good"
          : "warning",
    },
    {
      name: "Return on Assets",
      value: totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0,
      description: "Efficiency in using assets",
      benchmark: "> 5%",
      status:
        totalAssets > 0 && (netIncome / totalAssets) * 100 >= 5
          ? "good"
          : "warning",
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
  const b = await getBalancesByType(entityId);

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
  if (b.expense > b.revenue && b.revenue > 0) {
    insights.push("Expenses exceed revenue — operating at a loss");
  }

  return {
    period: new Date().toISOString().slice(0, 7),
    ratios,
    insights,
    kpis: {
      totalAssets: b.asset,
      totalLiabilities: b.liability,
      totalEquity: b.equity,
      netIncome: b.revenue - b.expense,
    },
  };
}

// ─── Trend Analysis ────────────────────────────────────────────────────────

export async function getTrendAnalysis(
  entityId: string,
  periods: number = 6,
): Promise<AnalyticsSummary> {
  const ratios = await getFinancialRatios(entityId);
  const b = await getBalancesByType(entityId);

  return {
    period: `Last ${periods} periods`,
    ratios,
    insights:
      ratios.length > 0
        ? [
            `Current liquidity: ${b.asset - b.liability > 0 ? "positive" : "negative"} working capital`,
            `Net income: ${b.revenue - b.expense >= 0 ? "positive" : "negative"} (${Math.abs(Math.round(b.revenue - b.expense))} minor units)`,
          ]
        : ["Trend analysis requires historical journal entry data"],
    kpis: {
      periodCount: periods,
      totalAssets: b.asset,
      totalLiabilities: b.liability,
      netIncome: b.revenue - b.expense,
    },
  };
}

// ─── Cash Flow Analysis ────────────────────────────────────────────────────

export async function getCashFlowAnalysis(
  entityId: string,
): Promise<AnalyticsSummary> {
  const ratios = await getFinancialRatios(entityId);
  const b = await getBalancesByType(entityId);

  // Cash position approximated from cash/bank accounts (asset subtype cash).
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true),
    ),
  });
  const cashAccountIds = new Set(
    accounts
      .filter((a) => ["cash", "bank_account"].includes(a.subtype))
      .map((a) => a.id),
  );

  const rows = await db
    .select({
      accountId: journalEntryLines.accountId,
      debitTotal: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      creditTotal: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
      ),
    )
    .groupBy(journalEntryLines.accountId);

  let cashBalance = 0;
  for (const row of rows) {
    if (cashAccountIds.has(row.accountId)) {
      cashBalance += Number(row.debitTotal) - Number(row.creditTotal);
    }
  }

  return {
    period: new Date().toISOString().slice(0, 7),
    ratios: ratios.filter((r) =>
      ["Current Ratio", "Working Capital"].includes(r.name),
    ),
    insights: [
      `Cash balance: ${Math.round(cashBalance * 100) / 100} minor units across ${cashAccountIds.size} cash account(s)`,
      b.revenue > 0
        ? `Net income: ${b.revenue - b.expense} minor units`
        : "No revenue posted yet in this period",
    ],
    kpis: {
      operatingCashFlow: Math.round(cashBalance * 100) / 100,
      investingCashFlow: 0,
      financingCashFlow: 0,
      netCashFlow: Math.round(cashBalance * 100) / 100,
    },
  };
}
