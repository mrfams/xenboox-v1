import { db } from "@xenboox/db";
import {
  aggregateReportRows,
  deriveBalanceSheet,
  derivePnl,
  type ReportLineLike,
  type ReportAccountLike,
  type ReportStatementLine,
} from "@xenboox/db/lib";
import { eq, and, inArray } from "drizzle-orm";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import {
  budgets,
  budgetLines,
  budgetAlertThresholds,
} from "@xenboox/db/schema/budget";
import {
  donorProjects,
  donorReportSnapshots,
} from "@xenboox/db/schema/donor-grant";
import { callModel } from "@xenboox/models";
import { langfuse } from "../../core/langfuse";
import {
  redactPii,
  INJECTION_DEFENSE_SUFFIX,
} from "../../core/security/injection-defense";
import { checkRateLimit } from "../../core/rate-limiter";
import {
  getCachedNarrative,
  setCachedNarrative,
} from "../../core/narrative-cache";
import { saveNarrativeHistory } from "@xenboox/db/schema/analytics";
import type {
  ProfitAndLoss,
  BalanceSheet,
  TrialBalance,
  Narrative,
  CashFlow,
  CashFlowLine,
  BudgetVsActual,
  BudgetVsActualLine,
} from "./state";

// ─── Account Classification (Cash Flow) ────────────────────────────────────

const CASH_SUBTYPES = new Set(["cash", "bank_account"]);
const REVENUE_SUBTYPES = new Set([
  "sales_revenue",
  "service_revenue",
  "other_income",
  "interest_income",
]);
const EXPENSE_SUBTYPES = new Set([
  "cost_of_goods_sold",
  "operating_expense",
  "payroll_expense",
  "tax_expense",
  "depreciation",
  "interest_expense",
  "other_expense",
]);
const INVESTING_SUBTYPES = new Set(["fixed_asset"]);
const FINANCING_SUBTYPES = new Set([
  "current_liability",
  "long_term_liability",
  "owner_equity",
  "retained_earnings",
  "current_year_earnings",
]);

// ─── Period Ordering Helper ────────────────────────────────────────────────

interface PeriodOrder {
  year: number;
  month: number;
  order: number;
}

/** Map every fiscal period of an entity to a chronological order index. */
async function getPeriodOrderMap(
  entityId: string,
): Promise<Map<string, PeriodOrder>> {
  const periods = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.entityId, entityId),
  });

  const sorted = periods
    .map((p) => ({ id: p.id, year: p.year, month: p.month }))
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const map = new Map<string, PeriodOrder>();
  sorted.forEach((p, idx) => {
    map.set(p.id, { year: p.year, month: p.month, order: idx });
  });
  return map;
}

// ─── Cash Flow Statement ───────────────────────────────────────────────────

/**
 * Direct-method cash flow statement for a fiscal period.
 *
 * Classification:
 *   - Operating: revenue/expense accounts + changes in AR/AP
 *   - Investing: fixed-asset purchases/disposals
 *   - Financing: borrowings, equity injections/repayments
 *   - Cash: opening/closing balances from cash & bank accounts
 */
export async function generateCashFlow(
  entityId: string,
  periodId: string,
): Promise<CashFlow> {
  const targetPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });

  if (!targetPeriod) {
    throw new Error(`Fiscal period ${periodId} not found for entity`);
  }

  const periodOrderMap = await getPeriodOrderMap(entityId);
  const target = periodOrderMap.get(periodId);
  if (!target) {
    throw new Error(`Fiscal period ${periodId} has no ordering`);
  }

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
  });

  if (entries.length === 0) {
    return emptyCashFlow(target);
  }

  const entryIds = entries.map((e) => e.id);
  const allLines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
  });
  if (allLines.length === 0) {
    return emptyCashFlow(target);
  }

  const accountIds = [...new Set(allLines.map((l) => l.accountId))];
  const accounts = await db.query.chartOfAccounts.findMany({
    where: inArray(chartOfAccounts.id, accountIds),
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Chronological position per entry
  const entryPeriodOrder = new Map<string, number>();
  for (const entry of entries) {
    const p = periodOrderMap.get(entry.periodId);
    if (p) entryPeriodOrder.set(entry.id, p.order);
  }

  const operating = new Map<string, CashFlowLine>();
  const investing = new Map<string, CashFlowLine>();
  const financing = new Map<string, CashFlowLine>();
  let openingCash = 0;
  let closingCash = 0;

  for (const line of allLines) {
    const account = accountMap.get(line.accountId);
    if (!account || account.entityId !== entityId) continue;

    const entryOrder = entryPeriodOrder.get(line.journalEntryId);
    if (entryOrder === undefined) continue;

    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    const net = credit - debit;
    const isTargetPeriod = entryOrder === target.order;

    // Cash accounts feed opening/closing balances (all periods up to target)
    if (account.type === "asset" && CASH_SUBTYPES.has(account.subtype)) {
      if (entryOrder <= target.order) closingCash += debit - credit;
      if (entryOrder < target.order) openingCash += debit - credit;
      continue;
    }

    if (!isTargetPeriod) continue; // flows only count in the target period

    const lineItem = (bucket: Map<string, CashFlowLine>, amount: number) => {
      const existing = bucket.get(account.id);
      if (existing) {
        existing.amount += amount;
      } else {
        bucket.set(account.id, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          amount,
        });
      }
    };

    if (REVENUE_SUBTYPES.has(account.subtype)) {
      lineItem(operating, net); // credits = cash in
    } else if (EXPENSE_SUBTYPES.has(account.subtype)) {
      lineItem(operating, net); // debits = cash out (net is negative)
    } else if (account.subtype === "accounts_receivable") {
      // Decrease in AR = cash in
      lineItem(operating, net);
    } else if (account.subtype === "accounts_payable") {
      // Increase in AP = cash in
      lineItem(operating, net);
    } else if (INVESTING_SUBTYPES.has(account.subtype)) {
      lineItem(investing, net);
    } else if (FINANCING_SUBTYPES.has(account.subtype)) {
      lineItem(financing, net);
    }
  }

  const toBucket = (bucket: Map<string, CashFlowLine>) => {
    const lines = Array.from(bucket.values()).sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
    );
    return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  };

  const operatingBucket = toBucket(operating);
  const investingBucket = toBucket(investing);
  const financingBucket = toBucket(financing);
  const netCashChange =
    operatingBucket.total + investingBucket.total + financingBucket.total;

  return {
    period: `${target.year}-${String(target.month).padStart(2, "0")}`,
    openingCash,
    closingCash,
    netCashChange,
    operating: operatingBucket,
    investing: investingBucket,
    financing: financingBucket,
  };
}

