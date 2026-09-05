// ─── Enhanced Autonomous Financial Reporting Pipeline ──────────────────────
//
// Pipeline 5 of 6: feeds into the Reporting Agent (Platform).
//
// Full 11-step flow matching the Financial Reporting Pipeline spec:
//   1. Report Request Intake — Normalize request into structured form
//   2. Ledger State Snapshot — Pull TB/GL state, persist snapshot
//   3. Statement Assembly Engine — Modular builders per statement type
//   4. Deterministic Balance Check — Hard gate: TB must balance
//   5a. Proceed to Assembly — Balanced
//   5b. Block & Escalate — Unbalanced (ledger integrity issue)
//   6. FX Summary Layer — Realized/unrealized FX impact
//   7. Custom Report Builder — Chat-driven ad hoc queries
//   8. Plain-English Narrative — Auto-generated summary
//   9. Format & Delivery — Multiple output channels
//   10. Cache & Versioning — Locked vs draft periods
//   11. Audit Trail — Every generation logged

import { db } from "@xenboox/db";
import {
  derivePnl,
  deriveBalanceSheet,
  type ReportBalanceRow,
  type ReportStatementLine,
} from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  fiscalPeriods,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema/accounting";
import {
  reportRequests,
  reportSnapshots,
  statementVersions,
} from "@xenboox/db";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";
import {
  withRetry,
  withTimeout,
  redactPIIFromObject,
  checkIdempotency,
  setIdempotencyResult,
  generateIdempotencyKey,
  startCacheCleanup,
  TimeoutError,
  DEFAULT_PIPELINE_TIMEOUT,
} from "./retry";
import type { PipelineTimeoutConfig } from "./retry";

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

export interface ProfitAndLossStatement {
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
}

export interface BalanceSheetStatement {
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
}

export interface CashFlowStatement {
  operatingActivities: Array<{ category: string; amount: number }>;
  investingActivities: Array<{ category: string; amount: number }>;
  financingActivities: Array<{ category: string; amount: number }>;
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
}

export interface LedgerSnapshot {
  snapshotId: string;
  periodId: string;
  periodLabel: string;
  trialBalanceBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  accountBalances: Array<{
    accountId: string;
    code: string;
    name: string;
    type: string;
    subtype: string;
    debit: number;
    credit: number;
    netAmount: number;
  }>;
  entryCount: number;
}

export interface ReportData {
  periodId: string;
  periodLabel: string;
  profitAndLoss: ProfitAndLossStatement | null;
  balanceSheet: BalanceSheetStatement | null;
  cashFlow: CashFlowStatement | null;
  trialBalanceBalanced: boolean;
  trialBalanceDebits: number;
  trialBalanceCredits: number;
  fxImpact?: {
    realizedGainLoss: number;
    unrealizedGainLoss: number;
    narrative: string;
  };
}

export interface FxImpact {
  realizedGainLoss: number;
  unrealizedGainLoss: number;
  narrative: string;
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
  escalationReason: string | null;
  // New fields
  snapshotId: string | null;
  versionId: string | null;
  isDraft: boolean;
  auditEntries: AuditEntry[];
  durationMs: number;
}

