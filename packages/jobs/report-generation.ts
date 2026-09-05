import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  fiscalPeriods,
} from "@xenboox/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  aggregateReportRows,
  derivePnl,
  deriveBalanceSheet,
  type ReportLineLike,
  type ReportAccountLike,
  type ReportStatementLine,
} from "@xenboox/db/lib";

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

  onFailure: dlqOnFailure<{
    entityId: string;
    reportType: "profit_loss" | "balance_sheet" | "trial_balance" | "cash_flow";
    startDate: string;
    endDate: string;
    userId: string;
  }>({
    task: "generate-report",
    type: "data_validation",
    severity: "medium",
    title: (p) => `Report generation failed (${p.reportType})`,
    entityIdFrom: (p) => p.entityId,
  }),

  run: async (payload: {
    entityId: string;
    reportType: "profit_loss" | "balance_sheet" | "trial_balance" | "cash_flow";
    startDate: string;
    endDate: string;
    userId: string;
  }) => {
    const { entityId, reportType, startDate, endDate } = payload;

    logger.info("Generating report", {
      entityId,
      reportType,
      startDate,
      endDate,
    });

    const periods = await db
      .select()
      .from(fiscalPeriods)
      .where(
        and(
          eq(fiscalPeriods.entityId, entityId),
          sql`${fiscalPeriods.startDate} <= ${endDate}`,
          sql`${fiscalPeriods.endDate} >= ${startDate}`,
        ),
      );

    if (periods.length === 0) {
      throw new Error(
        `No fiscal period found for date range ${startDate} to ${endDate}`,
      );
    }

    let reportData: Record<string, unknown>;

    switch (reportType) {
      case "profit_loss":
        reportData = await generateProfitLoss(entityId, startDate, endDate);
        break;
      case "balance_sheet":
        reportData = await generateBalanceSheet(entityId, endDate);
        break;
      case "trial_balance":
        reportData = await generateTrialBalance(entityId, startDate, endDate);
        break;
      case "cash_flow":
        reportData = await generateCashFlow(entityId, startDate, endDate);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    logger.info("Report generated", { reportType });

    return {
      success: true,
      reportType,
      data: reportData,
      generatedAt: new Date().toISOString(),
    };
  },
});

type TBRow = {
  accountCode: string;
  accountName: string;
  totalDebit: string;
  totalCredit: string;
};

export async function generateProfitLoss(
  entityId: string,
  startDate: string,
  endDate: string,
) {
  // Canonical derivation (P9-A): posted entries in the window, per-account
  // netting, COGS split on the real cost_of_goods_sold subtype. The previous
  // SQL lumped COGS into "expenses" and produced no gross-profit split.
  const { pnl, accounts } = await loadWindowPnl(entityId, startDate, endDate);

  const asItems = (list: ReportStatementLine[]) =>
    list.map((l) => ({
      accountCode: l.code,
      accountName: l.name,
      total: String(round2(l.amount)),
    }));

  const totalExpenses = pnl.totalCogs + pnl.totalOperatingExpenses;

  return {
    period: { startDate, endDate },
    revenue: { items: asItems(pnl.revenue), total: pnl.totalRevenue },
    cogs: { items: asItems(pnl.cogs), total: pnl.totalCogs },
    operatingExpenses: {
      items: asItems(pnl.operatingExpenses),
      total: pnl.totalOperatingExpenses,
    },
    expenses: {
      items: asItems([...pnl.cogs, ...pnl.operatingExpenses]),
      total: totalExpenses,
    },
    grossProfit: pnl.grossProfit,
    operatingProfit: pnl.operatingProfit,
    netIncome: pnl.netIncome,
  };
}