// ─── Donor Report Generation ───────────────────────────────────────────────

export interface DonorReportResult {
  projectId: string;
  projectName: string;
  period: string;
  budgetVsActual: {
    categories: Array<{
      category: string;
      budgeted: number;
      actual: number;
      variance: number;
      variancePct: number;
    }>;
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePct: number;
  };
  narrativeSummary: string;
  snapshotId: string;
}

/**
 * Generate a donor report for a specific project and period.
 *
 * Calculates budget vs actual from the project's budget allocation,
 * generates a narrative summary, and creates a report snapshot.
 */
export async function generateDonorReport(
  entityId: string,
  projectId: string,
  period: string,
): Promise<DonorReportResult> {
  const project = await db.query.donorProjects.findFirst({
    where: and(
      eq(donorProjects.id, projectId),
      eq(donorProjects.entityId, entityId),
    ),
  });

  if (!project) {
    throw new Error(`Donor project ${projectId} not found for entity`);
  }

  // Get budget allocation from project
  const budgetAllocation =
    (project.budgetAllocation as Record<string, number>) ?? {};

  // TODO: Calculate actuals from journal entries scoped to this project
  // For now, use budget allocation as the baseline
  const categories = Object.entries(budgetAllocation).map(
    ([category, budgeted]) => ({
      category,
      budgeted,
      actual: 0,
      variance: -budgeted,
      variancePct: -100,
    }),
  );

  const totalBudgeted = Object.values(budgetAllocation).reduce(
    (sum, v) => sum + v,
    0,
  );

  const budgetVsActual = {
    categories,
    totalBudgeted,
    totalActual: 0,
    totalVariance: -totalBudgeted,
    totalVariancePct: totalBudgeted > 0 ? -100 : 0,
  };

  // Generate narrative summary
  const narrativeSummary = generateDonorNarrative(
    project.projectName,
    project.reportingFormat,
    budgetVsActual,
  );

  // Create report snapshot
  const [snapshot] = await db
    .insert(donorReportSnapshots)
    .values({
      entityId,
      donorProjectId: projectId,
      period,
      budgetVsActual,
      narrativeSummary,
      status: "draft",
      generatedBy: "reporting-agent",
    })
    .returning();

  return {
    projectId,
    projectName: project.projectName,
    period,
    budgetVsActual,
    narrativeSummary,
    snapshotId: snapshot.id,
  };
}

/**
 * Generate a narrative summary for a donor report.
 */
function generateDonorNarrative(
  projectName: string,
  reportingFormat: string,
  budgetVsActual: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    categories: Array<{ category: string; budgeted: number; actual: number }>;
  },
): string {
  const parts: string[] = [];

  parts.push(
    `${projectName} — ${reportingFormat.toUpperCase()} format report.`,
  );

  if (budgetVsActual.totalBudgeted > 0) {
    const utilizationPct =
      (budgetVsActual.totalActual / budgetVsActual.totalBudgeted) * 100;
    parts.push(
      `Total budget: ${budgetVsActual.totalBudgeted.toLocaleString()}. Utilization: ${utilizationPct.toFixed(1)}%.`,
    );
  }

  if (budgetVsActual.totalVariance < 0) {
    parts.push(
      `Underspend of ${Math.abs(budgetVsActual.totalVariance).toLocaleString()} across all categories.`,
    );
  } else if (budgetVsActual.totalVariance > 0) {
    parts.push(
      `Overspend of ${budgetVsActual.totalVariance.toLocaleString()} across all categories.`,
    );
  }

  const topCategories = budgetVsActual.categories
    .filter((c) => c.budgeted > 0)
    .sort((a, b) => b.budgeted - a.budgeted)
    .slice(0, 3);

  if (topCategories.length > 0) {
    parts.push(
      `Largest budget categories: ${topCategories.map((c) => `${c.category} (${c.budgeted.toLocaleString()})`).join(", ")}.`,
    );
  }

  return parts.join(" ");
}

/**
 * Find donor projects that have reports due based on their reporting cadence.
 */
export async function findProjectsDueForReport(
  entityId: string,
): Promise<
  Array<{ project: typeof donorProjects.$inferSelect; period: string }>
> {
  const projects = await db.query.donorProjects.findMany({
    where: and(
      eq(donorProjects.entityId, entityId),
      eq(donorProjects.status, "active"),
    ),
  });

  const now = new Date();
  const results: Array<{
    project: typeof donorProjects.$inferSelect;
    period: string;
  }> = [];

  for (const project of projects) {
    const cadence = project.reportingCadence ?? "quarterly";
    const period = calculateCurrentPeriod(now, cadence);

    // Check if a report already exists for this period
    const existing = await db.query.donorReportSnapshots.findFirst({
      where: and(
        eq(donorReportSnapshots.donorProjectId, project.id),
        eq(donorReportSnapshots.period, period),
      ),
    });

    if (!existing) {
      results.push({ project, period });
    }
  }

  return results;
}

/**
 * Calculate the current period string based on reporting cadence.
 */
function calculateCurrentPeriod(now: Date, cadence: string): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (cadence) {
    case "monthly":
      return `${year}-${String(month).padStart(2, "0")}`;
    case "quarterly": {
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    }
    case "semi_annual": {
      const half = month <= 6 ? 1 : 2;
      return `${year}-H${half}`;
    }
    case "annual":
      return `${year}`;
    default:
      return `${year}-${String(month).padStart(2, "0")}`;
  }
}

function emptyCashFlow(target: { year: number; month: number }): CashFlow {
  return {
    period: `${target.year}-${String(target.month).padStart(2, "0")}`,
    openingCash: 0,
    closingCash: 0,
    netCashChange: 0,
    operating: { total: 0, lines: [] },
    investing: { total: 0, lines: [] },
    financing: { total: 0, lines: [] },
  };
}

// ─── Budget vs Actual ──────────────────────────────────────────────────────

const MONTH_COLUMNS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/**
 * Budget vs Actual variance report for a fiscal period.
 * Budgeted amounts come from the entity's active budget (monthly columns,
 * falling back to annual/12). Actuals come from posted journal entries.
 */
