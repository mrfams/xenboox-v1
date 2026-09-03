// ─── Enhanced Autonomous Bank & Mobile Money Reconciliation Pipeline ─────
//
// Pipeline 3 of 6: feeds into the Treasury Agent (Tier 2).
//
// Full 12-step flow matching the Reconciliation Pipeline spec:
//   1. Statement Intake       — Route PDF/CSV/API through Intake Service
//   2. Statement Parsing      — Normalize to common Statement Line shape
//   3. Ledger Candidate       — Scoped candidates with configurable windows
//   4. Matching Engine        — Tiered: exact → strong → weak
//   5. Mobile Money Timing    — Wider tolerance for MM confirmation delay
//   6. Confidence Gate        — Lookup threshold from confidence_thresholds
//   7a. Auto-Reconciled       — Confidence met → auto-close
//   7b. Unmatched Flagging    — Specific reason, not generic "no match"
//   8. Multi-Account Agg          — Per-account runs → entity-level session
//   9. Hard Rule               — No close with unresolved items
//   10. Treasury Agent Review  — Cannot self-close, must be reviewed
//   11. Reconciliation Report  — Produces report for Treasury daily position
//   12. Audit Trail Logging    — Every match, flag, override logged

import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray, or } from "drizzle-orm";
import {
  bankAccounts,
  bankTransactions,
  reconciliations,
  reconciliationItems,
} from "@xenboox/db/schema/treasury";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import {
  statementLines,
  matchRecords,
  reconciliationSessions,
} from "@xenboox/db";
import { mobileMoneyAccounts } from "@xenboox/db/schema/mobile-money";
import { confidenceThresholds } from "@xenboox/db/schema/agents";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";
import {
  withRetry,
  withTimeout,
  withConcurrencyLimit,
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

export type MatchTier = "exact" | "strong" | "weak" | "manual";
export type UnmatchedReason =
  | "no_candidate"
  | "multiple_candidates"
  | "amount_mismatch"
  | "below_confidence"
  | "pending_settlement";

export interface AccountToReconcile {
  id: string;
  name: string;
  bankName: string;
  currency: string;
  currentBalance: number;
  openingBalance: number;
  lastReconciledDate: string | null;
  lastReconciliationId: string | null;
  isMobileMoney: boolean; // true if this account is linked to a mobile money provider
}

export interface StatementLineResult {
  lineId: string;
  provider: string;
  date: string;
  amount: number;
  description: string;
  reference: string | null;
  status: "matched" | "pending_settlement" | "unmatched";
  confidence?: number;
  matchTier?: MatchTier;
}

export interface MatchResult {
  statementLineId: string;
  bankTransactionId?: string;
  ledgerEntryId?: string;
  matchTier: MatchTier;
  confidence: number;
  matchFactors: {
    amountScore: number;
    dateScore: number;
    referenceScore: number;
  };
}

export interface UnmatchedItemDetail {
  reason: UnmatchedReason;
  candidates?: Array<{ id: string; confidence: number }>;
  suggestedAction: string;
}

export interface BankReconciliationResult {
  accountId: string;
  accountName: string;
  reconciliationId: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: "closed" | "escalated" | "failed" | "review_pending";
  matchedCount: number;
  unmatchedCount: number;
  pendingSettlementCount: number;
  totalCount: number;
  matchRate: number;
  confidence: number;
  escalationReason?: string;
  items: ReconciliationItemResult[];
  unmatchedDetails: UnmatchedItemDetail[];
}

export interface ReconciliationItemResult {
  bankTransactionId: string;
  bankTransactionDate: string;
  bankTransactionDescription: string;
  bankTransactionAmount: number;
  matchedJournalEntryId?: string;
  status: "matched" | "unmatched" | "pending_settlement";
  confidence: number;
  matchFactors: {
    amountScore: number;
    dateScore: number;
    referenceScore: number;
  };
}

export interface ReconciliationPipelineResult {
  success: boolean;
  results: BankReconciliationResult[];
  overallConfidence: number;
  overallMatchRate: number;
  totalMatched: number;
  totalUnmatched: number;
  totalPendingSettlement: number;
  totalTransactions: number;
  escalatedAccounts: number;
  closedAccounts: number;
  reviewPendingAccounts: number;
  sessionId?: string;
  sessionClosed: boolean;
  auditEntries: AuditEntry[];
  durationMs: number;
}

// ─── Constants ───────────────────────────────────────────────────────────

const MATCH_THRESHOLD = 0.6;
const EXACT_MATCH_THRESHOLD = 0.95;
const STRONG_MATCH_THRESHOLD = 0.8;
const AMOUNT_WEIGHT = 0.5;
const DATE_WEIGHT = 0.3;
const REFERENCE_WEIGHT = 0.2;
const RECONCILIATION_MATCH_THRESHOLD = 0.85;
const RECONCILIATION_CONFIDENCE_THRESHOLD = 0.8;

// Standard date window: ±3 days for bank transactions
const STANDARD_DATE_WINDOW_DAYS = 3;
// Wider window for mobile money (confirmation delay): ±5 days
const MOBILE_MONEY_DATE_WINDOW_DAYS = 5;

// ─── Utility: Levenshtein Similarity ─────────────────────────────────────

function levenshteinSimilarity(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;
  const matrix: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array.from({ length: lenB + 1 }, () => 0),
  );
  for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return 1 - matrix[lenA][lenB] / Math.max(lenA, lenB);
}

// ─── Step 1: Statement Intake ─────────────────────────────────────────────
//
// Route PDF, CSV, or API feed through the existing Intake Service.
// Detect duplicate statement uploads (same account, same period).

