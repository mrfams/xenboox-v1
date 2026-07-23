// ─── Autonomous Reporting Pipeline ───────────────────────────────────────
//
// Pipeline 5 of 6: feeds into the Reporting Agent (Platform).
//
// Pipeline Steps:
//   1. Detect Reportable Periods  — Find periods with posted entries needing reports
//   2. Generate Reports           — Run P&L, Balance Sheet, Trial Balance in parallel
//   3. Verify Balances            — Confirm trial balance is balanced
//   4. Generate Narrative         — Create plain-English summary
//   5. Confidence Gate            — Check data completeness and balance
//   6a. Auto-Publish              — Mark reports as ready
//   6b. Flag for Review           — Escalate unbalanced/incomplete data

import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  fiscalPeriods,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema/accounting";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportablePeriod {
  periodId: string;
  periodLabel: string;
  year: number;
  month: number;
  status: string;
  postedEntryCount: number;
  lastReportGenerated: string | null;
}

export interface ReportData {
  periodId: string;
  periodLabel: string;
  profitAndLoss: {
    revenue: number;
    expenses: number;
    netProfit: number;
    revenueAccounts: Array<{
      accountCode: string;
      accountName: string;
      amount: number;
    }>;
    expenseAccounts: Array<{
      accountCode: string;
      accountName: string;
      amount: number;
    }>;
  } | null;
  balanceSheet: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    assets: Array<{ accountCode: string; accountName: string; amount: number }>;
    liabilities: Array<{
      accountCode: string;
      accountName: string;
      amount: number;
    }>;
    equity: Array<{ accountCode: string; accountName: string; amount: number }>;
  } | null;
  trialBalanceBalanced: boolean;
  trialBalanceDebits: number;
  trialBalanceCredits: number;
}

export interface ReportingPipelineResult {
  success: boolean;
  periodProcessed: string;
  report: ReportData | null;
  narrative: string | null;
  confidence: number;
  dataComplete: boolean;
  balanced: boolean;
  escalated: boolean;
  escalationReason?: string;
  auditEntries: AuditEntry[];
  durationMs: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_ENTRIES_FOR_REPORT = 1;

// ─── Step 1: Detect Reportable Periods ───────────────────────────────────

export async function detectReportablePeriods(
  entityId: string,
): Promise<ReportablePeriod[]> {
  const periods = await db.query.fiscalPeriods.findMany({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "open"),
    ),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
  });

  const result: ReportablePeriod[] = [];

  for (const period of periods) {
    // Count posted entries for this period
    const postedEntryCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.periodId, period.id),
          eq(journalEntries.status, "posted"),
        ),
      )
      .then((r) => Number(r[0]?.count ?? 0));

    if (postedEntryCount >= MIN_ENTRIES_FOR_REPORT) {
      result.push({
        periodId: period.id,
        periodLabel: `${period.year}-${String(period.month).padStart(2, "0")}`,
        year: period.year,
        month: period.month,
        status: period.status,
        postedEntryCount,
        lastReportGenerated: null,
      });
    }
  }

  return result;
}

// ─── Step 2: Generate Reports ────────────────────────────────────────────

async function generateReports(
  entityId: string,
  period: ReportablePeriod,
): Promise<ReportData> {
  // Get all posted entries for the period
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, period.periodId),
      eq(journalEntries.status, "posted"),
    ),
  });

  const entryIds = entries.map((e) => e.id);

  // Get all lines and accounts in batch
  const allLines =
    entryIds.length > 0
      ? await db.query.journalEntryLines.findMany({
          where: inArray(journalEntryLines.journalEntryId, entryIds),
        })
      : [];

  const accountIds = [...new Set(allLines.map((l) => l.accountId))];
  const accounts =
    accountIds.length > 0
      ? await db.query.chartOfAccounts.findMany({
          where: inArray(chartOfAccounts.id, accountIds),
        })
      : [];

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Calculate trial balance
  let totalDebits = 0;
  let totalCredits = 0;
  const accountTotals = new Map<string, { debit: number; credit: number }>();

  for (const line of allLines) {
    const existing = accountTotals.get(line.accountId) ?? {
      debit: 0,
      credit: 0,
    };
    existing.debit += Number(line.debit);
    existing.credit += Number(line.credit);
    accountTotals.set(line.accountId, existing);
    totalDebits += Number(line.debit);
    totalCredits += Number(line.credit);
  }

  // Build P&L
  const revenueAccounts: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
  }> = [];
  const expenseAccounts: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
  }> = [];

  // Build Balance Sheet
  const assets: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
  }> = [];
  const liabilities: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
  }> = [];
  const equity: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
  }> = [];

  for (const [accountId, totals] of accountTotals) {
    const account = accountMap.get(accountId);
    if (!account) continue;

    const netAmount = totals.debit - totals.credit;

    if (account.type === "revenue") {
      revenueAccounts.push({
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(netAmount),
      });
    } else if (account.type === "expense") {
      expenseAccounts.push({
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(netAmount),
      });
    } else if (account.type === "asset") {
      assets.push({
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(netAmount),
      });
    } else if (account.type === "liability") {
      liabilities.push({
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(netAmount),
      });
    } else if (account.type === "equity") {
      equity.push({
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(netAmount),
      });
    }
  }

  const totalRevenue = revenueAccounts.reduce((s, a) => s + a.amount, 0);
  const totalExpenses = expenseAccounts.reduce((s, a) => s + a.amount, 0);

  return {
    periodId: period.periodId,
    periodLabel: period.periodLabel,
    profitAndLoss: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      revenueAccounts,
      expenseAccounts,
    },
    balanceSheet: {
      totalAssets: assets.reduce((s, a) => s + a.amount, 0),
      totalLiabilities: liabilities.reduce((s, a) => s + a.amount, 0),
      totalEquity: equity.reduce((s, a) => s + a.amount, 0),
      assets,
      liabilities,
      equity,
    },
    trialBalanceBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    trialBalanceDebits: totalDebits,
    trialBalanceCredits: totalCredits,
  };
}

