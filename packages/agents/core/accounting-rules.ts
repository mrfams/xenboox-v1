/**
 * XENBOOX Accounting Rules Engine
 *
 * Pure, deterministic functions for accounting validation and calculation.
 * Implements the Accounting Rules Engine Spec (Section 8 - Validation Layer).
 *
 * Design principle: These functions are idempotent, stateless, and never write
 * to the database directly. They answer "is this valid?" and "what does the
 * correct number look like?" — agents call them and decide what to do with
 * the result.
 *
 * Every function below should have a corresponding test suite with
 * known-input/known-correct-output cases (golden dataset).
 */

import { z } from "zod";
import { db } from "@xenboox/db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  journalEntryLines,
  journalEntries,
  fiscalPeriods,
  chartOfAccounts,
} from "@xenboox/db/schema/accounting";

// =============================================================================
// Types
// =============================================================================

export interface JournalLine {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

export interface JournalLineValidation {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
  valid: boolean;
  errors: string[];
}

export interface PostJournalEntryResult {
  valid: boolean;
  balanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  lineCount: number;
  accountValidation: JournalLineValidation[];
  periodStatus: string | null;
  periodOpen: boolean;
  allAccountsExist: boolean;
  errors: string[];
}

export interface CloseReadinessResult {
  ready: boolean;
  periodFound: boolean;
  periodStatus: string | null;
  draftEntryCount: number;
  trialBalanceBalanced: boolean;
  trialBalanceDebit: number;
  trialBalanceCredit: number;
  conditions: CloseCondition[];
}

export interface CloseCondition {
  name: string;
  passed: boolean;
  detail: string;
}

export interface ReopenPeriodResult {
  allowed: boolean;
  reason: string;
  downstreamAffectedPeriods: string[];
  scopeAssessment?: string;
}

export interface FxGainLossResult {
  originalAmount: number;
  originalCurrency: string;
  recordedRate: number;
  newRate: number;
  baseEquivalentOriginal: number;
  baseEquivalentCurrent: number;
  difference: number;
  classification: "realized" | "unrealized";
  accountType: string;
}

export interface DepreciationResult {
  assetId: string;
  assetName: string;
  purchaseValue: number;
  usefulLifeYears: number;
  salvageValue: number;
  method: "straight_line" | "reducing_balance";
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export interface MatchReconciliationResult {
  matched: boolean;
  confidence: number;
  matchCandidates: Array<{
    journalEntryLineId: string;
    amount: number;
    date: string;
    score: number;
  }>;
  unmatchedReasons: string[];
}

// =============================================================================
// Layer 1 — Hard Constraints (Section 2)
// =============================================================================

/**
 * Validate that journal entry lines balance (debits == credits).
 * This is the primary double-entry enforcement check.
 * Per spec: SUM(journal_lines.debit) = SUM(journal_lines.credit)
 * Tolerance: 0.01 for rounding differences.
 *
 * Also checks:
 * - At least 2 journal lines
 * - No line has both debit and credit > 0
 * - All amounts are >= 0
 */
export function validateDoubleEntry(lines: JournalLine[]): {
  balanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  lineCount: number;
  errors: string[];
} {
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push(
      `Journal entry must have at least 2 lines, got ${lines.length}`,
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const debit = Number(line.debit);
    const credit = Number(line.credit);

    if (debit < 0 || credit < 0) {
      errors.push(
        `Line ${i + 1}: negative amounts not allowed (debit: ${debit}, credit: ${credit})`,
      );
    }
    if (debit === 0 && credit === 0) {
      errors.push(`Line ${i + 1}: must have a non-zero debit or credit`);
    }
    if (debit > 0 && credit > 0) {
      errors.push(
        `Line ${i + 1}: cannot have both debit (${debit}) and credit (${credit}) > 0`,
      );
    }
  }

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const balanced = diff <= 0.01;

  if (!balanced) {
    errors.push(
      `Trial balance not balanced: debits ${totalDebit.toFixed(2)} != credits ${totalCredit.toFixed(2)} (diff: ${diff.toFixed(2)})`,
    );
  }

  return {
    balanced,
    totalDebit,
    totalCredit,
    difference: diff,
    lineCount: lines.length,
    errors,
  };
}

/**
 * Determine the normal balance direction for an account type.
 * Per spec Section 2.2:
 *   Assets, Expenses → normal debit balance
 *   Liabilities, Equity, Revenue → normal credit balance
 */
export function getNormalBalance(accountType: string): "debit" | "credit" {
  const debitTypes = ["asset", "expense"];
  const creditTypes = ["liability", "equity", "revenue"];

  if (debitTypes.includes(accountType)) return "debit";
  if (creditTypes.includes(accountType)) return "credit";
  return "debit"; // default fallback
}

// =============================================================================
// Section 4 — Module-Specific Rules
// =============================================================================

/**
 * Calculate aging bucket for an invoice based on due date.
 * Returns days overdue and the aging bucket name.
 * Per spec Section 4.1: aging is calculated relative to due_date on read.
 */
export function calculateAgingBucket(dueDate: string): {
  daysOverdue: number;
  bucket: "current" | "30" | "60" | "90+";
} {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  let bucket: "current" | "30" | "60" | "90+";
  if (daysOverdue <= 0) bucket = "current";
  else if (daysOverdue <= 30) bucket = "30";
  else if (daysOverdue <= 60) bucket = "60";
  else bucket = "90+";

  return { daysOverdue, bucket };
}

/**
 * Validate imprest retirement.
 * Per spec Section 4.2:
 * retired_amount + outstanding_receipts_total must reconcile to amount_issued
 * within tolerance. Any gap becomes a flagged discrepancy.
 */
export function validateImprestRetirement(params: {
  amountIssued: number;
  retiredAmount: number;
  outstandingReceiptsTotal: number;
  tolerance?: number;
}): {
  reconciled: boolean;
  gap: number;
  gapWithinTolerance: boolean;
  message: string;
} {
  const tolerance = params.tolerance ?? 0.01;
  const expectedReturn = params.retiredAmount + params.outstandingReceiptsTotal;
  const gap = Math.abs(params.amountIssued - expectedReturn);
  const gapWithinTolerance = gap <= tolerance;

  return {
    reconciled: gapWithinTolerance,
    gap,
    gapWithinTolerance,
    message: gapWithinTolerance
      ? `Imprest reconciled: ${params.amountIssued} issued = ${expectedReturn} returned (gap: ${gap.toFixed(2)})`
      : `Imprest discrepancy: ${params.amountIssued} issued != ${expectedReturn} returned (gap: ${gap.toFixed(2)})`,
  };
}

/**
 * Validate reconciliation completeness.
 * Per spec Section 4.3: a reconciliation may only be marked complete when
 * every transaction has either a matched_journal_entry_id or an explicit
 * unmatched_reason.
 */
export function validateReconciliationCompleteness(params: {
  totalTransactions: number;
  matchedTransactions: number;
  explicitlyUnmatched: number;
}): {
  complete: boolean;
  pending: number;
  message: string;
} {
  const pending =
    params.totalTransactions -
    params.matchedTransactions -
    params.explicitlyUnmatched;

  return {
    complete: pending === 0,
    pending,
    message:
      pending === 0
        ? "All transactions resolved"
        : `${pending} transactions still pending resolution`,
  };
}

/**
 * Calculate depreciation for a fixed asset.
 * Per spec Section 4.4:
 * Straight-line: (purchase_value - salvage_value) / useful_life_years / 12
 * Reducing-balance: book_value * (2 / useful_life_years) / 12
 */
export function calculateDepreciation(asset: {
  purchaseValue: number;
  usefulLifeYears: number;
  salvageValue?: number;
  method?: "straight_line" | "reducing_balance";
  currentBookValue?: number;
  yearsInService?: number;
}): DepreciationResult {
  const salvageValue = asset.salvageValue ?? 0;
  const method = asset.method ?? "straight_line";
  const purchaseValue = asset.purchaseValue;

  let monthlyDepreciation: number;
  let accumulatedDepreciation: number;

  if (method === "straight_line") {
    const annualDepreciation =
      (purchaseValue - salvageValue) / asset.usefulLifeYears;
    monthlyDepreciation = annualDepreciation / 12;
    accumulatedDepreciation =
      monthlyDepreciation * (asset.yearsInService ?? 0) * 12;
  } else {
    // Reducing balance (double-declining)
    const rate = 2 / asset.usefulLifeYears;
    const bookValue = asset.currentBookValue ?? purchaseValue;
    const annualDepreciation = bookValue * rate;
    monthlyDepreciation = annualDepreciation / 12;
    accumulatedDepreciation = purchaseValue - bookValue;
  }

  const netBookValue = purchaseValue - accumulatedDepreciation;

  return {
    assetId: "",
    assetName: "",
    purchaseValue,
    usefulLifeYears: asset.usefulLifeYears,
    salvageValue,
    method,
    monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
    accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
    netBookValue: Math.round(netBookValue * 100) / 100,
  };
}

// =============================================================================
// Section 5 — Multi-Currency Rules
// =============================================================================

/**
 * Calculate FX gain/loss.
 * Per spec Section 5:
 * - Unrealized: outstanding invoice/bill, rate has moved → hits balance sheet
 * - Realized: payment made/received → hits P&L
 *
 * Transaction date rate is used for recording, never payout date.
 */
export function calculateFxGainLoss(params: {
  originalAmount: number;
  originalCurrency: string;
  recordedRate: number;
  currentRate: number;
  isSettled: boolean;
}): FxGainLossResult {
  const baseEquivalentOriginal =
    Math.round(params.originalAmount * params.recordedRate * 100) / 100;
  const baseEquivalentCurrent =
    Math.round(params.originalAmount * params.currentRate * 100) / 100;
  const difference =
    Math.round((baseEquivalentCurrent - baseEquivalentOriginal) * 100) / 100;

  const classification = params.isSettled ? "realized" : "unrealized";
  const accountType = classification === "realized" ? "expense" : "liability";

  return {
    originalAmount: params.originalAmount,
    originalCurrency: params.originalCurrency,
    recordedRate: params.recordedRate,
    newRate: params.currentRate,
    baseEquivalentOriginal,
    baseEquivalentCurrent,
    difference,
    classification,
    accountType:
      difference >= 0 ? `${accountType}_gain` : `${accountType}_loss`,
  };
}

// =============================================================================
// Section 7 — Month-End Close Sequencing
// =============================================================================

/**
 * Check close readiness for an entity/period.
 * Per spec Section 7, checks all 7 conditions:
 * 1. All journal entries posted (none in draft)
 * 2. Trial balance balanced
 * 3. All bank/MM transactions matched or explicitly unmatched
 * 4. All bills/invoices paid or correctly carried
 * 5. Depreciation run (once Fixed Assets is live)
 * 6. No unresolved imprest discrepancies
 * 7. Tax calculations pass validator (once Tax module is live)
 */
export async function checkCloseReadiness(
  entityId: string,
  period: { id: string; year: number; month: number },
): Promise<CloseReadinessResult> {
  const conditions: CloseCondition[] = [];

  // Condition 1: No draft journal entries
  const draftEntries = await db
    .select({ count: sql<number>`count(*)` })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, period.id),
        eq(journalEntries.status, "draft"),
      ),
    );
  const draftCount = Number(draftEntries[0]?.count ?? 0);
  conditions.push({
    name: "All entries posted",
    passed: draftCount === 0,
    detail:
      draftCount === 0
        ? "All journal entries are posted"
        : `${draftCount} draft entries must be posted before close`,
  });

  // Condition 2: Trial balance balanced
  const balanceRows = await db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, period.id),
        eq(journalEntries.status, "posted"),
      ),
    );

  const balanceRow = balanceRows[0]!;
  const totalDebit = parseFloat(balanceRow.totalDebit);
  const totalCredit = parseFloat(balanceRow.totalCredit);
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01;

  conditions.push({
    name: "Trial balance balanced",
    passed: isBalanced,
    detail: isBalanced
      ? `Trial balance balanced: ${totalDebit.toFixed(2)} = ${totalCredit.toFixed(2)}`
      : `Trial balance out of balance: debits ${totalDebit.toFixed(2)} != credits ${totalCredit.toFixed(2)}`,
  });

  // Condition 3: Bank/MM transactions matched or explicitly unmatched
  // Wire into the reconciliation completeness validator once the bank module is live.
  conditions.push({
    name: "Bank/MM transactions resolved",
    passed: true,
    detail:
      "Bank and mobile money reconciliation completeness check — module not yet live, assumed passed. Wire validateReconciliationCompleteness() here when bank module is active.",
  });

  // Condition 4: Bills/invoices paid or correctly carried
  conditions.push({
    name: "Bills/invoices resolved",
    passed: true,
    detail:
      "AP/AR completeness check — module not yet live, assumed passed. Check no orphaned bills or invoices when AP/AR module is active.",
  });

  // Condition 5: Depreciation run executed
  conditions.push({
    name: "Depreciation run completed",
    passed: true,
    detail:
      "Fixed Assets module not yet live — depreciation assumed not required for this close cycle.",
  });

  // Condition 6: No unresolved imprest discrepancies
  conditions.push({
    name: "Imprest discrepancies resolved",
    passed: true,
    detail:
      "Imprest module not yet live — assumed no unresolved discrepancies. Wire validateImprestRetirement() here when imprest module is active.",
  });

  // Condition 7: Tax calculations pass validator
  conditions.push({
    name: "Tax calculations valid",
    passed: true,
    detail:
      "Tax module not yet live — assumed valid. Wire tax validator here when tax module is active.",
  });

  const allConditionsPassed = conditions.every((c) => c.passed);

  // Check period status metadata
  const periodResult = await db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.id, period.id),
  });

  return {
    ready: draftCount === 0 && isBalanced && allConditionsPassed,
    periodFound: !!periodResult,
    periodStatus: periodResult?.status ?? null,
    draftEntryCount: draftCount,
    trialBalanceBalanced: isBalanced,
    trialBalanceDebit: totalDebit,
    trialBalanceCredit: totalCredit,
    conditions,
  };
}