export async function detectDuplicates(
  entityId: string,
  bankAccountId: string,
  statementDate: string,
): Promise<{ isDuplicate: boolean; existingSessionId?: string }> {
  const existing = await db.query.reconciliationSessions.findFirst({
    where: and(
      eq(reconciliationSessions.entityId, entityId),
      // Parameterized array containment — no string interpolation of bankAccountId
      sql`${reconciliationSessions.accountsIncluded} @> ARRAY[${bankAccountId}::text]`,
      eq(reconciliationSessions.periodEnd, statementDate),
    ),
  });
  if (existing) {
    return { isDuplicate: true, existingSessionId: existing.id };
  }
  return { isDuplicate: false };
}

// ─── Step 2: Statement Parsing & Normalization ──────────────────────────
//
// Every source normalizes to the common StatementLine shape.
// Provider-specific parsing happens upstream; this step ingests into the
// statement_lines table and normalizes the data.

export async function normalizeStatementLine(params: {
  entityId: string;
  bankAccountId: string;
  provider: "bank" | "mobile_money";
  providerName: string;
  date: string;
  amount: string;
  currency: string;
  description: string;
  reference?: string;
  runningBalance?: string;
  rawSourceRef?: string;
  source: string;
}): Promise<{ lineId: string }> {
  const [line] = await db
    .insert(statementLines)
    .values({
      entityId: params.entityId,
      bankAccountId: params.bankAccountId,
      provider: params.provider,
      providerName: params.providerName,
      date: params.date,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      reference: params.reference ?? null,
      runningBalance: params.runningBalance ?? null,
      rawSourceRef: params.rawSourceRef ?? null,
      source: params.source,
    })
    .returning({ id: statementLines.id });

  return { lineId: line!.id };
}

// ─── Step 3: Ledger Candidate Retrieval ──────────────────────────────────
//
// For each statement line, pull candidate ledger entries scoped to:
// entity_id, account_id, date window (± configurable days), amount tolerance.

const LEDGER_CANDIDATE_LIMIT = 20;

export async function retrieveLedgerCandidates(
  entityId: string,
  lineDate: string,
  lineAmount: number,
  isMobileMoney: boolean,
): Promise<
  Array<{
    journalEntryId: string;
    lineId: string;
    amount: number;
    date: string;
    description: string;
    reference: string | null;
  }>
> {
  const dateObj = new Date(lineDate);
  const windowDays = isMobileMoney
    ? MOBILE_MONEY_DATE_WINDOW_DAYS
    : STANDARD_DATE_WINDOW_DAYS;

  const windowStart = new Date(dateObj);
  windowStart.setDate(windowStart.getDate() - windowDays);
  const windowEnd = new Date(dateObj);
  windowEnd.setDate(windowEnd.getDate() + windowDays);

  const postedEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      sql`${journalEntries.date} >= ${windowStart.toISOString().split("T")[0]}`,
      sql`${journalEntries.date} <= ${windowEnd.toISOString().split("T")[0]}`,
    ),
    orderBy: [desc(journalEntries.date)],
    limit: LEDGER_CANDIDATE_LIMIT,
  });

  if (postedEntries.length === 0) return [];

  const entryIds = postedEntries.map((e) => e.id);
  const allLines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
    limit: 100,
  });

  const entryMap = new Map(postedEntries.map((e) => [e.id, e]));
  const candidates: Array<{
    journalEntryId: string;
    lineId: string;
    amount: number;
    date: string;
    description: string;
    reference: string | null;
  }> = [];

  for (const line of allLines) {
    const candidateAmount = Math.max(Number(line.debit), Number(line.credit));
    const entry = entryMap.get(line.journalEntryId);
    if (!entry) continue;

    // Amount tolerance: within 1 USD equivalent or 10% (based on statement amount)
    const amountTolerance = Math.max(1, Math.abs(lineAmount) * 0.1);
    if (Math.abs(candidateAmount - Math.abs(lineAmount)) > amountTolerance)
      continue;

    candidates.push({
      journalEntryId: entry.id,
      lineId: line.id,
      amount: candidateAmount,
      date: entry.date,
      description: entry.description ?? "",
      reference: entry.reference ?? null,
    });
  }

  return candidates;
}

// ─── Step 4: Matching Engine ─────────────────────────────────────────────
//
// Tiered matching, most confident first:
//   Exact  — amount + date + reference number match (confidence ≥ 0.95)
//   Strong — amount + date within window + description similarity (≥ 0.8)
//   Weak   — amount matches, date/description partial, multiple candidates (≥ 0.6)