export async function generateBudgetVsActual(
  entityId: string,
  periodId: string,
): Promise<BudgetVsActual> {
  const targetPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });
  if (!targetPeriod) {
    throw new Error(`Fiscal period ${periodId} not found for entity`);
  }

  const activeBudget = await db.query.budgets.findFirst({
    where: and(eq(budgets.entityId, entityId), eq(budgets.status, "active")),
    orderBy: (budgets: any, { desc }: any) => [desc(budgets.fiscalYear)],
  });

  const periodLabel = `${targetPeriod.year}-${String(targetPeriod.month).padStart(2, "0")}`;
  const monthColumn = MONTH_COLUMNS[targetPeriod.month - 1] ?? "jan";

  // ── Actuals from journal entries in the target period ───────────────
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
      eq(journalEntries.status, "posted"),
    ),
  });

  const actualByAccount = new Map<string, number>();
  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id);
    const lines = await db.query.journalEntryLines.findMany({
      where: inArray(journalEntryLines.journalEntryId, entryIds),
    });

    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = await db.query.chartOfAccounts.findMany({
      where: inArray(chartOfAccounts.id, accountIds),
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    for (const line of lines) {
      const account = accountMap.get(line.accountId);
      if (!account || account.entityId !== entityId) continue;
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const current = actualByAccount.get(line.accountId) ?? 0;
      if (account.type === "expense" || account.type === "asset") {
        actualByAccount.set(line.accountId, current + debit - credit);
      } else {
        actualByAccount.set(line.accountId, current + credit - debit);
      }
    }
  }

  // ── Budget lines with monthly amounts ───────────────────────────────
  const budgetLinesList =
    activeBudget && activeBudget.fiscalYear === targetPeriod.year
      ? await db.query.budgetLines.findMany({
          where: eq(budgetLines.budgetId, activeBudget.id),
        })
      : [];

  // Load accounts for BOTH budget lines and actuals so unbudgeted spend rows
  // resolve real account codes/names (previously they rendered "Unknown").
  const neededAccountIds = [
    ...new Set([
      ...budgetLinesList.map((l) => l.accountId),
      ...actualByAccount.keys(),
    ]),
  ];
  const lineAccounts =
    neededAccountIds.length > 0
      ? await db.query.chartOfAccounts.findMany({
          where: inArray(chartOfAccounts.id, neededAccountIds),
        })
      : [];
  const lineAccountMap = new Map(lineAccounts.map((a) => [a.id, a]));

  // Alert thresholds (defaults: approach at 80%, exceed at 100%)
  const thresholds = await db.query.budgetAlertThresholds.findMany({
    where: eq(budgetAlertThresholds.entityId, entityId),
  });
  const thresholdByLine = new Map(thresholds.map((t) => [t.budgetLineId, t]));
  const approachingPct = Number(thresholds[0]?.approachingPct) || 80;
  const exceededPct = Number(thresholds[0]?.exceededPct) || 100;

  const lines: BudgetVsActualLine[] = [];
  const coveredAccounts = new Set<string>();

  for (const line of budgetLinesList) {
    if (!line.isActive) continue;
    coveredAccounts.add(line.accountId);

    const account = lineAccountMap.get(line.accountId);
    const monthlyValue = (line as any)[monthColumn];
    const budgeted =
      monthlyValue != null
        ? Number(monthlyValue)
        : Number(line.annualAmount) / 12;
    const actual = actualByAccount.get(line.accountId) ?? 0;
    const variance = actual - budgeted;
    const variancePct =
      budgeted !== 0 ? (variance / budgeted) * 100 : actual !== 0 ? 100 : 0;

    const lineThreshold =
      thresholdByLine.get(line.id) ??
      thresholdByLine.get(line.accountId) ??
      null;
    const approach = Number(lineThreshold?.approachingPct) || approachingPct;
    const exceed = Number(lineThreshold?.exceededPct) || exceededPct;
    const absPct = Math.abs(variancePct);
    const status: BudgetVsActualLine["status"] =
      budgeted === 0 && actual === 0
        ? "on_track"
        : absPct >= exceed
          ? "exceeded"
          : absPct >= approach
            ? "approaching"
            : "on_track";

    lines.push({
      accountId: line.accountId,
      accountCode: account?.code ?? "???",
      accountName: account?.name ?? line.lineDescription ?? "Unknown",
      budgetedAmount: budgeted,
      actualAmount: actual,
      variance,
      variancePct: Math.round(variancePct * 100) / 100,
      status,
    });
  }

  // Accounts with actuals but no budget line → flag as unbudgeted spend.
  // Budget-vs-actual is an income-statement comparison: only revenue/expense
  // accounts count. Cash/AR/AP movements (balance-sheet accounts) must NOT be
  // surfaced as unbudgeted "spend" — they would pollute every variance total.
  for (const [accountId, actual] of actualByAccount) {
    if (coveredAccounts.has(accountId)) continue;
    if (Math.abs(actual) < 0.01) continue;
    const account = lineAccountMap.get(accountId);
    if (!account) continue;
    if (account.type !== "revenue" && account.type !== "expense") continue;
    lines.push({
      accountId,
      accountCode: account.code ?? "???",
      accountName: account.name ?? "Unknown",
      budgetedAmount: 0,
      actualAmount: actual,
      variance: actual,
      variancePct: 0,
      status: "no_budget",
    });
  }

  const totalBudgeted = lines.reduce((s, l) => s + l.budgetedAmount, 0);
  const totalActual = lines.reduce((s, l) => s + l.actualAmount, 0);
  const totalVariance = totalActual - totalBudgeted;

  return {
    period: periodLabel,
    fiscalYear: targetPeriod.year,
    budgetName: activeBudget?.name ?? "No active budget",
    totalBudgeted,
    totalActual,
    totalVariance,
    totalVariancePct:
      totalBudgeted !== 0
        ? Math.round((totalVariance / totalBudgeted) * 10000) / 100
        : 0,
    lines,
  };
}

// ─── Profit & Loss ─────────────────────────────────────────────────────────