export interface ReportRequestInput {
  entityId: string;
  entityName?: string;
  currency?: string;
  statementType?:
    | "profit_and_loss"
    | "balance_sheet"
    | "cash_flow"
    | "trial_balance"
    | "general_ledger"
    | "custom";
  freeTextQuery?: string;
  periodId?: string;
  comparisonPeriodId?: string;
  format?: "dashboard" | "chat" | "pdf" | "excel" | "email";
  requestedByUserId?: string;
  source?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_ENTRIES_FOR_REPORT = 1;

// ─── Step 1: Report Request Intake ──────────────────────────────────────
//
// Normalize request into structured form: entity_id, statement_type or
// free-text query, period, comparison period, requested_by, format.

export async function createReportRequest(
  input: ReportRequestInput,
): Promise<{ requestId: string }> {
  const [req] = await db
    .insert(reportRequests)
    .values({
      entityId: input.entityId,
      requestedByUserId: input.requestedByUserId,
      statementType: input.statementType as any,
      freeTextQuery: input.freeTextQuery,
      periodId: input.periodId,
      comparisonPeriodId: input.comparisonPeriodId,
      format: (input.format ?? "dashboard") as any,
      status: "pending",
      source: input.source ?? "dashboard",
    })
    .returning({ id: reportRequests.id });

  return { requestId: req!.id };
}

// ─── Step 2: Ledger State Snapshot ──────────────────────────────────────
//
// Pull trial balance / GL state scoped to entity_id + period.
// Resolve every account through Chart of Accounts classification.
// Persist the snapshot for traceability.

export async function takeLedgerSnapshot(
  entityId: string,
  period: ReportablePeriod,
): Promise<LedgerSnapshot> {
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
  const accountBalances: LedgerSnapshot["accountBalances"] = [];

  for (const [accountId] of accountMap) {
    const linesForAccount = allLines.filter((l) => l.accountId === accountId);
    const debit = linesForAccount.reduce((s, l) => s + Number(l.debit), 0);
    const credit = linesForAccount.reduce((s, l) => s + Number(l.credit), 0);

    totalDebits += debit;
    totalCredits += credit;

    const account = accountMap.get(accountId)!;
    accountBalances.push({
      accountId,
      code: account.code,
      name: account.name,
      type: account.type,
      subtype: account.subtype ?? "",
      debit,
      credit,
      netAmount: debit - credit,
    });
  }

  const trialBalanceBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  // Persist snapshot
  const [snapshot] = await db
    .insert(reportSnapshots)
    .values({
      entityId,
      periodId: period.periodId,
      periodLabel: period.periodLabel,
      trialBalanceBalanced,
      totalDebits: String(totalDebits),
      totalCredits: String(totalCredits),
      accountCount: String(accountBalances.length),
      entryCount: String(entries.length),
      accountBalances,
      generatedAt: new Date(),
    })
    .returning({ id: reportSnapshots.id });

  return {
    snapshotId: snapshot!.id,
    periodId: period.periodId,
    periodLabel: period.periodLabel,
    trialBalanceBalanced,
    totalDebits,
    totalCredits,
    accountBalances,
    entryCount: entries.length,
  };
}

// ─── Step 3: Statement Assembly Engine ──────────────────────────────────
//
// Modular builder per statement type, all reading the same CoA-classified
// snapshot. Builds P&L, Balance Sheet, Cash Flow, Trial Balance, GL Report.

export function buildProfitAndLoss(
  snapshot: LedgerSnapshot,
): ProfitAndLossStatement {
  // Canonical derivation (P9-A): real COGS split by subtype and per-account
  // netting via report-math. Old code Math.abs'd every account and lumped
  // COGS into expenses.
  const rows = toBalanceRows(snapshot);
  const pnl = derivePnl(rows);

  const toList = (
    list: ReportStatementLine[],
  ): ProfitAndLossStatement["revenueAccounts"] =>
    list.map((l) => ({
      accountCode: l.code,
      accountName: l.name,
      amount: Math.abs(l.amount),
    }));

  return {
    revenue: pnl.totalRevenue,
    expenses: pnl.totalCogs + pnl.totalOperatingExpenses,
    netProfit: pnl.netIncome,
    revenueAccounts: toList(pnl.revenue),
    expenseAccounts: toList([...pnl.cogs, ...pnl.operatingExpenses]),
  };
}

export function buildBalanceSheet(
  snapshot: LedgerSnapshot,
): BalanceSheetStatement {
  // Canonical derivation (P9-A): normal-balance display signs and current
  // earnings folded into equity so the statement can actually balance.
  const bs = deriveBalanceSheet(toBalanceRows(snapshot));

  const toList = (
    list: ReportStatementLine[],
  ): BalanceSheetStatement["assets"] =>
    list.map((l) => ({
      accountCode: l.code,
      accountName: l.name,
      amount: Math.abs(l.amount),
    }));

  const equity = toList(bs.equity);
  if (Math.abs(bs.currentEarnings) >= 0.005) {
    equity.push({
      accountCode: "",
      accountName: "Current Earnings",
      amount: Math.abs(bs.currentEarnings),
    });
  }

  return {
    totalAssets: bs.totalAssets,
    totalLiabilities: bs.totalLiabilities,
    totalEquity: bs.totalEquityWithEarnings,
    assets: toList(bs.assets),
    liabilities: toList(bs.liabilities),
    equity,
  };
}

/** Map a ledger snapshot's account balances onto canonical raw-balance rows. */
function toBalanceRows(snapshot: LedgerSnapshot): ReportBalanceRow[] {
  return snapshot.accountBalances.map((a) => ({
    accountId: a.accountId,
    code: a.code,
    name: a.name,
    type: a.type,
    subtype: a.subtype ?? null,
    debit: a.debit,
    credit: a.credit,
    raw: a.netAmount, // snapshot already stores debit − credit
  }));
}

export function buildCashFlow(
  snapshot: LedgerSnapshot,
  previousSnapshot?: LedgerSnapshot,
): CashFlowStatement {
  const operatingActivities: CashFlowStatement["operatingActivities"] = [];
  const investingActivities: CashFlowStatement["investingActivities"] = [];
  const financingActivities: CashFlowStatement["financingActivities"] = [];

  // Derive cash flows from account classification
  for (const acct of snapshot.accountBalances) {
    const amount = Math.abs(acct.netAmount);
    if (acct.type === "revenue" || acct.type === "expense") {
      operatingActivities.push({
        category: acct.name,
        amount: acct.netAmount, // sign matters for cash flow direction
      });
    } else if (acct.subtype?.includes("fixed_asset")) {
      investingActivities.push({
        category: acct.name,
        amount: acct.netAmount,
      });
    } else if (acct.type === "equity" || acct.subtype?.includes("loan")) {
      financingActivities.push({
        category: acct.name,
        amount: acct.netAmount,
      });
    }
  }

  const netOperating = operatingActivities.reduce((s, a) => s + a.amount, 0);
  const netInvesting = investingActivities.reduce((s, a) => s + a.amount, 0);
  const netFinancing = financingActivities.reduce((s, a) => s + a.amount, 0);

  const openingCash = previousSnapshot
    ? previousSnapshot.accountBalances
        .filter((a) => a.type === "asset" && a.subtype?.includes("bank"))
        .reduce((s, a) => s + a.netAmount, 0)
    : 0;

  const closingCash = snapshot.accountBalances
    .filter((a) => a.type === "asset" && a.subtype?.includes("bank"))
    .reduce((s, a) => s + a.netAmount, 0);

  return {
    operatingActivities,
    investingActivities,
    financingActivities,
    netCashFlow: netOperating + netInvesting + netFinancing,
    openingCash,
    closingCash,
  };
}

// ─── Step 4: Deterministic Balance Check — Hard Gate ───────────────────
//
// Trial balance debits must equal credits before ANY statement built from
// this snapshot is presented. This is a Layer 1 deterministic rule — no
// confidence score, no exceptions, no partial publish.

export function checkTrialBalance(snapshot: LedgerSnapshot): {
  balanced: boolean;
  difference: number;
  message: string;
} {
  const difference = snapshot.totalDebits - snapshot.totalCredits;
  const balanced = Math.abs(difference) < 0.01;

  if (balanced) {
    return {
      balanced: true,
      difference: 0,
      message: "Trial balance is balanced.",
    };
  }

  return {
    balanced: false,
    difference,
    message: `Trial balance does NOT balance — debits ${snapshot.totalDebits.toFixed(2)} vs credits ${snapshot.totalCredits.toFixed(2)}, difference ${difference.toFixed(2)}. This indicates a ledger integrity problem that must be resolved before reports can be generated.`,
  };
}

// ─── Step 5a/b: Proceed or Block & Escalate ────────────────────────────
//
// If balanced → proceed to assembly. If not → block, alert Controller Agent.

export function evaluateReportGate(snapshot: LedgerSnapshot): {
  canProceed: boolean;
  reason?: string;
} {
  const check = checkTrialBalance(snapshot);

  if (check.balanced) {
    return { canProceed: true };
  }

  return {
    canProceed: false,
    reason: `BLOCKED — ${check.message}`,
  };
}

// ─── Step 6: FX Summary Layer ──────────────────────────────────────────
//
// Realized gains/losses folded into P&L, unrealized shown on balance sheet.
// Plain-English footnote generated.

export function calculateFxImpact(snapshot: LedgerSnapshot): FxImpact {
  // Identify FX-related accounts (by subtype or code pattern)
  const fxAccounts = snapshot.accountBalances.filter(
    (a) =>
      a.subtype?.includes("fx") ||
      a.subtype?.includes("exchange") ||
      a.code?.startsWith("8"),
  );

  let realizedGainLoss = 0;
  let unrealizedGainLoss = 0;

  for (const acct of fxAccounts) {
    if (acct.type === "revenue" || acct.type === "expense") {
      realizedGainLoss += acct.netAmount;
    } else {
      unrealizedGainLoss += acct.netAmount;
    }
  }

  const totalImpact = realizedGainLoss + unrealizedGainLoss;
  let narrative = "No significant currency movement impact this period.";

  if (Math.abs(totalImpact) > 0.01) {
    const direction = totalImpact >= 0 ? "added to" : "reduced";
    narrative = `Currency movements ${direction} your profit by ${Math.abs(totalImpact).toFixed(2)} this period.`;
  }

  return { realizedGainLoss, unrealizedGainLoss, narrative };
}

// ─── Step 8: Plain-English Narrative Generation ────────────────────────
//
// Auto-generated summary highlighting notable movements, written for a
// non-accountant owner.

export function generateNarrative(
  entityName: string,
  currency: string,
  report: ReportData,
  snapshot: LedgerSnapshot,
): string {
  if (!report.profitAndLoss || !report.balanceSheet) {
    return "Insufficient data for narrative. Verify the ledger has posted entries for this period.";
  }

  const lines: string[] = [];
  const pnl = report.profitAndLoss;

  // Top-level result
  if (pnl.netProfit > 0) {
    lines.push(
      `✅ **Net profit of ${currency} ${pnl.netProfit.toLocaleString()}** — revenue ${currency} ${pnl.revenue.toLocaleString()} exceeded expenses ${currency} ${pnl.expenses.toLocaleString()}.`,
    );
  } else if (pnl.netProfit < 0) {
    lines.push(
      `⚠️ **Net loss of ${currency} ${Math.abs(pnl.netProfit).toLocaleString()}** — expenses ${currency} ${pnl.expenses.toLocaleString()} exceeded revenue ${currency} ${pnl.revenue.toLocaleString()}.`,
    );
  } else {
    lines.push("ℹ️ Break-even result for the period.");
  }

  // Margin
  if (pnl.revenue > 0) {
    const margin = ((pnl.netProfit / pnl.revenue) * 100).toFixed(1);
    lines.push(`Profit margin: **${margin}%**.`);
  }

  // Balance sheet summary
  const bs = report.balanceSheet;
  lines.push(
    `Balance sheet: ${currency} ${bs.totalAssets.toLocaleString()} in assets, ${currency} ${bs.totalLiabilities.toLocaleString()} in liabilities, ${currency} ${bs.totalEquity.toLocaleString()} in equity.`,
  );

  // FX impact
  if (
    report.fxImpact &&
    Math.abs(
      report.fxImpact.realizedGainLoss + report.fxImpact.unrealizedGainLoss,
    ) > 0.01
  ) {
    lines.push(report.fxImpact.narrative);
  }

  // Top revenue and expense drivers
  const topRevenue = [...pnl.revenueAccounts]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const topExpenses = [...pnl.expenseAccounts]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  if (topRevenue.length > 0) {
    lines.push(
      `Top revenue source${topRevenue.length > 1 ? "s" : ""}: ${topRevenue
        .map(
          (a) => `${a.accountName} (${currency} ${a.amount.toLocaleString()})`,
        )
        .join(", ")}.`,
    );
  }

  if (topExpenses.length > 0) {
    lines.push(
      `Top expense${topExpenses.length > 1 ? "s" : ""}: ${topExpenses
        .map(
          (a) => `${a.accountName} (${currency} ${a.amount.toLocaleString()})`,
        )
        .join(", ")}.`,
    );
  }

  // Trial balance status
  if (snapshot.trialBalanceBalanced) {
    lines.push(
      `✅ Trial balance is balanced (${currency} ${snapshot.totalDebits.toLocaleString()} = ${currency} ${snapshot.totalCredits.toLocaleString()}).`,
    );
  } else {
    lines.push(
      `❌ Trial balance is NOT balanced — debits ${currency} ${snapshot.totalDebits.toLocaleString()} vs credits ${currency} ${snapshot.totalCredits.toLocaleString()}. Reports cannot be finalized until this is resolved.`,
    );
  }

  return lines.join("\n\n");
}

// ─── Step 10: Cache & Versioning ───────────────────────────────────────
//
// Locked periods → report version frozen, immutable, cached.
// Draft/open periods → live-recalculating, clearly labeled.

export async function createStatementVersion(
  entityId: string,
  snapshotId: string,
  statementType: string,
  statementData: Record<string, unknown>,
  narrativeSummary: string,
  periodStatus: string,
): Promise<{ versionId: string; isDraft: boolean }> {
  const isLocked = periodStatus === "closed";
  const lockStatus = isLocked ? "locked" : "draft";

  // Mark previous versions as not latest
  await db
    .update(statementVersions)
    .set({ isLatest: false })
    .where(
      and(
        eq(statementVersions.entityId, entityId),
        eq(statementVersions.statementType, statementType as any),
        eq(statementVersions.isLatest, true),
      ),
    );

  const [version] = await db
    .insert(statementVersions)
    .values({
      entityId,
      snapshotId,
      statementType: statementType as any,
      versionNumber: "1",
      lockStatus: lockStatus as any,
      narrativeSummary,
      statementData,
      isLatest: true,
      lockedAt: isLocked ? new Date() : null,
    })
    .returning({ id: statementVersions.id });

  return {
    versionId: version!.id,
    isDraft: !isLocked,
  };
}

// ─── Step 11: Get Report Audit Trail ───────────────────────────────────

export async function getReportAuditTrail(
  entityId: string,
  periodId?: string,
): Promise<
  Array<{
    requestId: string;
    statementType: string | null;
    periodLabel: string | null;
    status: string;
    balanced: boolean;
    format: string;
    source: string;
    generatedAt: string | null;
  }>
> {
  const snapshots = periodId
    ? await db.query.reportSnapshots.findMany({
        where: and(
          eq(reportSnapshots.entityId, entityId),
          eq(reportSnapshots.periodId, periodId),
        ),
        orderBy: [desc(reportSnapshots.generatedAt)],
      })
    : await db.query.reportSnapshots.findMany({
        where: eq(reportSnapshots.entityId, entityId),
        orderBy: [desc(reportSnapshots.generatedAt)],
      });

  return snapshots.map((s) => ({
    requestId: s.id,
    statementType: null,
    periodLabel: s.periodLabel,
    status: "completed",
    balanced: s.trialBalanceBalanced,
    format: "dashboard",
    source: s.generatedBy ?? "reporting-pipeline",
    generatedAt: s.generatedAt?.toISOString() ?? null,
  }));
}

// ─── Step 1 (original): Detect Reportable Periods ─────────────────────

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