export async function generateBalanceSheet(entityId: string, asOfDate: string) {
  // Canonical derivation (P9-A): cumulative posted entries with
  // date <= asOfDate, normal-balance display signs, and current earnings
  // folded into equity so `balanced` is meaningful.
  const { bs } = await loadAsOfBalanceSheet(entityId, asOfDate);

  const asItems = (list: ReportStatementLine[]) =>
    list.map((l) => ({
      accountCode: l.code,
      accountName: l.name,
      total: String(round2(l.amount)),
    }));

  const equityItems = asItems(bs.equity);
  if (Math.abs(bs.currentEarnings) >= 0.005) {
    equityItems.push({
      accountCode: "",
      accountName: "Current Earnings",
      total: String(round2(bs.currentEarnings)),
    });
  }

  return {
    asOfDate,
    assets: { items: asItems(bs.assets), total: bs.totalAssets },
    liabilities: { items: asItems(bs.liabilities), total: bs.totalLiabilities },
    equity: { items: equityItems, total: bs.totalEquityWithEarnings },
    currentEarnings: bs.currentEarnings,
    balanced: bs.balanced,
  };
}

// ─── Shared loaders for the canonical builders ────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function loadWindowPnl(
  entityId: string,
  startDate: string,
  endDate: string,
): Promise<{
  pnl: ReturnType<typeof derivePnl>;
  accounts: ReportAccountLike[];
}> {
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      sql`${journalEntries.date} >= ${startDate}`,
      sql`${journalEntries.date} <= ${endDate}`,
    ),
  });
  const ids = entries.map((e) => e.id);
  const lines =
    ids.length > 0
      ? await db.query.journalEntryLines.findMany({
          where: inArray(journalEntryLines.journalEntryId, ids),
        })
      : [];
  const accounts = (await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
  })) as unknown as ReportAccountLike[];
  return {
    pnl: derivePnl(aggregateReportRows(lines as ReportLineLike[], accounts)),
    accounts,
  };
}

async function loadAsOfBalanceSheet(
  entityId: string,
  asOfDate: string,
): Promise<{ bs: ReturnType<typeof deriveBalanceSheet> }> {
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      sql`${journalEntries.date} <= ${asOfDate}`,
    ),
  });
  const ids = entries.map((e) => e.id);
  const lines =
    ids.length > 0
      ? await db.query.journalEntryLines.findMany({
          where: inArray(journalEntryLines.journalEntryId, ids),
        })
      : [];
  const accounts = (await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
  })) as unknown as ReportAccountLike[];
  return {
    bs: deriveBalanceSheet(
      aggregateReportRows(lines as ReportLineLike[], accounts),
    ),
  };
}
export async function generateTrialBalance(
  entityId: string,
  startDate: string,
  endDate: string,
) {
  const accounts = (await db
    .select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .innerJoin(
      chartOfAccounts,
      eq(journalEntryLines.accountId, chartOfAccounts.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`,
      ),
    )
    .groupBy(chartOfAccounts.code, chartOfAccounts.name)
    .orderBy(chartOfAccounts.code)) as unknown as TBRow[];

  const totalDebit = accounts.reduce(
    (sum, a) => sum + parseFloat(a.totalDebit),
    0,
  );
  const totalCredit = accounts.reduce(
    (sum, a) => sum + parseFloat(a.totalCredit),
    0,
  );

  return {
    period: { startDate, endDate },
    accounts,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

export async function generateCashFlow(
  entityId: string,
  startDate: string,
  endDate: string,
) {
  const cashFlows = (await db
    .select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      totalInflow: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      totalOutflow: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .innerJoin(
      chartOfAccounts,
      eq(journalEntryLines.accountId, chartOfAccounts.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        eq(chartOfAccounts.type, "asset"),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`,
      ),
    )
    .groupBy(chartOfAccounts.code, chartOfAccounts.name)) as unknown as Array<{
    accountCode: string;
    accountName: string;
    totalInflow: string;
    totalOutflow: string;
  }>;

  const totalInflow = cashFlows.reduce(
    (sum, cf) => sum + parseFloat(cf.totalInflow),
    0,
  );
  const totalOutflow = cashFlows.reduce(
    (sum, cf) => sum + parseFloat(cf.totalOutflow),
    0,
  );

  return {
    period: { startDate, endDate },
    cashFlows,
    totalInflow,
    totalOutflow,
    netCashFlow: totalInflow - totalOutflow,
  };
}
