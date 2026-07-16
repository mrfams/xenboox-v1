import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting"
import type { ProfitAndLoss, BalanceSheet, TrialBalance, Narrative } from "./state"

// ─── Profit & Loss ─────────────────────────────────────────────────────────

export async function generateProfitLoss(
  entityId: string,
  periodId: string
): Promise<ProfitAndLoss> {
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
      eq(journalEntries.status, "posted")
    ),
  })

  const revenueAccounts = new Map<string, { code: string; name: string; total: number }>()
  const expenseAccounts = new Map<string, { code: string; name: string; total: number }>()

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    })

    for (const line of lines) {
      const account = await db.query.chartOfAccounts.findFirst({
        where: eq(chartOfAccounts.id, line.accountId),
      })
      if (!account || account.entityId !== entityId) continue

      const amount = Number(line.credit) - Number(line.debit)

      if (account.type === "revenue") {
        const existing = revenueAccounts.get(account.id)
        if (existing) {
          existing.total += amount
        } else {
          revenueAccounts.set(account.id, {
            code: account.code,
            name: account.name,
            total: amount,
          })
        }
      } else if (account.type === "expense") {
        const existing = expenseAccounts.get(account.id)
        if (existing) {
          existing.total += Math.abs(amount)
        } else {
          expenseAccounts.set(account.id, {
            code: account.code,
            name: account.name,
            total: Math.abs(amount),
          })
        }
      }
    }
  }

  const revenueByAccount = Array.from(revenueAccounts.entries()).map(
    ([accountId, data]) => ({
      accountId,
      accountCode: data.code,
      accountName: data.name,
      amount: data.total,
    })
  )

  const expensesByAccount = Array.from(expenseAccounts.entries()).map(
    ([accountId, data]) => ({
      accountId,
      accountCode: data.code,
      accountName: data.name,
      amount: data.total,
    })
  )

  const revenue = revenueByAccount.reduce((sum, a) => sum + a.amount, 0)
  const expenses = expensesByAccount.reduce((sum, a) => sum + a.amount, 0)

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    revenueByAccount,
    expensesByAccount,
  }
}

// ─── Balance Sheet ─────────────────────────────────────────────────────────

export async function generateBalanceSheet(
  entityId: string
): Promise<BalanceSheet> {
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true)
    ),
  })

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted")
    ),
  })

  const accountBalances = new Map<string, number>()

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    })
    for (const line of lines) {
      const current = accountBalances.get(line.accountId) ?? 0
      accountBalances.set(line.accountId, current + Number(line.debit) - Number(line.credit))
    }
  }

  const assetsByAccount: { accountId: string; accountCode: string; accountName: string; amount: number }[] = []
  const liabilitiesByAccount: { accountId: string; accountCode: string; accountName: string; amount: number }[] = []
  const equityByAccount: { accountId: string; accountCode: string; accountName: string; amount: number }[] = []

  for (const account of accounts) {
    const balance = accountBalances.get(account.id) ?? 0
    if (balance === 0) continue

    const entry = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      amount: Math.abs(balance),
    }

    if (account.type === "asset") {
      assetsByAccount.push(entry)
    } else if (account.type === "liability") {
      liabilitiesByAccount.push(entry)
    } else if (account.type === "equity") {
      equityByAccount.push(entry)
    }
  }

  const assets = assetsByAccount.reduce((sum, a) => sum + a.amount, 0)
  const liabilities = liabilitiesByAccount.reduce((sum, a) => sum + a.amount, 0)
  const equity = equityByAccount.reduce((sum, a) => sum + a.amount, 0)

  return {
    assets,
    liabilities,
    equity,
    assetsByAccount,
    liabilitiesByAccount,
    equityByAccount,
  }
}

// ─── Trial Balance ─────────────────────────────────────────────────────────

export async function generateTrialBalance(
  entityId: string,
  periodId: string
): Promise<TrialBalance> {
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
      eq(journalEntries.status, "posted")
    ),
  })

  const accountMap = new Map<
    string,
    { code: string; name: string; debit: number; credit: number }
  >()

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    })
    for (const line of lines) {
      const existing = accountMap.get(line.accountId)
      if (existing) {
        existing.debit += Number(line.debit)
        existing.credit += Number(line.credit)
      } else {
        const account = await db.query.chartOfAccounts.findFirst({
          where: eq(chartOfAccounts.id, line.accountId),
        })
        accountMap.set(line.accountId, {
          code: account?.code ?? "???",
          name: account?.name ?? "Unknown",
          debit: Number(line.debit),
          credit: Number(line.credit),
        })
      }
    }
  }

  const accounts = Array.from(accountMap.entries()).map(([accountId, data]) => ({
    accountId,
    accountCode: data.code,
    accountName: data.name,
    debitBalance: data.debit,
    creditBalance: data.credit,
  }))

  const totalDebits = accounts.reduce((s, a) => s + a.debitBalance, 0)
  const totalCredits = accounts.reduce((s, a) => s + a.creditBalance, 0)

  return {
    accounts,
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.01,
  }
}

// ─── Narrative ─────────────────────────────────────────────────────────────

export function generateNarrative(
  entityName: string,
  reportData: {
    profitAndLoss: ProfitAndLoss | null
    balanceSheet: BalanceSheet | null
    trialBalance: TrialBalance | null
  },
  currency: string
): Narrative {
  const highlights: string[] = []
  const concerns: string[] = []

  if (reportData.profitAndLoss) {
    const pnl = reportData.profitAndLoss
    const netProfitStr = `${currency} ${pnl.netProfit.toLocaleString()}`

    if (pnl.netProfit > 0) {
      highlights.push(`${entityName} reported a net profit of ${netProfitStr}`)
    } else if (pnl.netProfit < 0) {
      concerns.push(`${entityName} reported a net loss of ${netProfitStr}`)
    } else {
      concerns.push(`${entityName} broke even with zero net profit`)
    }

    if (pnl.revenue > 0) {
      const margin = ((pnl.netProfit / pnl.revenue) * 100).toFixed(1)
      highlights.push(`Net profit margin: ${margin}%`)
    }
  }

  if (reportData.balanceSheet) {
    const bs = reportData.balanceSheet
    const assetsStr = `${currency} ${bs.assets.toLocaleString()}`
    highlights.push(`Total assets: ${assetsStr}`)

    if (bs.liabilities > bs.assets) {
      concerns.push(`Liabilities exceed assets by ${currency} ${(bs.liabilities - bs.assets).toLocaleString()}`)
    }
  }

  if (reportData.trialBalance) {
    const tb = reportData.trialBalance
    if (!tb.balanced) {
      concerns.push(
        `Trial balance is unbalanced — debits ${currency} ${tb.totalDebits.toLocaleString()} ≠ credits ${currency} ${tb.totalCredits.toLocaleString()}`
      )
    } else {
      highlights.push("Trial balance is balanced")
    }
  }

  const summaryParts: string[] = []
  if (reportData.profitAndLoss) {
    summaryParts.push(
      `Revenue of ${currency} ${reportData.profitAndLoss.revenue.toLocaleString()} against expenses of ${currency} ${reportData.profitAndLoss.expenses.toLocaleString()}`
    )
  }
  if (reportData.balanceSheet) {
    summaryParts.push(
      `Balance sheet shows ${currency} ${reportData.balanceSheet.assets.toLocaleString()} in assets`
    )
  }

  return {
    summary:
      summaryParts.length > 0
        ? `${entityName} financial summary: ${summaryParts.join("; ")}.`
        : `${entityName} — no report data available to narrate.`,
    highlights,
    concerns,
  }
}