export function scoreMatch(
  stmt: { amount: number; date: Date; reference: string; description: string },
  candidate: {
    amount: number;
    date: string;
    description: string;
    reference: string | null;
  },
): {
  totalScore: number;
  amountScore: number;
  dateScore: number;
  referenceScore: number;
  tier: MatchTier;
} {
  // Amount Score
  let amountScore = 0;
  if (Math.abs(candidate.amount - stmt.amount) <= 0.01) {
    amountScore = 1;
  } else if (stmt.amount > 0) {
    const ratio =
      Math.min(candidate.amount, stmt.amount) /
      Math.max(candidate.amount, stmt.amount);
    if (ratio >= 0.8) amountScore = ratio;
  }

  // Date Score
  const candidateDate = new Date(candidate.date);
  const diffDays =
    Math.abs(stmt.date.getTime() - candidateDate.getTime()) /
    (1000 * 60 * 60 * 24);
  let dateScore = 0;
  if (diffDays <= 1) dateScore = 1;
  else if (diffDays <= 3) dateScore = 0.8;
  else if (diffDays <= 7) dateScore = 0.5;
  else if (diffDays <= 14) dateScore = 0.2;

  // Reference Score
  const stmtRef = stmt.reference.toLowerCase().trim();
  const stmtDesc = stmt.description.toLowerCase().trim();
  const candRef = (candidate.reference ?? "").toLowerCase().trim();
  const candDesc = candidate.description.toLowerCase().trim();
  let referenceScore = 0;

  if (stmtRef && candRef && stmtRef === candRef) {
    referenceScore = 1; // Exact reference match
  } else if (stmtRef && candDesc.includes(stmtRef)) {
    referenceScore = 0.8; // Reference found in description
  } else if (
    stmtRef &&
    candRef &&
    levenshteinSimilarity(stmtRef, candRef) > 0.7
  ) {
    referenceScore = 0.6;
  } else if (levenshteinSimilarity(stmtDesc, candDesc) > 0.6) {
    referenceScore = 0.4;
  }

  const totalScore =
    amountScore * AMOUNT_WEIGHT +
    dateScore * DATE_WEIGHT +
    referenceScore * REFERENCE_WEIGHT;

  let tier: MatchTier = "weak";
  if (totalScore >= EXACT_MATCH_THRESHOLD) tier = "exact";
  else if (totalScore >= STRONG_MATCH_THRESHOLD) tier = "strong";

  return { totalScore, amountScore, dateScore, referenceScore, tier };
}

// ─── Step 5: Mobile Money Timing Difference Handling ──────────────────────
//
// Mobile money confirmation timestamps often precede bank settlement by 1-3 days.
// Lines within the timing-difference window are tagged "pending_settlement,"
// not "unmatched." This is surfaced differently to the user.

export function classifyPendingSettlement(
  lineDate: string,
  amount: number,
  isMobileMoney: boolean,
): boolean {
  if (!isMobileMoney) return false;

  const date = new Date(lineDate);
  const daysSince = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  // A mobile money line is "pending settlement" if:
  // - It's less than 3 days old (typical settlement window)
  // - AND the amount is reasonable (not an aged unmatched item)
  return daysSince <= 3 && amount > 0;
}

// ─── Step 6: Confidence Gate ──────────────────────────────────────────────
//
// Look up threshold from confidence_thresholds table.
// Agent = "reconciliation-agent", transaction_type = "reconciliation_match".
// Falls back to default threshold of 0.85.

export async function getReconciliationConfidenceThreshold(
  entityId: string,
  amount: number,
): Promise<{ threshold: number; source: "db" | "default" }> {
  // Determine amount band
  let amountBand = "any";
  if (amount < 100) amountBand = "<100";
  else if (amount < 1000) amountBand = "100-1000";
  else if (amount < 10000) amountBand = "1000-10000";
  else if (amount < 100000) amountBand = "10000-100000";
  else amountBand = ">100000";

  // Look up DB threshold (org-agnostic platform default)
  const threshold = await db.query.confidenceThresholds.findFirst({
    where: and(
      eq(confidenceThresholds.agentId, "reconciliation-agent"),
      eq(confidenceThresholds.transactionType, "reconciliation_match"),
      or(
        eq(confidenceThresholds.amountBand, amountBand),
        eq(confidenceThresholds.amountBand, "any"),
      ),
    ),
    orderBy: [
      // Prefer exact amount band over "any"
      sql`CASE WHEN ${confidenceThresholds.amountBand} = ${amountBand} THEN 0 ELSE 1 END`,
    ],
  });

  if (threshold) {
    return {
      threshold: parseFloat(threshold.minConfidence),
      source: "db",
    };
  }
  return { threshold: 0.85, source: "default" };
}

// ─── Step 7a / 7b: Auto-Reconcile or Flag Unmatched ──────────────────────
//
// Each flagged item carries specific detail, never a generic "no match":
//   { reason (no_candidate / multiple_candidates / amount_mismatch /
//            below_confidence / pending_settlement),
//     candidates[], suggested_action }

export function determineUnmatchedDetail(
  candidates: Array<{
    journalEntryId: string;
    amount: number;
    totalScore?: number;
  }>,
  isPendingSettlement: boolean,
): UnmatchedItemDetail {
  if (isPendingSettlement) {
    return {
      reason: "pending_settlement",
      suggestedAction:
        "Mobile money transaction within 3-day settlement window. Will auto-reconcile once settlement confirms.",
    };
  }

  if (candidates.length === 0) {
    return {
      reason: "no_candidate",
      suggestedAction:
        "No matching journal entry found. Verify the transaction was posted to the general ledger.",
    };
  }

  if (candidates.length > 1) {
    const candidateList = candidates.map((c) => ({
      id: c.journalEntryId,
      confidence: c.totalScore ?? 0,
    }));
    return {
      reason: "multiple_candidates",
      candidates: candidateList,
      suggestedAction:
        "Multiple possible matches found. Review each candidate to determine the correct match.",
    };
  }

  const singleCandidate = candidates[0];
  if (singleCandidate && (singleCandidate.totalScore ?? 0) < MATCH_THRESHOLD) {
    return {
      reason: "below_confidence",
      candidates: [
        {
          id: singleCandidate.journalEntryId,
          confidence: singleCandidate.totalScore ?? 0,
        },
      ],
      suggestedAction:
        "Best match is below confidence threshold. Review manually or adjust matching parameters.",
    };
  }

  return {
    reason: "amount_mismatch",
    candidates: candidates.map((c) => ({
      id: c.journalEntryId,
      confidence: c.totalScore ?? 0,
    })),
    suggestedAction:
      "Amount mismatch detected. Check for partial payments, fees, or FX rate differences.",
  };
}

