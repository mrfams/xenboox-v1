import { task, logger } from "@trigger.dev/sdk"
import { db } from "@xenboox/db"
import { journalEntries, journalEntryLines, chartOfAccounts, fiscalPeriods } from "@xenboox/db/schema"
import { eq, and, sql } from "drizzle-orm"

export const generateReport = task({
  id: "generate-report",
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
  },
  queue: {
    concurrencyLimit: 5,
  },

  run: async (payload: {
    entityId: string
    reportType: "profit_loss" | "balance_sheet" | "trial_balance" | "cash_flow"
    startDate: string
    endDate: string
    userId: string
  }) => {
    const { entityId, reportType, startDate, endDate } = payload

    logger.info("Generating report", { entityId, reportType, startDate, endDate })

    const periods = await db.select().from(fiscalPeriods).where(
      and(
        eq(fiscalPeriods.entityId, entityId),
        sql`${fiscalPeriods.startDate} <= ${endDate}`,
        sql`${fiscalPeriods.endDate} >= ${startDate}`
      )
    )

    if (periods.length === 0) {
      throw new Error(`No fiscal period found for date range ${startDate} to ${endDate}`)
    }

    let reportData: Record<string, unknown>

    switch (reportType) {
      case "profit_loss":
        reportData = await generateProfitLoss(entityId, startDate, endDate)
        break
      case "balance_sheet":
        reportData = await generateBalanceSheet(entityId, endDate)
        break
      case "trial_balance":
        reportData = await generateTrialBalance(entityId, startDate, endDate)
        break
      case "cash_flow":
        reportData = await generateCashFlow(entityId, startDate, endDate)
        break
      default:
        throw new Error(`Unknown report type: ${reportType}`)
    }

    logger.info("Report generated", { reportType })

    return {
      success: true,
      reportType,
      data: reportData,
      generatedAt: new Date().toISOString(),
    }
  },
})

type ReportRow = { accountCode: string; accountName: string; total: string }
type TBRow = { accountCode: string; accountName: string; totalDebit: string; totalCredit: string }

async function generateProfitLoss(
  entityId: string,
  startDate: string,
  endDate: string
) {
  const revenue = await db
    .select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      total: sql<string>`COALESCE(SUM(${journalEntryLines.credit}) - SUM(${journalEntryLines.debit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        eq(chartOfAccounts.type, "revenue"),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`
      )
    )
    .groupBy(chartOfAccounts.code, chartOfAccounts.name) as unknown as ReportRow[]

  const expenses = await db
    .select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      total: sql<string>`COALESCE(SUM(${journalEntryLines.debit}) - SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        eq(chartOfAccounts.type, "expense"),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`
      )
    )
    .groupBy(chartOfAccounts.code, chartOfAccounts.name) as unknown as ReportRow[]

  const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.total), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.total), 0)

  return {
    period: { startDate, endDate },
    revenue: { items: revenue, total: totalRevenue },
    expenses: { items: expenses, total: totalExpenses },
    netIncome: totalRevenue - totalExpenses,
  }
}

async function generateBalanceSheet(entityId: string, asOfDate: string) {
  const accounts = await db
    .select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      accountType: chartOfAccounts.type,
      balance: sql<string>`COALESCE(SUM(${journalEntryLines.debit}) - SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.date} <= ${asOfDate}`
      )
    )
    .groupBy(chartOfAccounts.code, chartOfAccounts.name, chartOfAccounts.type) as unknown as Array<{
      accountCode: string
      accountName: string
      accountType: string
      balance: string
    }>

  const assets = accounts.filter((a) => a.accountType === "asset")
  const liabilities = accounts.filter((a) => a.accountType === "liability")
  const equity = accounts.filter((a) => a.accountType === "equity")

  const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.balance), 0)
  const totalLiabilities = liabilities.reduce((sum, l) => sum + parseFloat(l.balance), 0)
  const totalEquity = equity.reduce((sum, e) => sum + parseFloat(e.balance), 0)

  return {
    asOfDate,
    assets: { items: assets, total: totalAssets },
    liabilities: { items: liabilities, total: totalLiabilities },
    equity: { items: equity, total: totalEquity },
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  }
}

async function generateTrialBalance(
  entityId: string,
  startDate: string,
  endDate: string
) {
  const accounts = await db
    .select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`
      )
    )
    .groupBy(chartOfAccounts.code, chartOfAccounts.name)
    .orderBy(chartOfAccounts.code) as unknown as TBRow[]

  const totalDebit = accounts.reduce((sum, a) => sum + parseFloat(a.totalDebit), 0)
  const totalCredit = accounts.reduce((sum, a) => sum + parseFloat(a.totalCredit), 0)

  return {
    period: { startDate, endDate },
    accounts,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

async function generateCashFlow(
  entityId: string,
  startDate: string,
  endDate: string
) {
  const cashFlows = await db
    .select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      totalInflow: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      totalOutflow: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        eq(chartOfAccounts.type, "asset"),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`
      )
    )
    .groupBy(chartOfAccounts.code, chartOfAccounts.name) as unknown as Array<{
      accountCode: string
      accountName: string
      totalInflow: string
      totalOutflow: string
    }>

  const totalInflow = cashFlows.reduce((sum, cf) => sum + parseFloat(cf.totalInflow), 0)
  const totalOutflow = cashFlows.reduce((sum, cf) => sum + parseFloat(cf.totalOutflow), 0)

  return {
    period: { startDate, endDate },
    cashFlows,
    totalInflow,
    totalOutflow,
    netCashFlow: totalInflow - totalOutflow,
  }
}
