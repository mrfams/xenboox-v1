import { db } from "@xenboox/db"
import { eq, and, gte, lte } from "drizzle-orm"
import { mobileMoneyAccounts, mobileMoneyTransactions } from "@xenboox/db/schema"
import { journalEntries } from "@xenboox/db/schema/accounting"
import type { IngestionResult, MatchResult, WalletReconciliation, FeeAnalysis } from "./state"

// ─── Ingest Mobile Statement ───────────────────────────────────────────────

export interface MobileStatementTx {
  providerTxId: string
  type: "collection" | "disbursement" | "transfer" | "refund"
  amount: number
  fee?: number
  netAmount: number
  counterparty?: string
  counterpartyName?: string
  description?: string
  status?: "pending" | "successful" | "failed" | "reversed" | "timeout"
  initiatedAt: string
  completedAt?: string
}

export interface IngestMobileStatementResult {
  success: boolean
  result: IngestionResult
  errors: string[]
}

export async function ingestMobileStatement(
  entityId: string,
  accountId: string,
  transactions: MobileStatementTx[]
): Promise<IngestMobileStatementResult> {
  const errors: string[] = []

  const account = await db.query.mobileMoneyAccounts.findFirst({
    where: and(
      eq(mobileMoneyAccounts.id, accountId),
      eq(mobileMoneyAccounts.entityId, entityId),
      eq(mobileMoneyAccounts.isActive, true),
    ),
  })

  if (!account) {
    errors.push(`Mobile money account ${accountId} not found or inactive for entity ${entityId}`)
    return { success: false, result: { imported: 0, duplicates: 0, errors: transactions.length }, errors }
  }

  let imported = 0
  let duplicates = 0
  let errorCount = 0

  for (const tx of transactions) {
    if (!tx.providerTxId || tx.providerTxId.trim().length === 0) {
      errors.push(`Transaction missing providerTxId: ${JSON.stringify(tx)}`)
      errorCount++
      continue
    }

    if (tx.amount <= 0) {
      errors.push(`Transaction ${tx.providerTxId} has non-positive amount: ${tx.amount}`)
      errorCount++
      continue
    }

    const existing = await db.query.mobileMoneyTransactions.findFirst({
      where: and(
        eq(mobileMoneyTransactions.entityId, entityId),
        eq(mobileMoneyTransactions.providerTxId, tx.providerTxId),
      ),
    })

    if (existing) {
      duplicates++
      continue
    }

    await db.insert(mobileMoneyTransactions).values({
      entityId,
      mobileMoneyAccountId: accountId,
      providerTxId: tx.providerTxId,
      type: tx.type,
      amount: String(tx.amount),
      fee: String(tx.fee ?? 0),
      netAmount: String(tx.netAmount),
      counterparty: tx.counterparty ?? null,
      counterpartyName: tx.counterpartyName ?? null,
      description: tx.description ?? null,
      status: tx.status ?? "pending",
      initiatedAt: new Date(tx.initiatedAt),
      completedAt: tx.completedAt ? new Date(tx.completedAt) : null,
    })

    imported++
  }

  return {
    success: true,
    result: { imported, duplicates, errors: errorCount },
    errors,
  }
}

// ─── Match Mobile Transactions ─────────────────────────────────────────────