export async function generateProfitLoss(
  entityId: string,
  periodId: string,
): Promise<ProfitAndLoss> {
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
      eq(journalEntries.status, "posted"),
    ),
  });

  if (entries.length === 0) {
    return {
      revenue: 0,
      expenses: 0,
      netProfit: 0,
      revenueByAccount: [],
      expensesByAccount: [],
    };
  }

  const entryIds = entries.map((e) => e.id);
  const allLines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
  });

  const accountIds = [...new Set(allLines.map((l) => l.accountId))];
  const accounts = (await db.query.chartOfAccounts.findMany({
    where: and(
      inArray(chartOfAccounts.id, accountIds),
      eq(chartOfAccounts.entityId, entityId),
    ),
  })) as unknown as ReportAccountLike[];

  // Canonical derivation (P9-A): per-account netting — the old code took
  // Math.abs per line, so a reversal (credit on an expense account) INFLATED
  // expenses instead of netting against them.
  const rows = aggregateReportRows(allLines as ReportLineLike[], accounts);
  const pnl = derivePnl(rows);

  const revenueByAccount: ProfitAndLoss["revenueByAccount"] = pnl.revenue.map(
    (l) => ({
      accountId: l.accountId,
      accountCode: l.code,
      accountName: l.name,
      amount: Math.abs(l.amount),
    }),
  );

  const expensesByAccount: ProfitAndLoss["expensesByAccount"] = [
    ...pnl.cogs,
    ...pnl.operatingExpenses,
  ].map((l) => ({
    accountId: l.accountId,
    accountCode: l.code,
    accountName: l.name,
    amount: Math.abs(l.amount),
  }));

  const revenue = pnl.totalRevenue;
  const expenses = pnl.totalCogs + pnl.totalOperatingExpenses;

  return {
    revenue,
    expenses,
    netProfit: pnl.netIncome,
    revenueByAccount,
    expensesByAccount,
  };
}

// ─── Balance Sheet ─────────────────────────────────────────────────────────

export async function generateBalanceSheet(
  entityId: string,
): Promise<BalanceSheet> {
  // Canonical derivation (P9-A): all posted entries to date, normal-balance
  // display signs, and current earnings folded into equity. The previous
  // implementation took Math.abs per account and never folded earnings, so
  // Assets − (Liabilities + Equity) could never be ≈ 0 for a profitable
  // entity.
  const accounts = (await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true),
    ),
  })) as unknown as ReportAccountLike[];

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
  });

  const allLines =
    entries.length > 0
      ? await db.query.journalEntryLines.findMany({
          where: inArray(
            journalEntryLines.journalEntryId,
            entries.map((e) => e.id),
          ),
        })
      : [];

  const rows = aggregateReportRows(allLines as ReportLineLike[], accounts);
  const bs = deriveBalanceSheet(rows);

  const mapRows = (
    list: ReportStatementLine[],
  ): BalanceSheet["assetsByAccount"] =>
    list.map((l) => ({
      accountId: l.accountId,
      accountCode: l.code,
      accountName: l.name,
      amount: Math.abs(l.amount),
    }));

  const equityByAccount = mapRows(bs.equity);
  if (Math.abs(bs.currentEarnings) >= 0.005) {
    equityByAccount.push({
      accountId: "current-earnings",
      accountCode: "",
      accountName: "Current Earnings",
      amount: Math.abs(bs.currentEarnings),
    });
  }

  return {
    assets: bs.totalAssets,
    liabilities: bs.totalLiabilities,
    equity: bs.totalEquityWithEarnings,
    assetsByAccount: mapRows(bs.assets),
    liabilitiesByAccount: mapRows(bs.liabilities),
    equityByAccount,
  };
}

// ─── Trial Balance ─────────────────────────────────────────────────────────

export async function generateTrialBalance(
  entityId: string,
  periodId: string,
): Promise<TrialBalance> {
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
      eq(journalEntries.status, "posted"),
    ),
  });

  if (entries.length === 0) {
    return { accounts: [], totalDebits: 0, totalCredits: 0, balanced: true };
  }

  const entryIds = entries.map((e) => e.id);
  const allLines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
  });

  const accountIds = [...new Set(allLines.map((l) => l.accountId))];
  const accounts = await db.query.chartOfAccounts.findMany({
    where: inArray(chartOfAccounts.id, accountIds),
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const accountData = new Map<
    string,
    { code: string; name: string; debit: number; credit: number }
  >();

  for (const line of allLines) {
    const existing = accountData.get(line.accountId);
    if (existing) {
      existing.debit += Number(line.debit);
      existing.credit += Number(line.credit);
    } else {
      const acc = accountMap.get(line.accountId);
      accountData.set(line.accountId, {
        code: acc?.code ?? "???",
        name: acc?.name ?? "Unknown",
        debit: Number(line.debit),
        credit: Number(line.credit),
      });
    }
  }

  const resultAccounts = Array.from(accountData.entries()).map(
    ([accountId, data]) => ({
      accountId,
      accountCode: data.code,
      accountName: data.name,
      debitBalance: data.debit,
      creditBalance: data.credit,
    }),
  );

  const totalDebits = resultAccounts.reduce((s, a) => s + a.debitBalance, 0);
  const totalCredits = resultAccounts.reduce((s, a) => s + a.creditBalance, 0);

  return {
    accounts: resultAccounts,
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.01,
  };
}

// ─── Circuit Breaker for LLM API ──────────────────────────────────────────
const circuitBreaker = {
  failures: 0,
  lastFailureTime: 0,
  state: "closed" as "closed" | "open" | "half-open",
  threshold: 5,
  resetTimeoutMs: 60000,

  recordSuccess() {
    this.failures = 0;
    this.state = "closed";
  },

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  },

  canExecute() {
    if (this.state === "closed") return true;
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "half-open";
        return true;
      }
      return false;
    }
    return true; // half-open allows one request
  },
};

// ─── Narrative (LLM-Powered) ───────────────────────────────────────────────

// ─── Helper: Format Amount ─────────────────────────────────────────────────
function formatAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 1_000_000_000) {
    return `${sign}${currency} ${(absAmount / 1_000_000_000).toFixed(1)}B`;
  } else if (absAmount >= 1_000_000) {
    return `${sign}${currency} ${(absAmount / 1_000_000).toFixed(1)}M`;
  } else if (absAmount >= 1_000) {
    return `${sign}${currency} ${(absAmount / 1_000).toFixed(1)}K`;
  } else {
    return `${sign}${currency} ${absAmount.toLocaleString()}`;
  }
}

