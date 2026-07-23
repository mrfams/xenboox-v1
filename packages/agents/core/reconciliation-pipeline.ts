// ─── Autonomous Bank Reconciliation Pipeline ──────────────────────────────
//
// Pipeline 3 of 6: feeds into the Treasury Agent (Tier 2).
//
// Pipeline Steps:
//   1. Detect Unreconciled Accounts  — Find active bank accounts needing reconciliation
//   2. Create Reconciliation Session — Create a new reconciliation record per account
//   3. Auto-Match Transactions       — Run scoring algorithm against journal entries
//   4. Create Reconciliation Items   — Persist matched & unmatched items
//   5. Generate Summary              — Build reconciliation summary with match rate
//   6. Confidence Gate               — Check match rate against threshold
//   7a. Auto-Close                   — Close reconciliation if confidence ≥ threshold
//   7b. Escalate to Human            — Push to approval queue if confidence < threshold

import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
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
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BankReconciliationResult {
  accountId: string;
  accountName: string;
  reconciliationId: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: "closed" | "escalated" | "failed";
  matchedCount: number;
  unmatchedCount: number;
  totalCount: number;
  matchRate: number;
  confidence: number;
  escalationReason?: string;
  items: ReconciliationItemResult[];
}

export interface ReconciliationItemResult {
  bankTransactionId: string;
  bankTransactionDate: string;
  bankTransactionDescription: string;
  bankTransactionAmount: number;
  matchedJournalEntryId?: string;
  status: "matched" | "unmatched";
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
  totalTransactions: number;
  escalatedAccounts: number;
  closedAccounts: number;
  auditEntries: AuditEntry[];
  durationMs: number;
}

// ─── Default Confidence Thresholds ─────────────────────────────────────────

const RECONCILIATION_MATCH_THRESHOLD = 0.85; // Minimum match rate to auto-close
const RECONCILIATION_CONFIDENCE_THRESHOLD = 0.8; // Minimum confidence to auto-close

// ─── Step 1: Detect Unreconciled Accounts ─────────────────────────────────

interface AccountToReconcile {
  id: string;
  name: string;
  bankName: string;
  currency: string;
  currentBalance: number;
  openingBalance: number;
  lastReconciledDate: string | null;
  lastReconciliationId: string | null;
}

async function detectUnreconciledAccounts(
  entityId: string,
): Promise<AccountToReconcile[]> {
  const accounts = await db.query.bankAccounts.findMany({
    where: and(
      eq(bankAccounts.entityId, entityId),
      eq(bankAccounts.isActive, true),
    ),
  });

  const result: AccountToReconcile[] = [];

  for (const account of accounts) {
    // Find the latest reconciliation for this account
    const latestRecon = await db.query.reconciliations.findFirst({
      where: and(
        eq(reconciliations.entityId, entityId),
        eq(reconciliations.bankAccountId, account.id),
      ),
      orderBy: [desc(reconciliations.createdAt)],
    });

    // Find the latest unreconciled transaction date to determine statement period
    const latestUnreconciledTx = await db.query.bankTransactions.findFirst({
      where: and(
        eq(bankTransactions.entityId, entityId),
        eq(bankTransactions.bankAccountId, account.id),
        eq(bankTransactions.isReconciled, false),
      ),
      orderBy: [desc(bankTransactions.transactionDate)],
    });

    // Only include accounts that have unreconciled transactions
    // OR that have never been reconciled (and have any transactions)
    if (latestUnreconciledTx) {
      result.push({
        id: account.id,
        name: account.name,
        bankName: account.bankName,
        currency: account.currency,
        currentBalance: Number(account.currentBalance),
        openingBalance: Number(account.openingBalance),
        lastReconciledDate: latestRecon?.statementDate ?? null,
        lastReconciliationId: latestRecon?.id ?? null,
      });
    }
  }

  return result;
}

// ─── Step 2: Create Reconciliation Session ────────────────────────────────

