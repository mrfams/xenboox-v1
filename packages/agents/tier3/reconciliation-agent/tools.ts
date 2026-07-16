import { db } from "@xenboox/db"
import { eq, and, desc } from "drizzle-orm"
import {
  bankTransactions,
  reconciliations,
  reconciliationItems,
} from "@xenboox/db/schema/treasury"
import { journalEntries } from "@xenboox/db/schema/accounting"
import type { MatchResult, ReconciliationSummary } from "./state"

// ─── Match Transactions ──────────────────────────────────────────────────

const AMOUNT_WEIGHT = 0.5
const DATE_WEIGHT = 0.3
const REFERENCE_WEIGHT = 0.2

const MATCH_THRESHOLD = 0.6
const EXACT_THRESHOLD = 0.95

export interface StatementTransaction {
  id: string
  amount: string
  transactionDate: string
  reference: string | null
  description: string
  type: string
}

export async function matchTransactions(
  entityId: string,
  bankAccountId: string,
  statementTransactions: StatementTransaction[]
): Promise<MatchResult[]> {
  const results: MatchResult[] = []

  const unmatchedLedgerEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
    orderBy: [desc(journalEntries.date)],
  })

  const usedJournalEntryIds = new Set<string>()

  for (const stx of statementTransactions) {
    let bestMatch: MatchResult | null = null
    let bestScore = 0

    for (const je of unmatchedLedgerEntries) {
      if (usedJournalEntryIds.has(je.id)) continue

      const stxAmount = Math.abs(Number(stx.amount))
      const jeAmount = Math.abs(Number(stx.amount))
      const amountScore = stxAmount === jeAmount ? 1 : stxAmount > 0 ? 1 - Math.abs(stxAmount - jeAmount) / Math.max(stxAmount, jeAmount) : 0

      const stxDate = new Date(stx.transactionDate)
      const jeDate = new Date(je.date)
      const diffDays = Math.abs(stxDate.getTime() - jeDate.getTime()) / (1000 * 60 * 60 * 24)
      const dateScore = diffDays <= 1 ? 1 : diffDays <= 3 ? 0.8 : diffDays <= 7 ? 0.5 : diffDays <= 14 ? 0.2 : 0

      const stxRef = (stx.reference ?? "").toLowerCase().trim()
      const jeRef = (je.reference ?? "").toLowerCase().trim()
      const jeDesc = (je.description ?? "").toLowerCase().trim()
      let referenceScore = 0
      if (stxRef && jeRef && stxRef === jeRef) {
        referenceScore = 1
      } else if (stxRef && jeDesc.includes(stxRef)) {
        referenceScore = 0.8
      } else if (stxRef && jeRef && levenshteinSimilarity(stxRef, jeRef) > 0.7) {
        referenceScore = 0.6
      }

      const totalScore =
        amountScore * AMOUNT_WEIGHT +
        dateScore * DATE_WEIGHT +
        referenceScore * REFERENCE_WEIGHT

      if (totalScore > bestScore && totalScore >= MATCH_THRESHOLD) {
        bestScore = totalScore
        bestMatch = {
          statementTxId: stx.id,
          ledgerEntryId: je.id,
          matchType: totalScore >= EXACT_THRESHOLD ? "exact" : "fuzzy",
          confidence: totalScore,
          matchFactors: {
            amountMatch: amountScore,
            dateProximity: dateScore,
            referenceMatch: referenceScore,
          },
        }
      }
    }

    if (bestMatch && bestMatch.ledgerEntryId) {
      usedJournalEntryIds.add(bestMatch.ledgerEntryId)
      results.push(bestMatch)
    } else {
      results.push({
        statementTxId: stx.id,
        ledgerEntryId: null,
        matchType: "unmatched",
        confidence: 0,
        matchFactors: { amountMatch: 0, dateProximity: 0, referenceMatch: 0 },
      })
    }
  }

  return results
}

function levenshteinSimilarity(a: string, b: string): number {
  const lenA = a.length
  const lenB = b.length
  if (lenA === 0 || lenB === 0) return 0

  const matrix: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array.from({ length: lenB + 1 }, () => 0)
  )

  for (let i = 0; i <= lenA; i++) matrix[i][0] = i
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const maxLen = Math.max(lenA, lenB)
  return 1 - matrix[lenA][lenB] / maxLen
}