// ─── Step 3-4: Verify + Narrate ──────────────────────────────────────────

function generateNarrative(
  entityName: string,
  currency: string,
  report: ReportData,
): string {
  if (!report.profitAndLoss || !report.balanceSheet)
    return "Insufficient data for narrative.";

  const lines: string[] = [];
  const pnl = report.profitAndLoss;

  if (pnl.netProfit > 0) {
    lines.push(
      `✅ Net profit of ${currency} ${pnl.netProfit.toLocaleString()} — revenue ${currency} ${pnl.revenue.toLocaleString()} exceeded expenses ${currency} ${pnl.expenses.toLocaleString()}.`,
    );
  } else if (pnl.netProfit < 0) {
    lines.push(
      `⚠️ Net loss of ${currency} ${Math.abs(pnl.netProfit).toLocaleString()} — expenses ${currency} ${pnl.expenses.toLocaleString()} exceeded revenue ${currency} ${pnl.revenue.toLocaleString()}.`,
    );
  } else {
    lines.push(`ℹ️ Break-even result for the period.`);
  }

  if (pnl.revenue > 0) {
    const margin = ((pnl.netProfit / pnl.revenue) * 100).toFixed(1);
    lines.push(`Profit margin: ${margin}%.`);
  }

  const bs = report.balanceSheet;
  lines.push(
    `Balance sheet: ${currency} ${bs.totalAssets.toLocaleString()} in assets, ${currency} ${bs.totalLiabilities.toLocaleString()} in liabilities, ${currency} ${bs.totalEquity.toLocaleString()} in equity.`,
  );

  if (report.trialBalanceBalanced) {
    lines.push(
      `✅ Trial balance is balanced (${currency} ${report.trialBalanceDebits.toLocaleString()} = ${currency} ${report.trialBalanceCredits.toLocaleString()}).`,
    );
  } else {
    lines.push(
      `❌ Trial balance is NOT balanced — debits ${currency} ${report.trialBalanceDebits.toLocaleString()} vs credits ${currency} ${report.trialBalanceCredits.toLocaleString()}.`,
    );
  }

  return lines.join(" ");
}

// ─── Main Pipeline Entry Point ───────────────────────────────────────────

export async function runReportingPipeline(params: {
  entityId: string;
  entityName: string;
  currency: string;
  periodId?: string;
}): Promise<ReportingPipelineResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "reporting-pipeline",
    metadata: { entityId: params.entityId, periodId: params.periodId },
  });

  const auditEntries: AuditEntry[] = [];

  try {
    // Step 1: Detect period
    const periods = await detectReportablePeriods(params.entityId);
    const targetPeriod = params.periodId
      ? periods.find((p) => p.periodId === params.periodId)
      : (periods[0] ?? null);

    if (!targetPeriod) {
      const audit = createAuditEntry({
        agentId: "reporting-pipeline",
        action: "no_reportable_periods",
        details: { entityId: params.entityId },
        confidence: 1,
      });
      return {
        success: true,
        periodProcessed: params.periodId ?? "none",
        report: null,
        narrative: "No reportable periods found — no posted entries exist.",
        confidence: 1,
        dataComplete: false,
        balanced: true,
        escalated: false,
        auditEntries: [audit],
        durationMs: Date.now() - startTime,
      };
    }

    // Step 2: Generate reports
    const report = await generateReports(params.entityId, targetPeriod);

    // Step 3-4: Verify + narrate
    const narrative = generateNarrative(
      params.entityName,
      params.currency,
      report,
    );

    const dataComplete = !!report.profitAndLoss && !!report.balanceSheet;
    const balanced = report.trialBalanceBalanced;
    const confidence =
      dataComplete && balanced ? 0.92 : dataComplete ? 0.7 : 0.4;
    const escalated = !balanced || !dataComplete;

    const audit = createAuditEntry({
      agentId: "reporting-pipeline",
      action: escalated ? "report_flagged" : "report_generated",
      details: {
        periodId: targetPeriod.periodId,
        revenue: report.profitAndLoss?.revenue,
        netProfit: report.profitAndLoss?.netProfit,
        totalAssets: report.balanceSheet?.totalAssets,
        balanced,
        dataComplete,
        confidence,
      },
      confidence,
    });
    auditEntries.push(audit);

    await trace.update({
      output: {
        period: targetPeriod.periodLabel,
        dataComplete,
        balanced,
        confidence,
        escalated,
      },
    });

    return {
      success: true,
      periodProcessed: targetPeriod.periodLabel,
      report,
      narrative,
      confidence,
      dataComplete,
      balanced,
      escalated,
      escalationReason: escalated
        ? [
            !balanced ? "Trial balance not balanced" : null,
            !dataComplete ? "Report data incomplete" : null,
          ]
            .filter(Boolean)
            .join("; ")
        : undefined,
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const errorAudit = createAuditEntry({
      agentId: "reporting-pipeline",
      action: "pipeline_failed",
      details: { entityId: params.entityId, error: msg },
      confidence: 0,
    });
    auditEntries.push(errorAudit);

    return {
      success: false,
      periodProcessed: params.periodId ?? "unknown",
      report: null,
      narrative: null,
      confidence: 0,
      dataComplete: false,
      balanced: false,
      escalated: true,
      escalationReason: msg,
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  }
}