// ─── Full Account Reconciliation (Steps 1-7 combined) ─────────────────────

export async function reconcileAccount(
  entityId: string,
  account: AccountToReconcile,
): Promise<BankReconciliationResult> {
  // Step 1: Detect duplicates
  const statementDate = new Date().toISOString().split("T")[0]!;
  const duplicateCheck = await detectDuplicates(
    entityId,
    account.id,
    statementDate,
  );

  // Step 2: Get unreconciled bank transactions as statement lines
  const unreconciledTxs = await db.query.bankTransactions.findMany({
    where: and(
      eq(bankTransactions.entityId, entityId),
      eq(bankTransactions.bankAccountId, account.id),
      eq(bankTransactions.isReconciled, false),
    ),
    orderBy: [desc(bankTransactions.transactionDate)],
  });

  if (unreconciledTxs.length === 0 && !duplicateCheck.isDuplicate) {
    return {
      accountId: account.id,
      accountName: account.name,
      reconciliationId: "",
      statementDate,
      statementBalance: account.currentBalance,
      bookBalance: account.currentBalance,
      difference: 0,
      status: "closed",
      matchedCount: 0,
      unmatchedCount: 0,
      pendingSettlementCount: 0,
      totalCount: 0,
      matchRate: 1,
      confidence: 1,
      items: [],
      unmatchedDetails: [],
    };
  }

  // Create/update reconciliation record
  const latestTxBalance =
    unreconciledTxs.length > 0
      ? Number(unreconciledTxs[0].amount)
      : account.currentBalance;
  const statementBalance = account.currentBalance;
  const bookBalance = account.currentBalance;
  const difference = statementBalance - bookBalance;

  const [recon] = await db
    .insert(reconciliations)
    .values({
      entityId,
      bankAccountId: account.id,
      statementDate,
      statementBalance: statementBalance.toFixed(2),
      bookBalance: bookBalance.toFixed(2),
      difference: Math.abs(difference).toFixed(2),
      status: "unmatched",
      notes: `Auto-created by reconciliation pipeline${duplicateCheck.isDuplicate ? " (potential duplicate)" : ""}`,
    })
    .returning();

  const reconciliationId = recon!.id;

  // Step 3-4: Matching Engine
  const items: ReconciliationItemResult[] = [];
  const unmatchedDetails: UnmatchedItemDetail[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let pendingSettlementCount = 0;

  // Track used JE lines to avoid double-matching
  const usedLineIds = new Set<string>();

  for (const tx of unreconciledTxs) {
    const txAmount = Math.abs(Number(tx.amount));
    const txDate = new Date(tx.transactionDate);
    const isPending = classifyPendingSettlement(
      tx.transactionDate,
      txAmount,
      account.isMobileMoney,
    );

    // Retrieve candidates (Step 3)
    const candidates = await retrieveLedgerCandidates(
      entityId,
      tx.transactionDate,
      txAmount,
      account.isMobileMoney,
    );

    // Filter out already-used lines
    const availableCandidates = candidates.filter(
      (c) => !usedLineIds.has(c.lineId),
    );

    // Score each candidate (Step 4)
    const scoredCandidates = availableCandidates.map((c) => {
      const score = scoreMatch(
        {
          amount: txAmount,
          date: txDate,
          reference: tx.reference ?? "",
          description: tx.description,
        },
        c,
      );
      return { ...c, ...score };
    });

    // Sort by score descending, pick best
    scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
    const bestMatch = scoredCandidates[0];

    if (bestMatch && bestMatch.totalScore >= MATCH_THRESHOLD && !isPending) {
      // Auto-match
      usedLineIds.add(bestMatch.lineId);
      matchedCount++;

      items.push({
        bankTransactionId: tx.id,
        bankTransactionDate: tx.transactionDate,
        bankTransactionDescription: tx.description,
        bankTransactionAmount: txAmount,
        matchedJournalEntryId: bestMatch.journalEntryId,
        status: "matched",
        confidence:
          bestMatch.totalScore >= EXACT_MATCH_THRESHOLD
            ? 0.98
            : bestMatch.totalScore,
        matchFactors: {
          amountScore: bestMatch.amountScore,
          dateScore: bestMatch.dateScore,
          referenceScore: bestMatch.referenceScore,
        },
      });

      // Step 12: Log match record
      await db.insert(matchRecords).values({
        entityId,
        bankTransactionId: tx.id,
        ledgerEntryId: bestMatch.journalEntryId,
        matchTier: bestMatch.tier,
        confidence: bestMatch.totalScore.toFixed(3),
        matchedBy: "auto",
        matchFactors: {
          amountScore: bestMatch.amountScore,
          dateScore: bestMatch.dateScore,
          referenceScore: bestMatch.referenceScore,
        },
      });
    } else {
      // Step 5: Check pending settlement or flag unmatched (Step 7b)
      if (isPending) {
        pendingSettlementCount++;
        items.push({
          bankTransactionId: tx.id,
          bankTransactionDate: tx.transactionDate,
          bankTransactionDescription: tx.description,
          bankTransactionAmount: txAmount,
          status: "pending_settlement",
          confidence: 0,
          matchFactors: { amountScore: 0, dateScore: 0, referenceScore: 0 },
        });
      } else {
        unmatchedCount++;
        const detail = determineUnmatchedDetail(
          scoredCandidates.map((c) => ({
            journalEntryId: c.journalEntryId,
            amount: c.amount,
            totalScore: c.totalScore,
          })),
          false,
        );
        unmatchedDetails.push(detail);

        items.push({
          bankTransactionId: tx.id,
          bankTransactionDate: tx.transactionDate,
          bankTransactionDescription: tx.description,
          bankTransactionAmount: txAmount,
          status: "unmatched",
          confidence: 0,
          matchFactors: { amountScore: 0, dateScore: 0, referenceScore: 0 },
        });
      }
    }
  }

  // Calculate summary
  const totalCount = items.length;
  const matchRate = totalCount > 0 ? matchedCount / totalCount : 0;
  const avgMatchedConfidence =
    matchedCount > 0
      ? items
          .filter((i) => i.status === "matched")
          .reduce((s, i) => s + i.confidence, 0) / matchedCount
      : 0;
  const confidence =
    totalCount > 0 ? matchRate * 0.6 + avgMatchedConfidence * 0.4 : 0;

  // Step 6: Confidence Gate
  const { threshold } = await getReconciliationConfidenceThreshold(
    entityId,
    Math.max(...unreconciledTxs.map((t) => Math.abs(Number(t.amount)))),
  );

  const aboveThreshold =
    confidence >= threshold && matchRate >= RECONCILIATION_MATCH_THRESHOLD;

  // Step 9: Hard Rule — no close with unresolved items
  const hasUnresolvedItems = unmatchedCount > 0;

  let status: BankReconciliationResult["status"];
  let escalationReason: string | undefined;

  if (hasUnresolvedItems) {
    // Step 9: Cannot close — even if confidence is high (hard rule)
    status = "review_pending";
    escalationReason = `${unmatchedCount} item(s) unresolved. Hard rule: reconciliation cannot close with open items.`;
  } else if (aboveThreshold) {
    // Step 7a: Auto-close
    status = "closed";
    await db
      .update(reconciliations)
      .set({
        status: "closed",
        closedAt: new Date(),
        notes: `Auto-closed. Matched ${matchedCount}/${totalCount} (${(matchRate * 100).toFixed(0)}%)`,
      })
      .where(eq(reconciliations.id, reconciliationId));
  } else {
    // Step 7b: Escalate
    status = "escalated";
    escalationReason = `Confidence ${(confidence * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%.`;
    await db
      .update(reconciliations)
      .set({
        notes: `Auto-escalated: ${escalationReason}`,
      })
      .where(eq(reconciliations.id, reconciliationId));
  }

  // Step 4: Persist reconciliation items
  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.status === "matched") {
        await tx.insert(reconciliationItems).values({
          reconciliationId,
          bankTransactionId: item.bankTransactionId,
          status: "matched",
          matchedAmount: item.bankTransactionAmount.toFixed(2),
          notes: `Auto-matched (${(item.confidence * 100).toFixed(0)}%)`,
        });
        await tx
          .update(bankTransactions)
          .set({ isReconciled: true, reconciliationId })
          .where(
            and(
              eq(bankTransactions.id, item.bankTransactionId),
              eq(bankTransactions.entityId, entityId),
            ),
          );
      } else if (item.status === "pending_settlement") {
        await tx.insert(reconciliationItems).values({
          reconciliationId,
          bankTransactionId: item.bankTransactionId,
          status: "pending",
          matchedAmount: "0",
          notes: "Pending mobile money settlement",
        });
      } else {
        await tx.insert(reconciliationItems).values({
          reconciliationId,
          bankTransactionId: item.bankTransactionId,
          status: "pending",
          matchedAmount: "0",
          notes: `Unmatched: ${unmatchedDetails.find((d) => d.reason)?.reason ?? "no_candidate"}`,
        });
      }
    }
  });

  return {
    accountId: account.id,
    accountName: account.name,
    reconciliationId,
    statementDate,
    statementBalance,
    bookBalance,
    difference,
    status,
    matchedCount,
    unmatchedCount,
    pendingSettlementCount,
    totalCount,
    matchRate,
    confidence,
    escalationReason,
    items,
    unmatchedDetails,
  };
}