  if (periods.length === 0) return [];

  // Batch count posted entries per period — 1 query instead of N (N+1 fix)
  const periodIds = periods.map((p) => p.id);
  const counts = await db
    .select({
      periodId: journalEntries.periodId,
      count: sql<number>`count(*)::int`,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        inArray(journalEntries.periodId, periodIds),
        eq(journalEntries.status, "posted"),
      ),
    )
    .groupBy(journalEntries.periodId);

  const countByPeriod = new Map(counts.map((c) => [c.periodId, c.count]));

  const result: ReportablePeriod[] = [];
  for (const period of periods) {
    const postedEntryCount = countByPeriod.get(period.id) ?? 0;
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

// ─── Per-Step Telemetry ─────────────────────────────────────────────────────

export interface StepTelemetry {
  step: string;
  label: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: "completed" | "skipped" | "failed";
  metadata?: Record<string, unknown>;
}

function recordStep(
  telemetry: StepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
): StepTelemetry {
  const durationMs = Date.now() - startedAt;
  const entry: StepTelemetry = {
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    status: "completed",
  };
  telemetry.push(entry);
  return entry;
}

function recordFailedStep(
  telemetry: StepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
  error?: string,
): void {
  telemetry.push({
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: "failed",
    metadata: error ? { error } : undefined,
  });
}

// ─── Main Pipeline Entry Point ─────────────────────────────────────────

export async function runReportingPipeline(
  params: {
    entityId: string;
    entityName: string;
    currency: string;
    periodId?: string;
  },
  timeoutConfig?: Partial<PipelineTimeoutConfig>,
): Promise<ReportingPipelineResult> {
  const startTime = Date.now();
  const pipelineTimeout: PipelineTimeoutConfig = {
    ...DEFAULT_PIPELINE_TIMEOUT,
    ...timeoutConfig,
  };
  const stepTelemetry: StepTelemetry[] = [];
  const telemetryStart = Date.now();

  // ── Enterprise: Idempotency Check ─────────────────────────────────────
  const idempotencyKey = generateIdempotencyKey({
    channel: "reporting-pipeline",
    userId: "system",
    entityId: params.entityId,
    rawContent: `reporting:${params.entityId}:${params.periodId ?? "latest"}`,
    sessionId: `report-${params.entityId}`,
  });
  const cachedResult = checkIdempotency(idempotencyKey);
  if (cachedResult) {
    const cached = cachedResult as ReportingPipelineResult;
    return { ...cached, durationMs: Date.now() - startTime };
  }

  startCacheCleanup();

  // ── Enterprise: Pipeline-Level Timeout ───────────────────────────────
  const pipelinePromise = (async () => {
    const trace = await langfuse.trace({
      name: "reporting-pipeline",
      metadata: {
        entityId: params.entityId,
        periodId: params.periodId,
        timeoutMs: pipelineTimeout.maxExecutionMs,
        idempotencyKey: idempotencyKey.slice(0, 16),
      },
    });

    const auditEntries: AuditEntry[] = [];

    try {
      // ── Step 1: Detect Reportable Periods ─────────────────────────────
      let stepStart = Date.now();
      const periods = await withTimeout(
        () => detectReportablePeriods(params.entityId),
        pipelineTimeout.maxStepExecutionMs,
        "detect-periods",
      );

      const targetPeriod = params.periodId
        ? periods.find((p) => p.periodId === params.periodId)
        : (periods[0] ?? null);

      if (!targetPeriod) {
        const audit = createAuditEntry({
          agentId: "reporting-pipeline",
          action: "no_reportable_periods",
          details: redactPIIFromObject({ entityId: params.entityId }),
          confidence: 1,
        });
        recordStep(
          stepTelemetry,
          "detect_periods",
          "Detect Reportable Periods",
          stepStart,
        );
        const noOpResult: ReportingPipelineResult = {
          success: true,
          periodProcessed: params.periodId ?? "none",
          report: null,
          narrative: "No reportable periods found — no posted entries exist.",
          confidence: 1,
          dataComplete: false,
          balanced: true,
          escalated: false,
          escalationReason: null,
          isDraft: false,
          snapshotId: null,
          versionId: null,
          auditEntries: [audit],
          durationMs: Date.now() - startTime,
        };
        setIdempotencyResult(idempotencyKey, noOpResult);
        return noOpResult;
      }
      recordStep(
        stepTelemetry,
        "detect_periods",
        "Detect Reportable Periods",
        stepStart,
      );

      // ── Step 2: Take Ledger Snapshot (with retry) ────────────────────
      stepStart = Date.now();
      const snapshot = await withRetry(
        () =>
          withTimeout(
            () => takeLedgerSnapshot(params.entityId, targetPeriod),
            pipelineTimeout.maxStepExecutionMs,
            "take-ledger-snapshot",
          ),
        {
          agentId: "reporting-pipeline",
          operationName: "take-ledger-snapshot",
          context: {
            entityId: params.entityId,
            periodId: targetPeriod.periodId,
          },
        },
      );

      auditEntries.push(
        createAuditEntry({
          agentId: "reporting-pipeline",
          action: "ledger_snapshot_taken",
          details: redactPIIFromObject({
            snapshotId: snapshot.snapshotId,
            periodLabel: snapshot.periodLabel,
            balanced: snapshot.trialBalanceBalanced,
            totalDebits: snapshot.totalDebits,
            totalCredits: snapshot.totalCredits,
            accountCount: snapshot.accountBalances.length,
            entryCount: snapshot.entryCount,
          }),
          confidence: snapshot.trialBalanceBalanced ? 0.95 : 0.5,
        }),
      );
      recordStep(
        stepTelemetry,
        "ledger_snapshot",
        "Take Ledger Snapshot",
        stepStart,
      );

      // ── Step 3-4: Hard Gate — Balance Check ──────────────────────────
      stepStart = Date.now();
      const gateResult = evaluateReportGate(snapshot);
      if (!gateResult.canProceed) {
        const audit = createAuditEntry({
          agentId: "reporting-pipeline",
          action: "report_blocked_unbalanced",
          details: redactPIIFromObject({
            snapshotId: snapshot.snapshotId,
            reason: gateResult.reason,
          }),
          confidence: 0,
        });
        auditEntries.push(audit);
        recordFailedStep(
          stepTelemetry,
          "balance_gate",
          "Balance Check Gate",
          stepStart,
          gateResult.reason,
        );
        const blockedResult: ReportingPipelineResult = {
          success: false,
          periodProcessed: targetPeriod.periodLabel,
          report: null,
          narrative: gateResult.reason ?? null,
          confidence: 0,
          dataComplete: false,
          balanced: false,
          escalated: true,
          escalationReason: gateResult.reason ?? null,
          snapshotId: snapshot.snapshotId,
          versionId: null,
          isDraft: targetPeriod.status !== "closed",
          auditEntries,
          durationMs: Date.now() - startTime,
        };
        setIdempotencyResult(idempotencyKey, blockedResult);
        return blockedResult;
      }
      recordStep(
        stepTelemetry,
        "balance_gate",
        "Balance Check Gate",
        stepStart,
      );

      // ── Step 3: Assemble Statements (sync — fast, no timeout needed) ─
      stepStart = Date.now();
      const pnl = buildProfitAndLoss(snapshot);
      const bs = buildBalanceSheet(snapshot);
      const cf = buildCashFlow(snapshot);
      const fxImpact = calculateFxImpact(snapshot);

      const report: ReportData = {
        periodId: targetPeriod.periodId,
        periodLabel: targetPeriod.periodLabel,
        profitAndLoss: pnl,
        balanceSheet: bs,
        cashFlow: cf,
        trialBalanceBalanced: snapshot.trialBalanceBalanced,
        trialBalanceDebits: snapshot.totalDebits,
        trialBalanceCredits: snapshot.totalCredits,
        fxImpact,
      };

      // Step 8: Generate narrative (sync)
      const narrative = generateNarrative(
        params.entityName,
        params.currency,
        report,
        snapshot,
      );
      recordStep(
        stepTelemetry,
        "assemble",
        "Assemble Statements & Narrative",
        stepStart,
      );

      // ── Step 9-10: Create Versioned Statement (with retry) ────────────
      stepStart = Date.now();
      const versionInfo = await withRetry(
        () =>
          withTimeout(
            () =>
              createStatementVersion(
                params.entityId,
                snapshot.snapshotId,
                "profit_and_loss",
                {
                  profitAndLoss: pnl,
                  balanceSheet: bs,
                  cashFlow: cf,
                  fxImpact,
                },
                narrative,
                targetPeriod.status,
              ),
            pipelineTimeout.maxStepExecutionMs,
            "create-statement-version",
          ),
        {
          agentId: "reporting-pipeline",
          operationName: "create-statement-version",
          context: {
            entityId: params.entityId,
            snapshotId: snapshot.snapshotId,
          },
        },
      );
      recordStep(stepTelemetry, "versioning", "Cache & Versioning", stepStart);

      // ── Step 11: Audit Trail (with PII Redaction) ─────────────────────
      stepStart = Date.now();
      const dataComplete = !!report.profitAndLoss && !!report.balanceSheet;
      const balanced = report.trialBalanceBalanced;
      const confidence =
        dataComplete && balanced ? 0.92 : dataComplete ? 0.7 : 0.4;
      const escalated = !balanced || !dataComplete;

      const audit = createAuditEntry({
        agentId: "reporting-pipeline",
        action: escalated ? "report_flagged" : "report_generated",
        details: redactPIIFromObject({
          periodId: targetPeriod.periodId,
          snapshotId: snapshot.snapshotId,
          versionId: versionInfo.versionId,
          revenue: pnl.revenue,
          netProfit: pnl.netProfit,
          totalAssets: bs.totalAssets,
          balanced,
          dataComplete,
          confidence,
          isDraft: versionInfo.isDraft,
        }),
        confidence,
      });
      auditEntries.push(audit);
      recordStep(
        stepTelemetry,
        "audit_trail",
        "Audit Trail (PII Redacted)",
        stepStart,
      );

      await trace.update({
        output: {
          period: targetPeriod.periodLabel,
          dataComplete,
          balanced,
          confidence,
          escalated,
          isDraft: versionInfo.isDraft,
          snapshotId: snapshot.snapshotId,
          stepCount: stepTelemetry.length,
          totalStepDurationMs: stepTelemetry.reduce(
            (s, t) => s + t.durationMs,
            0,
          ),
        },
      });

      langfuse.event({
        name: "reporting-pipeline-complete",
        metadata: {
          entityId: params.entityId,
          periodLabel: targetPeriod.periodLabel,
          dataComplete,
          balanced,
          confidence,
          escalated,
          isDraft: versionInfo.isDraft,
          accountCount: snapshot.accountBalances.length,
        },
      });

      const result: ReportingPipelineResult = {
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
          : null,
        snapshotId: snapshot.snapshotId,
        versionId: versionInfo.versionId,
        isDraft: versionInfo.isDraft,
        auditEntries,
        durationMs: Date.now() - startTime,
      };

      setIdempotencyResult(idempotencyKey, result);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof TimeoutError;
      const errorAudit = createAuditEntry({
        agentId: "reporting-pipeline",
        action: "pipeline_failed",
        details: {
          entityId: params.entityId,
          error: isTimeout ? `Pipeline timed out: ${msg}` : msg,
          isTimeout,
        },
        confidence: 0,
      });
      auditEntries.push(errorAudit);

      recordFailedStep(
        stepTelemetry,
        "pipeline_error",
        "Pipeline Execution",
        telemetryStart,
        msg,
      );

      await trace.update({
        output: { status: "error", error: msg, isTimeout },
      });

      const errorResult: ReportingPipelineResult = {
        success: false,
        periodProcessed: params.periodId ?? "unknown",
        report: null,
        narrative: null,
        confidence: 0,
        dataComplete: false,
        balanced: false,
        escalated: true,
        escalationReason: msg,
        snapshotId: null,
        versionId: null,
        isDraft: false,
        auditEntries,
        durationMs: Date.now() - startTime,
      };
      return errorResult;
    }
  })(); // <-- IIFE invoked immediately

  return withTimeout(
    () => pipelinePromise,
    pipelineTimeout.maxExecutionMs,
    "reporting-pipeline",
  );
}
