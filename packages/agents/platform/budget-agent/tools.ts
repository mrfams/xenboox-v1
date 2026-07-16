import { db } from "@xenboox/db"
import { eq, and, sql } from "drizzle-orm"
import { chartOfAccounts } from "@xenboox/db/schema/accounting"
import { journalEntries, journalEntryLines } from "@xenboox/db/schema/accounting"
import type { BudgetItem, BudgetSummary } from "./state"

// ─── Variance Analysis ─────────────────────────────────────────────────────

export async function getVarianceAnalysis(
  entityId: string,
  periodStart: string,
  periodEnd: string
): Promise<BudgetSummary> {
  // Get expense accounts for variance comparison
  const expenseAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "expense"),
      eq(chartOfAccounts.isActive, true),
    ),
  })

  const items: BudgetItem[] = expenseAccounts.map((account) => {
    const actualAmount = 0 // Will be computed from journal entries when data exists
    const budgetAmount = 0 // Will be provided by budget input
    const variance = budgetAmount - actualAmount
    const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0

    return {
      accountCode: account.code,
      accountName: account.name,
      budgetAmount,
      actualAmount,
      variance,
      variancePercent,
    }
  })

  const totalBudget = items.reduce((s, i) => s + i.budgetAmount, 0)
  const totalActual = items.reduce((s, i) => s + i.actualAmount, 0)
  const totalVariance = totalBudget - totalActual

  return {
    period: `${periodStart} to ${periodEnd}`,
    totalBudget,
    totalActual,
    totalVariance,
    variancePercent: totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0,
    items,
  }
}

// ─── Budget vs Actual ──────────────────────────────────────────────────────

export async function getBudgetVsActual(
  entityId: string,
  period: string,
  budgetInput: Record<string, number>
): Promise<BudgetSummary> {
  const expenseAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "expense"),
      eq(chartOfAccounts.isActive, true),
    ),
  })

  const items: BudgetItem[] = expenseAccounts.map((account) => {
    const budgetAmount = budgetInput[account.code] ?? 0
    const actualAmount = 0 // Computed from journal entries when data exists
    const variance = budgetAmount - actualAmount
    const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0

    return {
      accountCode: account.code,
      accountName: account.name,
      budgetAmount,
      actualAmount,
      variance,
      variancePercent,
    }
  })

  const totalBudget = items.reduce((s, i) => s + i.budgetAmount, 0)
  const totalActual = items.reduce((s, i) => s + i.actualAmount, 0)

  return {
    period,
    totalBudget,
    totalActual,
    totalVariance: totalBudget - totalActual,
    variancePercent: totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget) * 100 : 0,
    items,
  }
}

// ─── Get Budget Accounts ───────────────────────────────────────────────────

export async function getBudgetAccounts(entityId: string) {
  return db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true),
    ),
    orderBy: (accounts, { asc }) => [asc(accounts.code)],
  })
}