async function createReconciliationSession(
  entityId: string,
  account: AccountToReconcile,
): Promise<{
  reconciliationId: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
}> {
  // Determine statement period: up to the latest transaction date
  const latestTx = await db.query.bankTransactions.findFirst({
    where: and(
      eq(bankTransactions.entityId, entityId),
      eq(bankTransactions.bankAccountId, account.id),
    ),
    orderBy: [desc(bankTransactions.transactionDate)],
  });

  const statementDate =
    latestTx?.transactionDate ?? new Date().toISOString().split("T")[0]!;

  // Calculate statement balance (balance from latest transaction) vs book balance
  const latestTxWithBalance = await db.query.bankTransactions.findFirst({
    where: and(
      eq(bankTransactions.entityId, entityId),
      eq(bankTransactions.bankAccountId, account.id),
      sql`${bankTransactions.balance} IS NOT NULL`,
    ),
    orderBy: [desc(bankTransactions.transactionDate)],
  });

  // If we have a connected balance from a transaction, use it as statement balance.
  // Otherwise, use the opening balance + net transaction activity.
  let statementBalance: number;
  if (latestTxWithBalance?.balance) {
    statementBalance = Number(latestTxWithBalance.balance);
  } else {
    // Fall back to current balance as a reasonable estimate
    statementBalance = account.currentBalance;
  }

  const bookBalance = account.currentBalance;
  const difference = statementBalance - bookBalance;

  // Create the reconciliation record
  const [recon] = await db
    .insert(reconciliations)
    .values({
      entityId,
      bankAccountId: account.id,
      statementDate,
      statementBalance: statementBalance.toFixed(2),
      bookBalance: bookBalance.toFixed(2),
      difference: difference.toFixed(2),
      status: "unmatched",
      notes: "Auto-created by reconciliation pipeline",
    })
    .returning();

  return {
    reconciliationId: recon!.id,
    statementDate,
    statementBalance,
    bookBalance,
  };
}

// ─── Step 3: Auto-Match Transactions ─────────────────────────────────────
//
// For each unreconciled bank transaction, score potential matches against
// journal entries using amount proximity, date proximity, and reference similarity.

interface MatchCandidate {
  journalEntryId: string;
  journalEntryLineId: string;
  amountScore: number;
  dateScore: number;
  referenceScore: number;
  totalScore: number;
}

const MATCH_THRESHOLD = 0.6;
const EXACT_MATCH_THRESHOLD = 0.95;
const AMOUNT_WEIGHT = 0.5;
const DATE_WEIGHT = 0.3;
const REFERENCE_WEIGHT = 0.2;

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

  const maxLen = Math.max(lenA, lenB);
  return 1 - matrix[lenA][lenB] / maxLen;
}