// ─── Helper: Build P&L Context ────────────────────────────────────────────
function buildPnlContext(pnl: ProfitAndLoss, currency: string): string[] {
  const parts: string[] = [];
  parts.push("=== Profit & Loss ===");

  // Handle zero revenue
  if (pnl.revenue === 0) {
    parts.push(`Revenue: ${currency} 0 (no revenue recorded this period)`);
  } else {
    parts.push(`Revenue: ${formatAmount(pnl.revenue, currency)}`);
  }

  // Handle zero expenses
  if (pnl.expenses === 0) {
    parts.push(`Expenses: ${currency} 0 (no expenses recorded this period)`);
  } else {
    parts.push(`Expenses: ${formatAmount(pnl.expenses, currency)}`);
  }

  parts.push(`Net Profit: ${formatAmount(pnl.netProfit, currency)}`);

  // Handle profit margin (avoid division by zero)
  if (pnl.revenue > 0) {
    const margin = ((pnl.netProfit / pnl.revenue) * 100).toFixed(1);
    parts.push(`Profit Margin: ${margin}%`);
  } else if (pnl.revenue < 0) {
    parts.push(`Profit Margin: N/A (negative revenue)`);
  } else {
    parts.push(`Profit Margin: N/A (no revenue)`);
  }
  parts.push("");

  // Revenue by account (handle missing names)
  parts.push("Revenue by account:");
  for (const acc of pnl.revenueByAccount.slice(0, 5)) {
    const accountName = acc.accountName || "Unknown Account";
    const safeName = sanitizeForInjection(redactPii(accountName).text);
    parts.push(
      `  - ${safeName} (${acc.accountCode}): ${formatAmount(acc.amount, currency)}`,
    );
  }
  parts.push("");

  // Expenses by account (handle missing names)
  parts.push("Expenses by account:");
  for (const acc of pnl.expensesByAccount.slice(0, 5)) {
    const accountName = acc.accountName || "Unknown Account";
    const safeName = sanitizeForInjection(redactPii(accountName).text);
    parts.push(
      `  - ${safeName} (${acc.accountCode}): ${formatAmount(acc.amount, currency)}`,
    );
  }
  parts.push("");
  return parts;
}

// ─── Helper: Build Cash vs Non-Cash Context ───────────────────────────────
function buildCashVsNonCashContext(
  pnl: ProfitAndLoss,
  currency: string,
): string[] {
  const parts: string[] = [];
  const depreciationExpenses = pnl.expensesByAccount.filter(
    (acc) =>
      acc.accountName.toLowerCase().includes("depreciation") ||
      acc.accountName.toLowerCase().includes("amortization"),
  );
  const totalDepreciation = depreciationExpenses.reduce(
    (sum, acc) => sum + acc.amount,
    0,
  );

  if (totalDepreciation > 0) {
    parts.push("Cash vs Non-Cash Analysis:");
    parts.push(
      `  Non-cash expenses (depreciation/amortization): ${formatAmount(totalDepreciation, currency)}`,
    );
    parts.push(`  Cash expenses: ${formatAmount(pnl.expenses, currency)}`);
    parts.push(
      `  Operating cash flow (approx): ${formatAmount(pnl.netProfit + totalDepreciation, currency)}`,
    );
    parts.push("");
  }
  return parts;
}

// ─── Helper: Build Balance Sheet Context ───────────────────────────────────
function buildBalanceSheetContext(
  bs: BalanceSheet,
  currency: string,
): string[] {
  const parts: string[] = [];
  parts.push("=== Balance Sheet ===");
  parts.push(`Total Assets: ${formatAmount(bs.assets, currency)}`);
  parts.push(`Total Liabilities: ${formatAmount(bs.liabilities, currency)}`);
  parts.push(`Total Equity: ${formatAmount(bs.equity, currency)}`);
  parts.push("");
  parts.push("Assets by account:");
  for (const acc of bs.assetsByAccount.slice(0, 5)) {
    const accountName = acc.accountName || "Unknown Account";
    const safeName = sanitizeForInjection(redactPii(accountName).text);
    parts.push(
      `  - ${safeName} (${acc.accountCode}): ${formatAmount(acc.amount, currency)}`,
    );
  }
  parts.push("");
  return parts;
}

// ─── Helper: Build Trial Balance Context ───────────────────────────────────
function buildTrialBalanceContext(
  tb: TrialBalance,
  currency: string,
): string[] {
  const parts: string[] = [];
  parts.push("=== Trial Balance ===");
  parts.push(`Total Debits: ${formatAmount(tb.totalDebits, currency)}`);
  parts.push(`Total Credits: ${formatAmount(tb.totalCredits, currency)}`);
  parts.push(`Balanced: ${tb.balanced ? "Yes" : "No"}`);
  parts.push("");
  return parts;
}

// ─── Helper: Build Cash Flow Context ───────────────────────────────────────
function buildCashFlowContext(cf: CashFlow, currency: string): string[] {
  const parts: string[] = [];
  parts.push("=== Cash Flow ===");
  parts.push(`Opening Cash: ${formatAmount(cf.openingCash, currency)}`);
  parts.push(`Closing Cash: ${formatAmount(cf.closingCash, currency)}`);
  parts.push(`Net Cash Change: ${formatAmount(cf.netCashChange, currency)}`);
  parts.push("");
  return parts;
}

// ─── Helper: Build Budget vs Actual Context ────────────────────────────────
function buildBudgetVsActualContext(
  bva: BudgetVsActual,
  currency: string,
): string[] {
  const parts: string[] = [];
  parts.push("=== Budget vs Actual ===");
  parts.push(`Total Budgeted: ${formatAmount(bva.totalBudgeted, currency)}`);
  parts.push(`Total Actual: ${formatAmount(bva.totalActual, currency)}`);
  parts.push(
    `Variance: ${formatAmount(bva.totalVariance, currency)} (${bva.totalVariancePct}%)`,
  );
  parts.push("");
  return parts;
}