export async function matchMobileTransactions(
  entityId: string,
  accountId: string
): Promise<MatchResult[]> {
  const unmatchedTxs = await db.query.mobileMoneyTransactions.findMany({
    where: and(
      eq(mobileMoneyTransactions.entityId, entityId),
      eq(mobileMoneyTransactions.mobileMoneyAccountId, accountId),
      eq(mobileMoneyTransactions.status, "successful"),
    ),
  })

  const results: MatchResult[] = []

  for (const tx of unmatchedTxs) {
    if (tx.journalEntryId) {
      results.push({
        mobileMoneyTxId: tx.id,
        journalEntryId: tx.journalEntryId,
        matched: true,
        confidence: 1.0,
        reason: "Already linked to journal entry",
      })
      continue
    }

    const txAmount = Number(tx.amount)
    const txDate = new Date(tx.initiatedAt)
    const startOfDay = new Date(txDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(txDate)
    endOfDay.setHours(23, 59, 59, 999)

    const candidates = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
      ),
    })

    let bestMatch: { id: string; confidence: number; reason: string } | null = null

    for (const entry of candidates) {
      const entryDate = new Date(entry.date)

      const dayDiff = Math.abs(txDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      if (dayDiff <= 1) {
        bestMatch = { id: entry.id, confidence: 0.8, reason: "Date match within 1 day" }
        break
      } else if (dayDiff <= 3 && !bestMatch) {
        bestMatch = { id: entry.id, confidence: 0.5, reason: `Date match, ${Math.round(dayDiff)} day difference` }
      }
    }

    if (bestMatch) {
      await db
        .update(mobileMoneyTransactions)
        .set({ journalEntryId: bestMatch.id })
        .where(eq(mobileMoneyTransactions.id, tx.id))

      results.push({
        mobileMoneyTxId: tx.id,
        journalEntryId: bestMatch.id,
        matched: true,
        confidence: bestMatch.confidence,
        reason: bestMatch.reason,
      })
    } else {
      results.push({
        mobileMoneyTxId: tx.id,
        journalEntryId: null,
        matched: false,
        confidence: 0.0,
        reason: "No matching journal entry found",
      })
    }
  }

  return results
}

// ─── Reconcile Wallet ──────────────────────────────────────────────────────

export async function reconcileWallet(
  entityId: string,
  accountId: string
): Promise<WalletReconciliation> {
  const account = await db.query.mobileMoneyAccounts.findFirst({
    where: and(
      eq(mobileMoneyAccounts.id, accountId),
      eq(mobileMoneyAccounts.entityId, entityId),
    ),
  })

  const walletBalance = account ? Number(account.currentBalance) : 0

  const txs = await db.query.mobileMoneyTransactions.findMany({
    where: and(
      eq(mobileMoneyTransactions.entityId, entityId),
      eq(mobileMoneyTransactions.mobileMoneyAccountId, accountId),
      eq(mobileMoneyTransactions.status, "successful"),
    ),
  })

  let ledgerBalance = 0
  for (const tx of txs) {
    const netAmount = Number(tx.netAmount)
    if (tx.type === "collection" || tx.type === "refund") {
      ledgerBalance += netAmount
    } else if (tx.type === "disbursement" || tx.type === "transfer") {
      ledgerBalance -= netAmount
    }
  }

  const difference = Math.abs(walletBalance - ledgerBalance)
  const status = difference < 0.01 ? "reconciled" : difference < 100 ? "discrepancy" : "unresolved"

  return {
    walletBalance,
    ledgerBalance,
    difference,
    status,
  }
}

// ─── Analyze Fees ──────────────────────────────────────────────────────────

export async function analyzeFees(
  entityId: string,
  startDate: string,
  endDate: string
): Promise<FeeAnalysis> {
  const txs = await db.query.mobileMoneyTransactions.findMany({
    where: and(
      eq(mobileMoneyTransactions.entityId, entityId),
      gte(mobileMoneyTransactions.initiatedAt, new Date(startDate)),
      lte(mobileMoneyTransactions.initiatedAt, new Date(endDate)),
      eq(mobileMoneyTransactions.status, "successful"),
    ),
  })

  let totalFees = 0
  const feeByProvider: Record<string, number> = {}
  let totalAmount = 0

  for (const tx of txs) {
    const fee = Number(tx.fee)
    totalFees += fee
    totalAmount += Number(tx.amount)

    const account = await db.query.mobileMoneyAccounts.findFirst({
      where: eq(mobileMoneyAccounts.id, tx.mobileMoneyAccountId),
    })

    const provider = account?.provider ?? "unknown"
    feeByProvider[provider] = (feeByProvider[provider] ?? 0) + fee
  }

  const averageFeeRate = totalAmount > 0 ? totalFees / totalAmount : 0

  return {
    totalFees,
    feeByProvider,
    averageFeeRate,
  }
}