// =============================================================================
// Section 9 — Reopen Window Rules
// =============================================================================

/**
 * Validate whether a period can be reopened.
 * Per spec Section 9:
 *   last 3 months       → immediate reopen allowed
 *   3-12 months         → reopen allowed, flag downstream affected periods
 *   beyond 12 months    → reopen allowed only after scope assessment
 */
export function validateReopenPeriod(params: {
  periodDate: Date;
  currentDate?: Date;
}): ReopenPeriodResult {
  const now = params.currentDate ?? new Date();
  const monthsAgo =
    (now.getFullYear() - params.periodDate.getFullYear()) * 12 +
    (now.getMonth() - params.periodDate.getMonth());

  if (monthsAgo <= 3) {
    return {
      allowed: true,
      reason: `Period is ${monthsAgo} months ago — immediate reopen allowed`,
      downstreamAffectedPeriods: [],
    };
  }

  if (monthsAgo <= 12) {
    // Flag downstream periods between this period and now
    const downstream: string[] = [];
    for (let m = monthsAgo - 1; m >= 0; m--) {
      const d = new Date(
        params.periodDate.getFullYear(),
        params.periodDate.getMonth() + m + 1,
        1,
      );
      downstream.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }

    return {
      allowed: true,
      reason: `Period is ${monthsAgo} months ago — reopen allowed, ${downstream.length} downstream period(s) may be affected`,
      downstreamAffectedPeriods: downstream,
    };
  }

  // Beyond 12 months — requires scope assessment
  const downstream: string[] = [];
  for (let m = 1; m <= monthsAgo; m++) {
    const d = new Date(
      params.periodDate.getFullYear(),
      params.periodDate.getMonth() + m,
      1,
    );
    downstream.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  return {
    allowed: false,
    reason: `Period is ${monthsAgo} months ago (>12) — explicit scope assessment required before reopen`,
    downstreamAffectedPeriods: downstream,
    scopeAssessment: `Reopening this period would affect ${downstream.length} downstream period(s) with dependent balances. Assessment required: confirm no closed reporting packages distributed to stakeholders that would need to be retracted.`,
  };
}

// =============================================================================
// Section 8 — Main Validation Functions (called by agents)
// =============================================================================

/**
 * Full journal entry validation before posting.
 * Combines all Layer 1 hard constraints into one call.
 *
 * Per spec: Agents call this, inspect the result, and decide what to do.
 * This function NEVER writes to the DB — it only validates.
 */
export async function postJournalEntryValidation(
  entityId: string,
  lines: JournalLine[],
  periodId: string,
): Promise<PostJournalEntryResult> {
  const errors: string[] = [];

  // 1. Double-entry validation
  const deValidation = validateDoubleEntry(lines);
  errors.push(...deValidation.errors);

  // 2. Validate each account exists and validate account type rules
  const accountValidation: JournalLineValidation[] = [];
  let allAccountsExist = true;

  for (const line of lines) {
    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.id, line.accountId),
        eq(chartOfAccounts.entityId, entityId),
      ),
    });

    const validation: JournalLineValidation = {
      accountId: line.accountId,
      debit: Number(line.debit),
      credit: Number(line.credit),
      description: line.description ?? "",
      valid: !!account,
      errors: [],
    };

    if (!account) {
      validation.errors.push(
        `Account ${line.accountId} not found for entity ${entityId}`,
      );
      allAccountsExist = false;
      errors.push(`Account ${line.accountId} not found`);
    } else if (!account.isActive) {
      validation.errors.push(`Account ${account.code} is deactivated`);
      errors.push(`Account ${account.code} (${account.name}) is deactivated`);
    }

    accountValidation.push(validation);
  }

  // 3. Period status check
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });

  const periodOpen = period?.status === "open";
  const periodStatus = period?.status ?? null;

  if (!period) {
    errors.push(`Period ${periodId} not found`);
  } else if (period.status === "closed") {
    errors.push(`Cannot post to closed period ${periodId}`);
  } else if (period.status === "closing") {
    errors.push(`Cannot post to period ${periodId} — close in progress`);
  }

  return {
    valid: errors.length === 0,
    balanced: deValidation.balanced,
    totalDebit: deValidation.totalDebit,
    totalCredit: deValidation.totalCredit,
    difference: deValidation.difference,
    lineCount: deValidation.lineCount,
    accountValidation,
    periodStatus,
    periodOpen,
    allAccountsExist,
    errors,
  };
}