// ─── Helper: Build Prior Period Context ────────────────────────────────────
function buildPriorPeriodContext(
  priorPeriodData: {
    profitAndLoss?: ProfitAndLoss | null;
    balanceSheet?: BalanceSheet | null;
  },
  reportData: {
    profitAndLoss: ProfitAndLoss | null;
    balanceSheet: BalanceSheet | null;
  },
  currency: string,
): string[] {
  const parts: string[] = [];

  if (priorPeriodData.profitAndLoss && reportData.profitAndLoss) {
    const priorPnl = priorPeriodData.profitAndLoss;
    parts.push("=== Period-over-Period Changes ===");

    const revenueChange = reportData.profitAndLoss.revenue - priorPnl.revenue;
    const revenueChangePct =
      priorPnl.revenue !== 0
        ? ((revenueChange / priorPnl.revenue) * 100).toFixed(1)
        : "N/A";
    parts.push(
      `Revenue Change: ${formatAmount(revenueChange, currency)} (${revenueChangePct}%)`,
    );

    const expenseChange = reportData.profitAndLoss.expenses - priorPnl.expenses;
    const expenseChangePct =
      priorPnl.expenses !== 0
        ? ((expenseChange / priorPnl.expenses) * 100).toFixed(1)
        : "N/A";
    parts.push(
      `Expense Change: ${formatAmount(expenseChange, currency)} (${expenseChangePct}%)`,
    );

    const profitChange =
      reportData.profitAndLoss.netProfit - priorPnl.netProfit;
    parts.push(`Profit Change: ${formatAmount(profitChange, currency)}`);

    const priorDepreciation = priorPnl.expensesByAccount
      .filter(
        (acc) =>
          acc.accountName.toLowerCase().includes("depreciation") ||
          acc.accountName.toLowerCase().includes("amortization"),
      )
      .reduce((sum, acc) => sum + acc.amount, 0);
    const currentDepreciation = reportData.profitAndLoss.expensesByAccount
      .filter(
        (acc) =>
          acc.accountName.toLowerCase().includes("depreciation") ||
          acc.accountName.toLowerCase().includes("amortization"),
      )
      .reduce((sum, acc) => sum + acc.amount, 0);

    if (priorDepreciation > 0 || currentDepreciation > 0) {
      const depreciationChange = currentDepreciation - priorDepreciation;
      parts.push(
        `Depreciation Change: ${formatAmount(depreciationChange, currency)}`,
      );
    }
    parts.push("");
  }

  if (priorPeriodData.balanceSheet && reportData.balanceSheet) {
    const priorBs = priorPeriodData.balanceSheet;
    parts.push("=== Balance Sheet Changes ===");

    const assetChange = reportData.balanceSheet.assets - priorBs.assets;
    parts.push(`Asset Change: ${formatAmount(assetChange, currency)}`);

    const liabilityChange =
      reportData.balanceSheet.liabilities - priorBs.liabilities;
    parts.push(`Liability Change: ${formatAmount(liabilityChange, currency)}`);

    const equityChange = reportData.balanceSheet.equity - priorBs.equity;
    parts.push(`Equity Change: ${formatAmount(equityChange, currency)}`);
    parts.push("");
  }

  return parts;
}

// ─── Helper: Centralized Redaction ─────────────────────────────────────────
function redactNarrativeFields(text: string): string {
  return redactPii(text).text;
}

function redactNarrativeArray(arr: string[]): string[] {
  return arr.map((item) => redactPii(item).text);
}

// ─── Helper: Sanitize Input Against Injection ──────────────────────────────
function sanitizeForInjection(text: string): string {
  // Remove common injection patterns
  let sanitized = text
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, "")
    .replace(/ignore\s+(all\s+)?prior\s+instructions/gi, "")
    .replace(/disregard\s+(all\s+)?previous\s+instructions/gi, "")
    .replace(/you\s+are\s+now\s+/gi, "you are ")
    .replace(/system:\s*/gi, "")
    .replace(/assistant:\s*/gi, "")
    .replace(/human:\s*/gi, "")
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/<\|system\|>/gi, "")
    .replace(/<\|user\|>/gi, "")
    .replace(/<\|assistant\|>/gi, "")
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/\n{3,}/g, "\n\n") // Limit newlines
    .trim();

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

// ─── Helper: Validate Report Data ──────────────────────────────────────────
function validateReportData(reportData: unknown): boolean {
  if (!reportData || typeof reportData !== "object") return false;
  const data = reportData as Record<string, unknown>;

  // Check for suspicious patterns in string values
  const suspiciousPatterns = [
    /ignore.*instructions/i,
    /you\s+are\s+now/i,
    /system:\s*/i,
    /<\|.*\|>/i,
    /```/,
  ];

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          console.error(
            `Suspicious pattern detected in report data field: ${key}`,
          );
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Build a structured data summary for the LLM prompt.
 * This extracts the key numbers from the report data.
 */
function buildNarrativeContext(
  entityName: string,
  reportData: {
    profitAndLoss: ProfitAndLoss | null;
    balanceSheet: BalanceSheet | null;
    trialBalance: TrialBalance | null;
    cashFlow?: CashFlow | null;
    budgetVsActual?: BudgetVsActual | null;
  },
  currency: string,
  priorPeriodData?: {
    profitAndLoss?: ProfitAndLoss | null;
    balanceSheet?: BalanceSheet | null;
  },
): string {
  const parts: string[] = [];

  parts.push(`Entity: ${sanitizeForInjection(entityName)}`);
  parts.push(`Currency: ${currency}`);
  parts.push("");

  if (reportData.profitAndLoss) {
    parts.push(...buildPnlContext(reportData.profitAndLoss, currency));
    parts.push(
      ...buildCashVsNonCashContext(reportData.profitAndLoss, currency),
    );
  }

  if (reportData.balanceSheet) {
    parts.push(...buildBalanceSheetContext(reportData.balanceSheet, currency));
  }

  if (reportData.trialBalance) {
    parts.push(...buildTrialBalanceContext(reportData.trialBalance, currency));
  }

  if (reportData.cashFlow) {
    parts.push(...buildCashFlowContext(reportData.cashFlow, currency));

    // Add cash flow analysis if we have balance sheet data
    if (reportData.balanceSheet) {
      const bs = reportData.balanceSheet;

      // Find AR and AP accounts
      const arAccounts = bs.assetsByAccount.filter(
        (acc) =>
          acc.accountName.toLowerCase().includes("receivable") ||
          acc.accountName.toLowerCase().includes("ar"),
      );
      const apAccounts = bs.liabilitiesByAccount.filter(
        (acc) =>
          acc.accountName.toLowerCase().includes("payable") ||
          acc.accountName.toLowerCase().includes("ap"),
      );

      const totalAR = arAccounts.reduce((sum, acc) => sum + acc.amount, 0);
      const totalAP = apAccounts.reduce((sum, acc) => sum + acc.amount, 0);

      if (totalAR > 0 || totalAP > 0) {
        parts.push("Cash Flow Analysis:");
        if (totalAR > 0) {
          parts.push(
            `  Accounts Receivable: ${formatAmount(totalAR, currency)} (customers owe you)`,
          );
        }
        if (totalAP > 0) {
          parts.push(
            `  Accounts Payable: ${formatAmount(totalAP, currency)} (you owe vendors)`,
          );
        }

        // Warn about cash flow vs profit disconnect
        if (reportData.profitAndLoss) {
          const profit = reportData.profitAndLoss.netProfit;
          if (profit > 0 && reportData.cashFlow.netCashChange < 0) {
            parts.push(
              `  WARNING: You made ${formatAmount(profit, currency)} profit but your cash decreased by ${formatAmount(Math.abs(reportData.cashFlow.netCashChange), currency)}`,
            );
            parts.push(
              `  This suggests customers are paying slowly (high AR) or you're paying vendors faster (low AP)`,
            );
          } else if (profit < 0 && reportData.cashFlow.netCashChange > 0) {
            parts.push(
              `  NOTE: You had a loss of ${formatAmount(Math.abs(profit), currency)} but cash increased by ${formatAmount(reportData.cashFlow.netCashChange, currency)}`,
            );
            parts.push(
              `  This may be due to collecting on old receivables or delaying payments`,
            );
          }
        }
        parts.push("");
      }
    }
  }

  if (reportData.budgetVsActual) {
    parts.push(
      ...buildBudgetVsActualContext(reportData.budgetVsActual, currency),
    );
  }

  if (priorPeriodData) {
    parts.push(
      ...buildPriorPeriodContext(priorPeriodData, reportData, currency),
    );
  }

  return parts.join("\n");
}