async function autoMatchTransactions(
  entityId: string,
  account: AccountToReconcile,
  reconciliationId: string,
): Promise<{
  items: ReconciliationItemResult[];
  matchedCount: number;
  unmatchedCount: number;
}> {
  // Get all unreconciled transactions for this account
  const unreconciledTxs = await db.query.bankTransactions.findMany({
    where: and(
      eq(bankTransactions.entityId, entityId),
      eq(bankTransactions.bankAccountId, account.id),
      eq(bankTransactions.isReconciled, false),
    ),
    orderBy: [desc(bankTransactions.transactionDate)],
  });

  if (unreconciledTxs.length === 0) {
    return { items: [], matchedCount: 0, unmatchedCount: 0 };
  }

  // Get candidate journal entries for matching: posted entries for this entity
  // that aren't already linked to a bank transaction.
  const postedEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
    orderBy: [desc(journalEntries.date)],
    limit: 500, // reasonable upper bound
  });

  const entryIds = postedEntries.map((e) => e.id);

  // Fetch all journal entry lines in one query (N+1 fix)
  const allLines =
    entryIds.length > 0
      ? await db.query.journalEntryLines.findMany({
          where: inArray(journalEntryLines.journalEntryId, entryIds),
          limit: 1000,
        })
      : [];

  // Build lookup map of posted entries for O(1) access during matching
  const entryMap = new Map(postedEntries.map((e) => [e.id, e]));

  // Track which journal entry lines have been matched (each JE can match at most 1 bank tx)
  const usedLineIds = new Set<string>();
  const items: ReconciliationItemResult[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const tx of unreconciledTxs) {
    const txAmount = Math.abs(Number(tx.amount));
    const txDate = new Date(tx.transactionDate);
    const txRef = (tx.reference ?? "").toLowerCase().trim();
    const txDesc = tx.description.toLowerCase().trim();

    let bestMatch: MatchCandidate | null = null;
    let bestScore = 0;

    for (const line of allLines) {
      if (usedLineIds.has(line.id)) continue;

      const lineAmount = Math.max(Number(line.debit), Number(line.credit));
      const entry = entryMap.get(line.journalEntryId);
      if (!entry) continue;

      // ---- Amount Score ----
      let amountScore = 0;
      if (Math.abs(lineAmount - txAmount) <= 0.01) {
        amountScore = 1;
      } else if (txAmount > 0) {
        const ratio =
          Math.min(lineAmount, txAmount) / Math.max(lineAmount, txAmount);
        if (ratio >= 0.8) amountScore = ratio;
      }

      // ---- Date Score ----
      const entryDate = new Date(entry.date);
      const diffDays =
        Math.abs(txDate.getTime() - entryDate.getTime()) /
        (1000 * 60 * 60 * 24);
      let dateScore = 0;
      if (diffDays <= 1) dateScore = 1;
      else if (diffDays <= 3) dateScore = 0.8;
      else if (diffDays <= 7) dateScore = 0.5;
      else if (diffDays <= 14) dateScore = 0.2;

      // ---- Reference Score ----
      const entryRef = (entry.reference ?? "").toLowerCase().trim();
      const entryDesc = (entry.description ?? "").toLowerCase().trim();
      let referenceScore = 0;
      if (txRef && entryRef && txRef === entryRef) {
        referenceScore = 1;
      } else if (txRef && entryDesc.includes(txRef)) {
        referenceScore = 0.8;
      } else if (
        txRef &&
        entryRef &&
        levenshteinSimilarity(txRef, entryRef) > 0.7
      ) {
        referenceScore = 0.6;
      } else if (
        txDesc &&
        entryDesc &&
        levenshteinSimilarity(txDesc, entryDesc) > 0.6
      ) {
        referenceScore = 0.4;
      }

      const totalScore =
        amountScore * AMOUNT_WEIGHT +
        dateScore * DATE_WEIGHT +
        referenceScore * REFERENCE_WEIGHT;

      if (totalScore > bestScore && totalScore >= MATCH_THRESHOLD) {
        bestScore = totalScore;
        bestMatch = {
          journalEntryId: entry.id,
          journalEntryLineId: line.id,
          amountScore,
          dateScore,
          referenceScore,
          totalScore,
        };
      }
    }

    if (bestMatch) {
      usedLineIds.add(bestMatch.journalEntryLineId);
      matchedCount++;

      items.push({
        bankTransactionId: tx.id,
        bankTransactionDate: tx.transactionDate,
        bankTransactionDescription: tx.description,
        bankTransactionAmount: txAmount,
        matchedJournalEntryId: bestMatch.journalEntryId,
        status: "matched",
        confidence: bestScore >= EXACT_MATCH_THRESHOLD ? 0.98 : bestScore,
        matchFactors: {
          amountScore: bestMatch.amountScore,
          dateScore: bestMatch.dateScore,
          referenceScore: bestMatch.referenceScore,
        },
      });
    } else {
      unmatchedCount++;
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

  return { items, matchedCount, unmatchedCount };
}

// ─── Step 4: Persist Reconciliation Items ────────────────────────────────

async function persistReconciliationItems(
  entityId: string,
  reconciliationId: string,
  items: ReconciliationItemResult[],
): Promise<void> {
  for (const item of items) {
    if (item.status === "matched") {
      // Create reconciliation item
      await db.insert(reconciliationItems).values({
        reconciliationId,
        bankTransactionId: item.bankTransactionId,
        status: "matched",
        matchedAmount: item.bankTransactionAmount.toFixed(2),
        notes: `Auto-matched (confidence: ${(item.confidence * 100).toFixed(0)}%)`,
      });

      // Mark the bank transaction as reconciled
      await db
        .update(bankTransactions)
        .set({
          isReconciled: true,
          reconciliationId,
        })
        .where(
          and(
            eq(bankTransactions.id, item.bankTransactionId),
            eq(bankTransactions.entityId, entityId),
          ),
        );
    } else {
      // Create reconciliation item as pending (unmatched)
      await db.insert(reconciliationItems).values({
        reconciliationId,
        bankTransactionId: item.bankTransactionId,
        status: "pending",
        matchedAmount: "0",
        notes: "Auto-pipeline: no matching journal entry found",
      });
    }
  }
}

// ─── Step 5: Generate Reconciliation Summary ─────────────────────────────

function generateReconciliationSummary(
  account: AccountToReconcile,
  session: {
    reconciliationId: string;
    statementDate: string;
    statementBalance: number;
    bookBalance: number;
  },
  items: ReconciliationItemResult[],
): {
  matchedCount: number;
  unmatchedCount: number;
  totalCount: number;
  matchRate: number;
  confidence: number;
} {
  const matchedCount = items.filter((i) => i.status === "matched").length;
  const unmatchedCount = items.filter((i) => i.status === "unmatched").length;
  const totalCount = items.length;

  const matchRate = totalCount > 0 ? matchedCount / totalCount : 0;

  // Confidence is a weighted combination of match rate and individual match scores
  const avgMatchedConfidence =
    matchedCount > 0
      ? items
          .filter((i) => i.status === "matched")
          .reduce((s, i) => s + i.confidence, 0) / matchedCount
      : 0;

  const confidence =
    totalCount > 0 ? matchRate * 0.6 + avgMatchedConfidence * 0.4 : 0;

  return { matchedCount, unmatchedCount, totalCount, matchRate, confidence };
}

// ─── Step 6-7: Confidence Gate + Close / Escalate ────────────────────────

async function finalizeReconciliation(
  entityId: string,
  account: AccountToReconcile,
  session: {
    reconciliationId: string;
    statementDate: string;
    statementBalance: number;
    bookBalance: number;
  },
  items: ReconciliationItemResult[],
  summary: {
    matchedCount: number;
    unmatchedCount: number;
    totalCount: number;
    matchRate: number;
    confidence: number;
  },
): Promise<BankReconciliationResult> {
  const difference = session.statementBalance - session.bookBalance;
  const base: Omit<BankReconciliationResult, "status" | "escalationReason"> = {
    accountId: account.id,
    accountName: account.name,
    reconciliationId: session.reconciliationId,
    statementDate: session.statementDate,
    statementBalance: session.statementBalance,
    bookBalance: session.bookBalance,
    difference,
    matchedCount: summary.matchedCount,
    unmatchedCount: summary.unmatchedCount,
    totalCount: summary.totalCount,
    matchRate: summary.matchRate,
    confidence: summary.confidence,
    items,
  };

  // Check confidence gates
  const aboveMatchThreshold =
    summary.matchRate >= RECONCILIATION_MATCH_THRESHOLD;
  const aboveConfidenceThreshold =
    summary.confidence >= RECONCILIATION_CONFIDENCE_THRESHOLD;

  if (
    aboveMatchThreshold &&
    aboveConfidenceThreshold &&
    summary.totalCount > 0
  ) {
    // ── Step 7a: Auto-Close ──────────────────────────────────────────
    await db
      .update(reconciliations)
      .set({
        status: "closed",
        closedAt: new Date(),
        notes: `Auto-closed by reconciliation pipeline. Matched ${summary.matchedCount}/${summary.totalCount} (${(summary.matchRate * 100).toFixed(0)}%)`,
      })
      .where(
        and(
          eq(reconciliations.id, session.reconciliationId),
          eq(reconciliations.entityId, entityId),
        ),
      );

    return { ...base, status: "closed" };
  }

  // ── Step 7b: Escalate to Human ────────────────────────────────────
  const reasons: string[] = [];
  if (!aboveMatchThreshold) {
    reasons.push(
      `Match rate ${(summary.matchRate * 100).toFixed(0)}% below threshold ${(RECONCILIATION_MATCH_THRESHOLD * 100).toFixed(0)}%`,
    );
  }
  if (!aboveConfidenceThreshold) {
    reasons.push(
      `Confidence ${(summary.confidence * 100).toFixed(0)}% below threshold ${(RECONCILIATION_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`,
    );
  }

  await db
    .update(reconciliations)
    .set({
      notes: `Auto-escalated: ${reasons.join("; ")}. ${summary.matchedCount}/${summary.totalCount} matched.`,
    })
    .where(
      and(
        eq(reconciliations.id, session.reconciliationId),
        eq(reconciliations.entityId, entityId),
      ),
    );

  return {
    ...base,
    status: "escalated",
    escalationReason: reasons.join("; "),
  };
}

// ─── Main Pipeline Entry Point ────────────────────────────────────────────

/**
 * Run the full Autonomous Bank Reconciliation Pipeline for an entity.
 *
 * @param entityId - The entity to reconcile
 * @param specificAccountIds - Optional: only reconcile specific accounts
 * @returns Full pipeline result with per-account details
 */
export async function runReconciliationPipeline(
  entityId: string,
  specificAccountIds?: string[],
): Promise<ReconciliationPipelineResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "reconciliation-pipeline",
    metadata: { entityId, specificAccountIds },
  });

  const auditEntries: AuditEntry[] = [];
  const results: BankReconciliationResult[] = [];

  let totalMatched = 0;
  let totalUnmatched = 0;
  let totalTransactions = 0;
  let escalatedAccounts = 0;
  let closedAccounts = 0;

  try {
    // ── Step 1: Detect Unreconciled Accounts ──────────────────────────
    const accounts = await detectUnreconciledAccounts(entityId);

    const targetAccounts = specificAccountIds
      ? accounts.filter((a) => specificAccountIds.includes(a.id))
      : accounts;

    if (targetAccounts.length === 0) {
      const audit = createAuditEntry({
        agentId: "reconciliation-pipeline",
        action: "no_accounts_to_reconcile",
        details: { entityId, message: "All accounts are fully reconciled" },
        confidence: 1,
      });
      auditEntries.push(audit);

      await trace.update({
        output: { status: "no_op", reason: "No accounts need reconciliation" },
      });

      return {
        success: true,
        results: [],
        overallConfidence: 1,
        overallMatchRate: 1,
        totalMatched: 0,
        totalUnmatched: 0,
        totalTransactions: 0,
        escalatedAccounts: 0,
        closedAccounts: 0,
        auditEntries,
        durationMs: Date.now() - startTime,
      };
    }

    // Process each account sequentially (to avoid transaction conflicts)
    for (const account of targetAccounts) {
      const accountTrace = await langfuse.span({
        name: "reconcile-account",
        input: { accountId: account.id, accountName: account.name },
      });

      try {
        // ── Step 2: Create Reconciliation Session ──────────────────────
        const session = await createReconciliationSession(entityId, account);

        // ── Step 3: Auto-Match Transactions ────────────────────────────
        const { items, matchedCount, unmatchedCount } =
          await autoMatchTransactions(
            entityId,
            account,
            session.reconciliationId,
          );

        // ── Step 4: Persist Reconciliation Items ──────────────────────
        await persistReconciliationItems(
          entityId,
          session.reconciliationId,
          items,
        );

        // ── Step 5: Generate Summary ──────────────────────────────────
        const summary = generateReconciliationSummary(account, session, items);

        // ── Steps 6-7: Gate + Close/Escalate ──────────────────────────
        const result = await finalizeReconciliation(
          entityId,
          account,
          session,
          items,
          summary,
        );

        if (result.status === "closed") closedAccounts++;
        else if (result.status === "escalated") escalatedAccounts++;

        totalMatched += summary.matchedCount;
        totalUnmatched += summary.unmatchedCount;
        totalTransactions += summary.totalCount;
        results.push(result);

        const audit = createAuditEntry({
          agentId: "reconciliation-pipeline",
          action: `account_${result.status === "closed" ? "reconciled" : "escalated"}`,
          details: {
            accountId: account.id,
            accountName: account.name,
            reconciliationId: session.reconciliationId,
            matchedCount: summary.matchedCount,
            unmatchedCount: summary.unmatchedCount,
            matchRate: summary.matchRate,
            confidence: summary.confidence,
            status: result.status,
            escalationReason: result.escalationReason,
          },
          confidence: summary.confidence,
        });
        auditEntries.push(audit);

        await accountTrace.update({
          output: {
            status: result.status,
            matchedCount: summary.matchedCount,
            unmatchedCount: summary.unmatchedCount,
            matchRate: summary.matchRate,
            confidence: summary.confidence,
          },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({
          accountId: account.id,
          accountName: account.name,
          reconciliationId: "",
          statementDate: "",
          statementBalance: 0,
          bookBalance: 0,
          difference: 0,
          status: "failed",
          matchedCount: 0,
          unmatchedCount: 0,
          totalCount: 0,
          matchRate: 0,
          confidence: 0,
          escalationReason: msg,
          items: [],
        });
        escalatedAccounts++;

        const audit = createAuditEntry({
          agentId: "reconciliation-pipeline",
          action: "account_reconciliation_failed",
          details: {
            accountId: account.id,
            accountName: account.name,
            error: msg,
          },
          confidence: 0,
        });
        auditEntries.push(audit);

        await accountTrace.update({ output: { status: "failed", error: msg } });
      }
    }

    // ── Compute Overall Metrics ─────────────────────────────────────
    const overallMatchRate =
      totalTransactions > 0 ? totalMatched / totalTransactions : 0;
    const overallConfidence =
      results.length > 0
        ? results.reduce((s, r) => s + r.confidence, 0) / results.length
        : 0;

    // ── Audit Log ─────────────────────────────────────────────────────
    const pipelineAudit = createAuditEntry({
      agentId: "reconciliation-pipeline",
      action: "reconciliation_pipeline_complete",
      details: {
        entityId,
        accountsProcessed: targetAccounts.length,
        totalMatched,
        totalUnmatched,
        totalTransactions,
        overallMatchRate,
        overallConfidence,
        closedAccounts,
        escalatedAccounts,
        durationMs: Date.now() - startTime,
      },
      confidence: overallConfidence,
    });
    auditEntries.push(pipelineAudit);

    await trace.update({
      output: {
        status: "complete",
        accountsProcessed: targetAccounts.length,
        totalMatched,
        totalUnmatched,
        overallMatchRate,
        overallConfidence,
        closedAccounts,
        escalatedAccounts,
        durationMs: Date.now() - startTime,
      },
    });

    // Langfuse event for observability
    langfuse.event({
      name: "reconciliation-pipeline-complete",
      metadata: {
        entityId,
        accountsProcessed: targetAccounts.length,
        totalMatched,
        totalUnmatched,
        closedAccounts,
        escalatedAccounts,
        overallConfidence,
      },
    });

    return {
      success: true,
      results,
      overallConfidence,
      overallMatchRate,
      totalMatched,
      totalUnmatched,
      totalTransactions,
      escalatedAccounts,
      closedAccounts,
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const errorAudit = createAuditEntry({
      agentId: "reconciliation-pipeline",
      action: "pipeline_failed",
      details: { entityId, error: msg },
      confidence: 0,
    });
    auditEntries.push(errorAudit);

    await trace.update({ output: { status: "error", error: msg } });

    return {
      success: false,
      results,
      overallConfidence: 0,
      overallMatchRate: 0,
      totalMatched,
      totalUnmatched,
      totalTransactions,
      escalatedAccounts,
      closedAccounts,
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  }
}

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

  for (const account of accounts) {
    const unreconciledTxs = await db.query.bankTransactions.findMany({
      where: and(
        eq(bankTransactions.entityId, entityId),
        eq(bankTransactions.bankAccountId, account.id),
        eq(bankTransactions.isReconciled, false),
      ),
    });

    const latestRecon = await db.query.reconciliations.findFirst({
      where: and(
        eq(reconciliations.entityId, entityId),
        eq(reconciliations.bankAccountId, account.id),
      ),
      orderBy: [desc(reconciliations.createdAt)],
    });

    result.push({
      accountId: account.id,
      accountName: account.name,
      bankName: account.bankName,
      currency: account.currency,
      unreconciledCount: unreconciledTxs.length,
      lastReconciledDate: latestRecon?.statementDate ?? null,
      lastReconciliationStatus: latestRecon?.status ?? null,
      currentBalance: Number(account.currentBalance),
    });
  }

  return result;
}