// ─── Ingest Statement Transactions ───────────────────────────────────────

export interface IngestTransactionInput {
  bankAccountId: string
  transactionDate: string
  valueDate?: string
  type: string
  amount: string
  balance?: string
  description: string
  reference?: string
  metadata?: Record<string, unknown>
}

export interface IngestStatementResult {
  success: boolean
  insertedIds: string[]
  errors: string[]
}

export async function ingestStatementTransactions(
  entityId: string,
  transactions: IngestTransactionInput[]
): Promise<IngestStatementResult> {
  const errors: string[] = []
  const insertedIds: string[] = []

  for (const tx of transactions) {
    if (!tx.transactionDate) {
      errors.push(`Missing transaction date for "${tx.description}"`)
      continue
    }

    if (!tx.amount) {
      errors.push(`Missing amount for "${tx.description}"`)
      continue
    }

    const validTypes = ["deposit", "withdrawal", "transfer", "fee", "interest"]
    if (!validTypes.includes(tx.type)) {
      errors.push(`Invalid transaction type "${tx.type}" for "${tx.description}"`)
      continue
    }

    const [created] = await db
      .insert(bankTransactions)
      .values({
        entityId,
        bankAccountId: tx.bankAccountId,
        transactionDate: tx.transactionDate,
        valueDate: tx.valueDate ?? null,
        type: tx.type as "deposit" | "withdrawal" | "transfer" | "fee" | "interest",
        amount: tx.amount,
        balance: tx.balance ?? null,
        description: tx.description,
        reference: tx.reference ?? null,
        source: "statement_import",
        metadata: tx.metadata ?? {},
      })
      .returning()

    insertedIds.push(created.id)
  }

  return {
    success: errors.length === 0,
    insertedIds,
    errors,
  }
}

// ─── Generate Reconciliation Report ──────────────────────────────────────

export async function generateReconciliationReport(
  entityId: string,
  bankAccountId: string
): Promise<ReconciliationSummary> {
  const allTransactions = await db.query.bankTransactions.findMany({
    where: and(
      eq(bankTransactions.entityId, entityId),
      eq(bankTransactions.bankAccountId, bankAccountId),
    ),
  })

  let matchedCount = 0
  let unmatchedCount = 0
  let totalAmount = 0
  let matchedAmount = 0
  let unmatchedAmount = 0

  for (const tx of allTransactions) {
    const amount = Math.abs(Number(tx.amount))
    totalAmount += amount

    if (tx.isReconciled) {
      matchedCount++
      matchedAmount += amount
    } else {
      unmatchedCount++
      unmatchedAmount += amount
    }
  }

  return {
    matchedCount,
    unmatchedCount,
    totalAmount,
    matchedAmount,
    unmatchedAmount,
  }
}

// ─── Flag Unmatched ──────────────────────────────────────────────────────

export interface UnmatchedItem {
  bankTransactionId: string
  notes?: string
}

export interface FlagUnmatchedResult {
  success: boolean
  createdCount: number
  errors: string[]
}

export async function flagUnmatched(
  entityId: string,
  reconciliationId: string,
  unmatchedItems: UnmatchedItem[]
): Promise<FlagUnmatchedResult> {
  const errors: string[] = []
  let createdCount = 0

  for (const item of unmatchedItems) {
    const tx = await db.query.bankTransactions.findFirst({
      where: and(
        eq(bankTransactions.id, item.bankTransactionId),
        eq(bankTransactions.entityId, entityId),
      ),
    })

    if (!tx) {
      errors.push(`Bank transaction ${item.bankTransactionId} not found for entity ${entityId}`)
      continue
    }

    await db.insert(reconciliationItems).values({
      reconciliationId,
      bankTransactionId: item.bankTransactionId,
      status: "pending",
      matchedAmount: "0",
      notes: item.notes ?? null,
    })

    createdCount++
  }

  return {
    success: errors.length === 0,
    createdCount,
    errors,
  }
}