/**
 * LLM-powered narrative generation.
 * Generates plain-English explanations of financial changes.
 */
export async function generateNarrativeLLM(
  entityName: string,
  entityId: string,
  reportData: {
    profitAndLoss: ProfitAndLoss | null;
    balanceSheet: BalanceSheet | null;
    trialBalance: TrialBalance | null;
    cashFlow?: CashFlow | null;
    budgetVsActual?: BudgetVsActual | null;
  },
  currency: string,
  priorPeriodData?: {
    profitAndLoss?: ProfitAndLoss | null;
    balanceSheet?: BalanceSheet | null;
  },
): Promise<Narrative> {
  try {
    const trace = await langfuse.trace({
      name: "narrative-llm-generation",
      metadata: { entityId, entityName },
    });

    // Check cache first
    const cacheKey = `${entityId}:${JSON.stringify(reportData.profitAndLoss?.revenue ?? 0)}:${JSON.stringify(reportData.balanceSheet?.assets ?? 0)}`;
    const cached = await getCachedNarrative<{
      summary: string;
      highlights: string[];
      concerns: string[];
      action?: string;
      confidence: number;
      generatedAt: string;
      poweredBy: "llm" | "fallback";
    }>(entityId, cacheKey, "narrative");
    if (cached) {
      langfuse.event({ name: "narrative-cache-hit", metadata: { entityId } });
      return cached;
    }

    // Rate limit check
    const rateLimit = await checkRateLimit(entityId);
    if (!rateLimit.allowed) {
      langfuse.event({
        name: "narrative-rate-limited",
        metadata: { entityId, retryAfterMs: rateLimit.retryAfterMs },
      });
      return generateNarrativeFallback(entityName, reportData, currency);
    }

    // Validate report data for injection patterns
    if (!validateReportData(reportData)) {
      langfuse.event({
        name: "narrative-injection-detected",
        metadata: { entityId, entityName },
      });
      // Fall back to rule-based narrative
      return generateNarrativeFallback(entityName, reportData, currency);
    }

    const context = buildNarrativeContext(
      entityName,
      reportData,
      currency,
      priorPeriodData,
    );

    const safeEntityName = sanitizeForInjection(redactPii(entityName).text);

    const systemPrompt = `You are a financial analyst for ${safeEntityName}. Generate a plain-English financial narrative.

Rules:
1. Explain WHAT changed (headline) with specific numbers
2. Explain WHY it changed (root cause from the data)
3. Provide CONTEXT (how it compares to prior periods if data available)
4. Recommend an ACTION (what the user should do next)
5. Use professional but accessible tone
6. Keep it under 200 words
7. Never expose raw data without explanation
8. Never make assumptions not supported by the data
9. Reference specific accounts, vendors, customers when available
10. If trial balance is unbalanced, flag this as critical

Accounting Rules:
1. Distinguish between timing changes (revenue recognition, accruals) and actual performance changes
2. Apply matching principle — expenses should be analyzed in context of the revenue they generated
3. Separate cash expenses from non-cash expenses (depreciation, amortization)
4. Consider tax implications when recommending actions
5. Compare to same period last year when available (seasonality)
6. Analyze cash conversion cycle (DSO, DPO) when relevant
7. Warn about timing-related distortions in trends

Business Context:
1. Detect business stage: startup (high growth, potential losses), growth (increasing revenue/profit), mature (stable), or declining
2. Identify seasonal patterns — compare to same period last year
3. Highlight significant improvements (loss to profit, cost optimization)
4. Analyze cash flow separately from profitability
5. Warn about cash flow vs profit disconnect
6. Consider FX impact for multi-currency operations

Format your response as:
SUMMARY: [one-sentence headline with specific numbers]
HIGHLIGHTS: [2-3 positive findings with evidence]
CONCERNS: [1-2 areas of concern with severity]
ACTION: [specific recommendation with expected outcome]

${INJECTION_DEFENSE_SUFFIX}`;

    const userMessage = `Generate a financial narrative for this period:\n\n${context}`;

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      langfuse.event({
        name: "narrative-circuit-open",
        metadata: { entityId },
      });
      throw new Error("Circuit breaker open — LLM API unavailable");
    }

    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;
    const TIMEOUT_MS = 30000;

    let lastError: Error | null = null;
    let result: Awaited<ReturnType<typeof callModel>> | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Add timeout to the call
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("LLM call timeout")), TIMEOUT_MS);
        });

        const callPromise = callModel({
          agentName: "reporting-agent",
          taskType: "strategic_planning",
          entityId,
          systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          traceId: trace.id,
          maxTokens: 1024,
          temperature: 0.3,
        });

        result = await Promise.race([callPromise, timeoutPromise]);
        circuitBreaker.recordSuccess();
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        circuitBreaker.recordFailure();
        langfuse.event({
          name: "narrative-llm-retry",
          metadata: { entityId, attempt, error: lastError.message },
        });

        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS * attempt),
          );
        }
      }
    }

    if (!result) {
      throw lastError || new Error("LLM call failed after retries");
    }

    let content = result.content;

    // Validate response length
    const MAX_RESPONSE_LENGTH = 2000;
    if (content.length > MAX_RESPONSE_LENGTH) {
      content = content.substring(0, MAX_RESPONSE_LENGTH);
      langfuse.event({
        name: "narrative-response-truncated",
        metadata: {
          entityId,
          originalLength: result.content.length,
          truncatedLength: content.length,
        },
      });
    }

    // Parse the structured response
    const summaryMatch = content.match(/SUMMARY:\s*(.+?)(?=\n|$)/i);
    const highlightsMatch = content.match(
      /HIGHLIGHTS:\s*([\s\S]*?)(?=CONCERNS:|ACTION:|$)/i,
    );
    const concernsMatch = content.match(/CONCERNS:\s*([\s\S]*?)(?=ACTION:|$)/i);
    const actionMatch = content.match(/ACTION:\s*(.+?)(?=\n|$)/i);

    let summary =
      summaryMatch?.[1]?.trim() ||
      content.split("\n")[0] ||
      `${entityName} financial summary`;

    let highlightText = highlightsMatch?.[1]?.trim() || "";
    let highlights = highlightText
      .split("\n")
      .map((h) => h.replace(/^[-•*]\s*/, "").trim())
      .filter((h) => h.length > 0);

    let concernText = concernsMatch?.[1]?.trim() || "";
    let concerns = concernText
      .split("\n")
      .map((c) => c.replace(/^[-•*]\s*/, "").trim())
      .filter((c) => c.length > 0);

    let action = actionMatch?.[1]?.trim() || undefined;

    // Post-processing: Redact PII from LLM responses
    summary = redactPii(summary).text;
    highlights = highlights.map((h) => redactPii(h).text);
    concerns = concerns.map((c) => redactPii(c).text);
    if (action) action = redactPii(action).text;

    await trace.update({
      output: {
        summary: summary.substring(0, 200),
        highlightsCount: highlights.length,
        concernsCount: concerns.length,
        hasAction: !!action,
      },
    });

    langfuse.event({
      name: "narrative-generated",
      metadata: {
        entityId,
        provider: result.providerId,
        model: result.modelId,
        inputTokens: result.tokensUsed.input,
        outputTokens: result.tokensUsed.output,
      },
    });

    const narrativeResult = {
      summary,
      highlights,
      concerns,
      action,
      confidence: 0.88,
      generatedAt: new Date().toISOString(),
      poweredBy: "llm" as const,
    };

    // Cache the result (non-blocking)
    setCachedNarrative(entityId, cacheKey, "narrative", narrativeResult).catch(
      () => {},
    );

    // Save to history (non-blocking)
    saveNarrativeHistory(db, {
      entityId,
      narrativeType: "report",
      summary,
      highlights,
      concerns,
      action,
      confidence: 0.88,
      poweredBy: "llm",
      metadata: {
        provider: result.providerId,
        model: result.modelId,
        inputTokens: result.tokensUsed.input,
        outputTokens: result.tokensUsed.output,
      },
    }).catch((err) => {
      langfuse.event({
        name: "narrative-history-save-failed",
        metadata: { entityId, error: String(err) },
      });
    });

    return narrativeResult;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    langfuse.event({
      name: "narrative-llm-failed",
      metadata: { entityId, error: msg },
    });

    // Fallback to rule-based narrative
    return generateNarrativeFallback(entityName, reportData, currency);
  }
}