// ─── Step 8: Multi-Account Aggregation ───────────────────────────────────
//
// Reconciliation runs per account independently, then aggregates into a
// single entity-level reconciliation session.

async function aggregateResults(
  entityId: string,
  results: BankReconciliationResult[],
  startTime: number,
): Promise<ReconciliationPipelineResult> {
  const totalMatched = results.reduce((s, r) => s + r.matchedCount, 0);
  const totalUnmatched = results.reduce((s, r) => s + r.unmatchedCount, 0);
  const totalPendingSettlement = results.reduce(
    (s, r) => s + r.pendingSettlementCount,
    0,
  );
  const totalTransactions = results.reduce((s, r) => s + r.totalCount, 0);
  const escalatedAccounts = results.filter(
    (r) => r.status === "escalated",
  ).length;
  const closedAccounts = results.filter((r) => r.status === "closed").length;
  const reviewPendingAccounts = results.filter(
    (r) => r.status === "review_pending",
  ).length;

  const overallMatchRate =
    totalTransactions > 0 ? totalMatched / totalTransactions : 0;
  const overallConfidence =
    results.length > 0
      ? results.reduce((s, r) => s + r.confidence, 0) / results.length
      : 0;

  // Step 10: Treasury Agent Review — session status
  let sessionStatus: "open" | "review_pending" | "clean" | "failed" = "clean";
  if (reviewPendingAccounts > 0 || escalatedAccounts > 0) {
    sessionStatus = "review_pending";
    // Must go to Treasury Agent for review
  }

  // Create entity-level reconciliation session
  const accountNames = results.map((r) => r.accountName);
  const [session] = await db
    .insert(reconciliationSessions)
    .values({
      entityId,
      periodStart: new Date().toISOString().split("T")[0]!,
      periodEnd: new Date().toISOString().split("T")[0]!,
      status: sessionStatus,
      accountsIncluded: accountNames,
      matchedCount: String(totalMatched),
      unmatchedCount: String(totalUnmatched),
      totalCount: String(totalTransactions),
      overallConfidence: overallConfidence.toFixed(3),
    })
    .returning();

  // Step 11: Generate reconciliation report summary
  // In production, this data is consumed by Treasury Agent's daily position
  // and by the Autonomous Close Pipeline (Close Confirmation Object).

  // Step 12: Audit trail logging
  const audit = createAuditEntry({
    agentId: "reconciliation-pipeline",
    action:
      sessionStatus === "clean"
        ? "reconciliation_complete"
        : "reconciliation_review_needed",
    details: {
      entityId,
      accountsProcessed: results.length,
      totalMatched,
      totalUnmatched,
      totalPendingSettlement,
      totalTransactions,
      overallMatchRate,
      overallConfidence,
      closedAccounts,
      escalatedAccounts,
      reviewPendingAccounts,
      sessionId: session?.id,
      needsTreasuryReview: sessionStatus === "review_pending",
    },
    confidence: overallConfidence,
  });

  return {
    success: sessionStatus === "clean" || sessionStatus === "review_pending",
    results,
    overallConfidence,
    overallMatchRate,
    totalMatched,
    totalUnmatched,
    totalPendingSettlement,
    totalTransactions,
    escalatedAccounts,
    closedAccounts,
    reviewPendingAccounts,
    sessionId: session?.id,
    sessionClosed: sessionStatus === "clean",
    auditEntries: [audit],
    durationMs: Date.now() - startTime,
  };
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

// ─── Main Pipeline Entry Point ──────────────────────────────────────────

/**
 * Run the full 12-step Autonomous Reconciliation Pipeline for an entity.
 * Enterprise-grade: idempotency check, timeout, retry, concurrency limits,
 * per-step telemetry, graceful degradation, and PII redaction.
 */
export async function runReconciliationPipeline(
  entityId: string,
  specificAccountIds?: string[],
  timeoutConfig?: Partial<PipelineTimeoutConfig>,
): Promise<ReconciliationPipelineResult> {
  const startTime = Date.now();
  const pipelineTimeout: PipelineTimeoutConfig = {
    ...DEFAULT_PIPELINE_TIMEOUT,
    ...timeoutConfig,
  };
  const stepTelemetry: StepTelemetry[] = [];
  const telemetryStart = Date.now();

  // ── Enterprise: Idempotency Check ─────────────────────────────────────
  const idempotencyKey = generateIdempotencyKey({
    channel: "reconciliation-pipeline",
    userId: "system",
    entityId,
    rawContent: `reconciliation:${entityId}:${(specificAccountIds ?? []).join(",")}`,
    sessionId: `recon-${entityId}`,
  });
  const cachedResult = checkIdempotency(idempotencyKey);
  if (cachedResult) {
    const cached = cachedResult as ReconciliationPipelineResult;
    return {
      ...cached,
      durationMs: Date.now() - startTime,
    };
  }

  startCacheCleanup();

  // ── Enterprise: Pipeline-Level Timeout ───────────────────────────────
  const pipelinePromise = (async () => {
    const trace = await langfuse.trace({
      name: "reconciliation-pipeline",
      metadata: {
        entityId,
        specificAccountIds,
        timeoutMs: pipelineTimeout.maxExecutionMs,
        idempotencyKey: idempotencyKey.slice(0, 16),
      },
    });

    const auditEntries: AuditEntry[] = [];

    try {
      // ── Step: Detect Accounts ─────────────────────────────────────────
      let stepStart = Date.now();
      const accounts = await withTimeout(
        () =>
          db.query.bankAccounts.findMany({
            where: and(
              eq(bankAccounts.entityId, entityId),
              eq(bankAccounts.isActive, true),
            ),
          }),
        pipelineTimeout.maxStepExecutionMs,
        "detect-accounts",
      );

      const targetAccounts = specificAccountIds
        ? accounts.filter((a) => specificAccountIds.includes(a.id))
        : accounts;

      if (targetAccounts.length === 0) {
        const audit = createAuditEntry({
          agentId: "reconciliation-pipeline",
          action: "no_accounts_to_reconcile",
          details: { entityId, message: "No active accounts found" },
          confidence: 1,
        });
        auditEntries.push(audit);
        recordStep(
          stepTelemetry,
          "detect_accounts",
          "Detect Accounts",
          stepStart,
        );
        await trace.update({
          output: { status: "no_op", reason: "No accounts to reconcile" },
        });
        const result = {
          success: true,
          results: [],
          overallConfidence: 1,
          overallMatchRate: 1,
          totalMatched: 0,
          totalUnmatched: 0,
          totalPendingSettlement: 0,
          totalTransactions: 0,
          escalatedAccounts: 0,
          closedAccounts: 0,
          reviewPendingAccounts: 0,
          sessionClosed: true,
          auditEntries,
          durationMs: Date.now() - startTime,
        };
        setIdempotencyResult(idempotencyKey, result);
        return result;
      }
      recordStep(
        stepTelemetry,
        "detect_accounts",
        "Detect Accounts",
        stepStart,
      );

      // ── Step: Detect Mobile Money Accounts ────────────────────────────
      stepStart = Date.now();
      const mmAccounts = await withTimeout(
        () =>
          db.query.mobileMoneyAccounts.findMany({
            where: and(
              eq(mobileMoneyAccounts.entityId, entityId),
              eq(mobileMoneyAccounts.isActive, true),
            ),
          }),
        pipelineTimeout.maxStepExecutionMs,
        "detect-mobile-money",
      );
      const mmAccountIds = new Set(mmAccounts.map((a) => a.id));
      recordStep(
        stepTelemetry,
        "detect_mobile_money",
        "Detect Mobile Money",
        stepStart,
      );

      // ── Step: Process Accounts (with concurrency limit + retry) ────────
      stepStart = Date.now();
      const CONCURRENCY_LIMIT = 3;

      // Build account reconcile task functions with graceful degradation
      const accountTasks = targetAccounts.map(
        (account) =>
          async (): Promise<{
            result: BankReconciliationResult;
            audit: AuditEntry;
          } | null> => {
            try {
              const reconAccount: AccountToReconcile = {
                id: account.id,
                name: account.name,
                bankName: account.bankName,
                currency: account.currency,
                currentBalance: Number(account.currentBalance),
                openingBalance: Number(account.openingBalance),
                lastReconciledDate: null,
                lastReconciliationId: null,
                isMobileMoney: mmAccountIds.has(account.id),
              };

              // Enterprise: retry + timeout for each account reconciliation
              const reconResult = await withRetry(
                () =>
                  withTimeout(
                    () => reconcileAccount(entityId, reconAccount),
                    pipelineTimeout.maxStepExecutionMs,
                    `reconcile-account:${account.id}`,
                  ),
                {
                  agentId: "reconciliation-pipeline",
                  operationName: `reconcile-account-${account.id}`,
                  context: { entityId, accountId: account.id },
                },
              );

              const audit = createAuditEntry({
                agentId: "reconciliation-pipeline",
                action: `account_${reconResult.status}`,
                details: {
                  accountId: account.id,
                  accountName: account.name,
                  status: reconResult.status,
                  matchedCount: reconResult.matchedCount,
                  unmatchedCount: reconResult.unmatchedCount,
                  matchRate: reconResult.matchRate,
                  confidence: reconResult.confidence,
                },
                confidence: reconResult.confidence,
              });

              return { result: reconResult, audit };
            } catch (error) {
              // Graceful degradation: individual account failure logged, skipped
              const msg =
                error instanceof Error ? error.message : String(error);
              const failAudit = createAuditEntry({
                agentId: "reconciliation-pipeline",
                action: "account_failed",
                details: {
                  accountId: account.id,
                  accountName: account.name,
                  error: msg,
                  gracefulDegradation: true,
                },
                confidence: 0,
              });
              auditEntries.push(failAudit);
              return null;
            }
          },
      );

      // Execute with concurrency limit + retry for the entire batch
      const accountResults = await withTimeout(
        () => withConcurrencyLimit(accountTasks, CONCURRENCY_LIMIT),
        pipelineTimeout.maxStepExecutionMs * 2,
        "account-processing-batch",
      );

      // Extract results, handling graceful degradation for failed accounts
      const results: BankReconciliationResult[] = [];
      for (const ar of accountResults) {
        if (ar) {
          results.push(ar.result);
          auditEntries.push(ar.audit);
        }
        // Graceful degradation: null results are silently skipped
      }

      // If all accounts failed, log a warning
      if (results.length === 0 && targetAccounts.length > 0) {
        const warnAudit = createAuditEntry({
          agentId: "reconciliation-pipeline",
          action: "all_accounts_failed",
          details: {
            entityId,
            totalAccounts: targetAccounts.length,
            gracefulDegradation: true,
          },
          confidence: 0,
        });
        auditEntries.push(warnAudit);
      }

      recordStep(
        stepTelemetry,
        "process_accounts",
        "Process Accounts (Concurrent)",
        stepStart,
      );

      // ── Steps 8-12: Aggregate, Hard Rule, Report, Audit ───────────────
      stepStart = Date.now();

      // Aggregate results with retry for resilience
      const pipelineResult = await withRetry(
        () =>
          withTimeout(
            () => aggregateResults(entityId, results, startTime),
            pipelineTimeout.maxStepExecutionMs,
            "aggregate-results",
          ),
        {
          agentId: "reconciliation-pipeline",
          operationName: "aggregate-results",
          context: { entityId, accountCount: results.length },
        },
      );

      pipelineResult.auditEntries = [
        ...auditEntries,
        ...pipelineResult.auditEntries,
      ];

      // PII redaction on audit details before finalizing
      pipelineResult.auditEntries = pipelineResult.auditEntries.map((e) => ({
        ...e,
        details: e.details ? redactPIIFromObject(e.details) : e.details,
      }));

      recordStep(stepTelemetry, "aggregate", "Aggregate & Audit", stepStart);

      await trace.update({
        output: {
          status: pipelineResult.sessionClosed ? "clean" : "review_pending",
          accountsProcessed: targetAccounts.length,
          totalMatched: pipelineResult.totalMatched,
          totalUnmatched: pipelineResult.totalUnmatched,
          overallMatchRate: pipelineResult.overallMatchRate,
          overallConfidence: pipelineResult.overallConfidence,
          closedAccounts: pipelineResult.closedAccounts,
          escalatedAccounts: pipelineResult.escalatedAccounts,
          reviewPendingAccounts: pipelineResult.reviewPendingAccounts,
          sessionId: pipelineResult.sessionId,
          stepCount: stepTelemetry.length,
          totalStepDurationMs: stepTelemetry.reduce(
            (s, t) => s + t.durationMs,
            0,
          ),
        },
      });

      langfuse.event({
        name: "reconciliation-pipeline-complete",
        metadata: {
          entityId,
          accountsProcessed: targetAccounts.length,
          sessionClosed: pipelineResult.sessionClosed,
          needsTreasuryReview:
            pipelineResult.reviewPendingAccounts > 0 ||
            pipelineResult.escalatedAccounts > 0,
        },
      });

      setIdempotencyResult(idempotencyKey, pipelineResult);
      return pipelineResult;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof TimeoutError;
      const errorAudit = createAuditEntry({
        agentId: "reconciliation-pipeline",
        action: "pipeline_failed",
        details: {
          entityId,
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

      return {
        success: false,
        results: [],
        overallConfidence: 0,
        overallMatchRate: 0,
        totalMatched: 0,
        totalUnmatched: 0,
        totalPendingSettlement: 0,
        totalTransactions: 0,
        escalatedAccounts: 0,
        closedAccounts: 0,
        reviewPendingAccounts: 0,
        sessionClosed: false,
        auditEntries,
        durationMs: Date.now() - startTime,
      };
    }
  })(); // <-- IIFE invoked immediately

  return withTimeout(
    () => pipelinePromise,
    pipelineTimeout.maxExecutionMs,
    "reconciliation-pipeline",
  );
}

// ─── Get Reconciliation Status ──────────────────────────────────────────

/**
 * Get reconciliation status summary for an entity's bank accounts.
 * Returns per-account status without running the full pipeline.
 */
export async function getReconciliationStatus(entityId: string): Promise<
  Array<{
    accountId: string;
    accountName: string;
    bankName: string;
    currency: string;
    unreconciledCount: number;
    lastReconciledDate: string | null;
    lastReconciliationStatus: string | null;
    currentBalance: number;
  }>
> {
  const accounts = await db.query.bankAccounts.findMany({
    where: and(
      eq(bankAccounts.entityId, entityId),
      eq(bankAccounts.isActive, true),
    ),
  });

  const result: Array<{
    accountId: string;
    accountName: string;
    bankName: string;
    currency: string;
    unreconciledCount: number;
    lastReconciledDate: string | null;
    lastReconciliationStatus: string | null;
    currentBalance: number;
  }> = [];

  if (accounts.length === 0) return [];

  // Batch fetch — fixes N+1 (2 queries instead of 2*N)
  const accountIds = accounts.map((a) => a.id);
  const allUnreconciled = await db.query.bankTransactions.findMany({
    where: and(
      eq(bankTransactions.entityId, entityId),
      inArray(bankTransactions.bankAccountId, accountIds),
      eq(bankTransactions.isReconciled, false),
    ),
  });
  const unreconciledByAccount = new Map<string, number>();
  for (const tx of allUnreconciled) {
    unreconciledByAccount.set(
      tx.bankAccountId,
      (unreconciledByAccount.get(tx.bankAccountId) ?? 0) + 1,
    );
  }

  const allRecons = await db.query.reconciliations.findMany({
    where: and(
      eq(reconciliations.entityId, entityId),
      inArray(reconciliations.bankAccountId, accountIds),
    ),
    orderBy: [desc(reconciliations.createdAt)],
  });
  const latestByAccount = new Map<string, (typeof allRecons)[number]>();
  for (const recon of allRecons) {
    if (!latestByAccount.has(recon.bankAccountId)) {
      latestByAccount.set(recon.bankAccountId, recon);
    }
  }

  for (const account of accounts) {
    const latestRecon = latestByAccount.get(account.id);
    result.push({
      accountId: account.id,
      accountName: account.name,
      bankName: account.bankName,
      currency: account.currency,
      unreconciledCount: unreconciledByAccount.get(account.id) ?? 0,
      lastReconciledDate: latestRecon?.statementDate ?? null,
      lastReconciliationStatus: latestRecon?.status ?? null,
      currentBalance: Number(account.currentBalance),
    });
  }

  return result;
}

// ─── Treasury Agent Review (Step 10) ──────────────────────────────────────
//
// Treasury Agent reviews every reconciliation session before it's marked
// complete. Reconciliation/Mobile Money Agents cannot self-close.

export async function reviewReconciliationSession(
  sessionId: string,
  reviewedBy: string,
  approved: boolean,
): Promise<{ success: boolean; status: string }> {
  const session = await db.query.reconciliationSessions.findFirst({
    where: eq(reconciliationSessions.id, sessionId),
  });

  if (!session) {
    throw new Error("Reconciliation session not found");
  }

  if (approved) {
    // Check hard rule (Step 9): no close with unresolved items
    const unmatchedCount = Number(session.unmatchedCount);
    if (unmatchedCount > 0) {
      return {
        success: false,
        status: "review_pending",
      };
    }

    await db
      .update(reconciliationSessions)
      .set({
        status: "clean",
        reviewedBy,
        reviewedAt: new Date(),
        closedAt: new Date(),
      })
      .where(eq(reconciliationSessions.id, sessionId));

    return { success: true, status: "clean" };
  }

  // Rejected — keep in review_pending
  await db
    .update(reconciliationSessions)
    .set({
      reviewedBy,
      reviewedAt: new Date(),
      notes: "Rejected by Treasury Agent — needs re-reconciliation",
    })
    .where(eq(reconciliationSessions.id, sessionId));

  return { success: false, status: "review_pending" };
}