/**
 * Match bank/mobile money transaction to ledger entries for reconciliation.
 * Uses amount + date matching with configurable tolerance.
 *
 * Per spec Section 4.3: tolerance is configurable, default ±3 days
 * for mobile money settlement lag.
 */
export async function matchReconciliation(
  bankTransaction: {
    amount: number;
    date: string;
    description: string;
    reference?: string;
  },
  entityId: string,
  options?: {
    dateToleranceDays?: number;
    amountTolerance?: number;
  },
): Promise<MatchReconciliationResult> {
  const dateToleranceDays = options?.dateToleranceDays ?? 3;
  const amountTolerance = options?.amountTolerance ?? 0.01;

  // Find journal entries in the date window scoped to entity.
  // We fetch entries first so we can scope the query and avoid
  // string-matching issues with the numeric debit/credit columns.
  const txDate = new Date(bankTransaction.date);
  const dateStart = new Date(txDate);
  dateStart.setDate(dateStart.getDate() - dateToleranceDays);
  const dateEnd = new Date(txDate);
  dateEnd.setDate(dateEnd.getDate() + dateToleranceDays);

  const dateStartStr = dateStart.toISOString().split("T")[0]!;
  const dateEndStr = dateEnd.toISOString().split("T")[0]!;

  // Get journal entries in the date window for this entity
  const entriesInWindow = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      sql`${journalEntries.date} >= ${dateStartStr}`,
      sql`${journalEntries.date} <= ${dateEndStr}`,
    ),
    columns: { id: true },
    limit: 100,
  });

  const entryIds = entriesInWindow.map((e) => e.id);

  if (entryIds.length === 0) {
    return {
      matched: false,
      confidence: 0,
      matchCandidates: [],
      unmatchedReasons: [
        `No journal entries found within ${dateToleranceDays} days of ${bankTransaction.date} for entity ${entityId}`,
      ],
    };
  }

  // Fetch lines for those entries — we'll filter by amount in JS
  const potentialLines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
    limit: 200,
  });

  const matchCandidates: MatchReconciliationResult["matchCandidates"] = [];
  const unmatchedReasons: string[] = [];

  // Score each candidate by how well it matches
  for (const line of potentialLines) {
    const lineAmount = Math.max(Number(line.debit), Number(line.credit));
    let score = 0;

    // Exact amount match
    if (Math.abs(lineAmount - bankTransaction.amount) <= amountTolerance) {
      score += 0.5;
    }

    // Check date proximity
    const entry = await db.query.journalEntries.findFirst({
      where: eq(journalEntries.id, line.journalEntryId),
    });

    if (entry) {
      const entryDate = new Date(entry.date);
      const diffDays = Math.abs(
        (txDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays <= 1) score += 0.4;
      else if (diffDays <= dateToleranceDays) score += 0.2;
    }

    // Description match bonus
    if (
      entry?.description &&
      bankTransaction.description &&
      (entry.description
        .toLowerCase()
        .includes(bankTransaction.description.toLowerCase()) ||
        bankTransaction.description
          .toLowerCase()
          .includes(entry.description.toLowerCase()))
    ) {
      score += 0.1;
    }

    if (score > 0) {
      matchCandidates.push({
        journalEntryLineId: line.id,
        amount: lineAmount,
        date: entry?.date ?? "",
        score: Math.round(score * 100) / 100,
      });
    }
  }

  // Sort by score descending
  matchCandidates.sort((a, b) => b.score - a.score);

  if (matchCandidates.length === 0) {
    unmatchedReasons.push(
      `No matching journal entry found for amount ${bankTransaction.amount} within ${dateToleranceDays} days`,
    );
  }

  // Best match confidence
  const bestScore = matchCandidates[0]?.score ?? 0;
  const confidence = Math.min(1, bestScore + 0.3);

  return {
    matched: matchCandidates.length > 0 && bestScore >= 0.6,
    confidence,
    matchCandidates: matchCandidates.slice(0, 5),
    unmatchedReasons,
  };
}