/**
 * Fallback rule-based narrative when LLM fails.
 * Kept for backward compatibility and graceful degradation.
 */
function generateNarrativeFallback(
  entityName: string,
  reportData: {
    profitAndLoss: ProfitAndLoss | null;
    balanceSheet: BalanceSheet | null;
    trialBalance: TrialBalance | null;
  },
  currency: string,
): Narrative {
  const highlights: string[] = [];
  const concerns: string[] = [];

  if (reportData.profitAndLoss) {
    const pnl = reportData.profitAndLoss;
    const netProfitStr = `${currency} ${pnl.netProfit.toLocaleString()}`;

    if (pnl.netProfit > 0) {
      highlights.push(`${entityName} reported a net profit of ${netProfitStr}`);
    } else if (pnl.netProfit < 0) {
      concerns.push(`${entityName} reported a net loss of ${netProfitStr}`);
    } else {
      concerns.push(`${entityName} broke even with zero net profit`);
    }

    if (pnl.revenue > 0) {
      const margin = ((pnl.netProfit / pnl.revenue) * 100).toFixed(1);
      highlights.push(`Net profit margin: ${margin}%`);
    }
  }

  if (reportData.balanceSheet) {
    const bs = reportData.balanceSheet;
    const assetsStr = `${currency} ${bs.assets.toLocaleString()}`;
    highlights.push(`Total assets: ${assetsStr}`);

    if (bs.liabilities > bs.assets) {
      concerns.push(
        `Liabilities exceed assets by ${currency} ${(bs.liabilities - bs.assets).toLocaleString()}`,
      );
    }
  }

  if (reportData.trialBalance) {
    const tb = reportData.trialBalance;
    if (!tb.balanced) {
      concerns.push(
        `Trial balance is unbalanced — debits ${currency} ${tb.totalDebits.toLocaleString()} ≠ credits ${currency} ${tb.totalCredits.toLocaleString()}`,
      );
    } else {
      highlights.push("Trial balance is balanced");
    }
  }

  const summaryParts: string[] = [];
  if (reportData.profitAndLoss) {
    summaryParts.push(
      `Revenue of ${currency} ${reportData.profitAndLoss.revenue.toLocaleString()} against expenses of ${currency} ${reportData.profitAndLoss.expenses.toLocaleString()}`,
    );
  }
  if (reportData.balanceSheet) {
    summaryParts.push(
      `Balance sheet shows ${currency} ${reportData.balanceSheet.assets.toLocaleString()} in assets`,
    );
  }

  return {
    summary:
      summaryParts.length > 0
        ? `${entityName} financial summary: ${summaryParts.join("; ")}.`
        : `${entityName} — no report data available to narrate.`,
    highlights,
    concerns,
    confidence: 0.75,
    generatedAt: new Date().toISOString(),
    poweredBy: "fallback",
  };
}

/**
 * @deprecated Use generateNarrativeLLM() instead.
 * Kept for backward compatibility.
 */
export function generateNarrative(
  entityName: string,
  reportData: {
    profitAndLoss: ProfitAndLoss | null;
    balanceSheet: BalanceSheet | null;
    trialBalance: TrialBalance | null;
  },
  currency: string,
): Narrative {
  return generateNarrativeFallback(entityName, reportData, currency);
}
