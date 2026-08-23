import { db } from "@xenboox/db";
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
): Promise<Array<{ project: typeof donorProjects.$inferSelect; period: string }>> {
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
function calculateCurrentPeriod(
  now: Date,
  cadence: string,
): string {
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

  const lineAccountIds = [...new Set(budgetLinesList.map((l) => l.accountId))];
  const lineAccounts =
    lineAccountIds.length > 0
      ? await db.query.chartOfAccounts.findMany({
          where: inArray(chartOfAccounts.id, lineAccountIds),
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

  // Accounts with actuals but no budget line → flag as unbudgeted spend
  for (const [accountId, actual] of actualByAccount) {
    if (coveredAccounts.has(accountId)) continue;
    if (Math.abs(actual) < 0.01) continue;
    const account = lineAccountMap.get(accountId);
    lines.push({
      accountId,
      accountCode: account?.code ?? "???",
      accountName: account?.name ?? "Unknown",
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
  const accounts = await db.query.chartOfAccounts.findMany({
    where: inArray(chartOfAccounts.id, accountIds),
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const revenueAccounts = new Map<
    string,
    { code: string; name: string; total: number }
  >();
  const expenseAccounts = new Map<
    string,
    { code: string; name: string; total: number }
  >();

  for (const line of allLines) {
    const account = accountMap.get(line.accountId);
    if (!account || account.entityId !== entityId) continue;

    const amount = Number(line.credit) - Number(line.debit);

    if (account.type === "revenue") {
      const existing = revenueAccounts.get(account.id);
      if (existing) {
        existing.total += amount;
      } else {
        revenueAccounts.set(account.id, {
          code: account.code,
          name: account.name,
          total: amount,
        });
      }
    } else if (account.type === "expense") {
      const existing = expenseAccounts.get(account.id);
      if (existing) {
        existing.total += Math.abs(amount);
      } else {
        expenseAccounts.set(account.id, {
          code: account.code,
          name: account.name,
          total: Math.abs(amount),
        });
      }
    }
  }

  const revenueByAccount = Array.from(revenueAccounts.entries()).map(
    ([accountId, data]) => ({
      accountId,
      accountCode: data.code,
      accountName: data.name,
      amount: data.total,
    }),
  );

  const expensesByAccount = Array.from(expenseAccounts.entries()).map(
    ([accountId, data]) => ({
      accountId,
      accountCode: data.code,
      accountName: data.name,
      amount: data.total,
    }),
  );

  const revenue = revenueByAccount.reduce((sum, a) => sum + a.amount, 0);
  const expenses = expensesByAccount.reduce((sum, a) => sum + a.amount, 0);

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    revenueByAccount,
    expensesByAccount,
  };
}

// ─── Balance Sheet ─────────────────────────────────────────────────────────

export async function generateBalanceSheet(
  entityId: string,
): Promise<BalanceSheet> {
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
  });

  const accountBalances = new Map<string, number>();

  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id);
    const allLines = await db.query.journalEntryLines.findMany({
      where: inArray(journalEntryLines.journalEntryId, entryIds),
    });

    for (const line of allLines) {
      const current = accountBalances.get(line.accountId) ?? 0;
      accountBalances.set(
        line.accountId,
        current + Number(line.debit) - Number(line.credit),
      );
    }
  }

  const assetsByAccount: {
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number;
  }[] = [];
  const liabilitiesByAccount: {
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number;
  }[] = [];
  const equityByAccount: {
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number;
  }[] = [];

  for (const account of accounts) {
    const balance = accountBalances.get(account.id) ?? 0;
    if (balance === 0) continue;

    const entry = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      amount: Math.abs(balance),
    };

    if (account.type === "asset") {
      assetsByAccount.push(entry);
    } else if (account.type === "liability") {
      liabilitiesByAccount.push(entry);
    } else if (account.type === "equity") {
      equityByAccount.push(entry);
    }
  }

  const assets = assetsByAccount.reduce((sum, a) => sum + a.amount, 0);
  const liabilities = liabilitiesByAccount.reduce(
    (sum, a) => sum + a.amount,
    0,
  );
  const equity = equityByAccount.reduce((sum, a) => sum + a.amount, 0);

  return {
    assets,
    liabilities,
    equity,
    assetsByAccount,
    liabilitiesByAccount,
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

// ─── Narrative ─────────────────────────────────────────────────────────────

export function generateNarrative(
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
  };
}
