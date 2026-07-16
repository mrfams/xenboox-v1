import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import { bankAccounts, bankTransactions, reconciliations } from "@xenboox/db/schema/treasury"
import { pettyCashLedger } from "@xenboox/db/schema/cash"
import { mobileMoneyAccounts, mobileMoneyTransactions } from "@xenboox/db/schema/mobile-money"
import type { CashPosition, ReconciliationStatus, DailyReport } from "./state"

// ─── Get Cash Position ─────────────────────────────────────────────────────

export async function getCashPosition(entityId: string): Promise<CashPosition> {
  const accounts = await db.query.bankAccounts.findMany({
    where: and(
      eq(bankAccounts.entityId, entityId),
      eq(bankAccounts.isActive, true),
    ),
  })

  const bankSummaries = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    balance: Number(a.currentBalance),
    lastReconciled: null as string | null,
  }))

  // Fetch latest reconciliation per bank account for lastReconciled
  for (const bank of bankSummaries) {
    const latestRecon = await db.query.reconciliations.findFirst({
      where: and(
        eq(reconciliations.entityId, entityId),
        eq(reconciliations.bankAccountId, bank.id),
      ),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    })
    bank.lastReconciled = latestRecon?.statementDate ?? null
  }

  const mmAccounts = await db.query.mobileMoneyAccounts.findMany({
    where: and(
      eq(mobileMoneyAccounts.entityId, entityId),
      eq(mobileMoneyAccounts.isActive, true),
    ),
  })

  const mmSummaries = mmAccounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    balance: Number(a.currentBalance),
  }))

  // Petty cash: sum of latest balance per cash account from petty_cash_ledger
  const pettyCashEntries = await db.query.pettyCashLedger.findMany({
    where: eq(pettyCashLedger.entityId, entityId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  })

  // Get the latest balance entry per cash account
  const latestPettyByAccount = new Map<string, number>()
  for (const entry of pettyCashEntries) {
    if (!latestPettyByAccount.has(entry.cashAccountId)) {
      latestPettyByAccount.set(entry.cashAccountId, Number(entry.balance))
    }
  }
  const physicalCash = Array.from(latestPettyByAccount.values()).reduce((s, v) => s + v, 0)

  const totalBaseCurrency =
    bankSummaries.reduce((s, b) => s + b.balance, 0) +
    mmSummaries.reduce((s, m) => s + m.balance, 0) +
    physicalCash

  return {
    bankAccounts: bankSummaries,
    mmWallets: mmSummaries,
    physicalCash,
    totalBaseCurrency,
  }
}

// ─── Check Reconciliation Status ───────────────────────────────────────────

export async function checkReconciliationStatus(entityId: string): Promise<ReconciliationStatus> {
  // Bank: check if all bank accounts have a closed reconciliation
  const allBankAccounts = await db.query.bankAccounts.findMany({
    where: and(
      eq(bankAccounts.entityId, entityId),
      eq(bankAccounts.isActive, true),
    ),
  })

  let bankComplete = true
  let unresolvedItems = 0

  for (const account of allBankAccounts) {
    const latestRecon = await db.query.reconciliations.findFirst({
      where: and(
        eq(reconciliations.entityId, entityId),
        eq(reconciliations.bankAccountId, account.id),
      ),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    })

    if (!latestRecon || latestRecon.status !== "closed") {
      bankComplete = false
    }

    // Count unreconciled transactions for this account
    const unreconciledTxs = await db.query.bankTransactions.findMany({
      where: and(
        eq(bankTransactions.entityId, entityId),
        eq(bankTransactions.bankAccountId, account.id),
        eq(bankTransactions.isReconciled, false),
      ),
    })
    unresolvedItems += unreconciledTxs.length
  }

  // Mobile money: check for failed/timed-out/pending transactions
  const mmAccounts = await db.query.mobileMoneyAccounts.findMany({
    where: and(
      eq(mobileMoneyAccounts.entityId, entityId),
      eq(mobileMoneyAccounts.isActive, true),
    ),
  })

  let mmComplete = true
  for (const account of mmAccounts) {
    const pendingTxs = await db.query.mobileMoneyTransactions.findMany({
      where: and(
        eq(mobileMoneyTransactions.entityId, entityId),
        eq(mobileMoneyTransactions.mobileMoneyAccountId, account.id),
      ),
    })
    const unresolved = pendingTxs.filter(
      (tx) => tx.status === "pending" || tx.status === "failed" || tx.status === "timeout"
    )
    if (unresolved.length > 0) {
      mmComplete = false
      unresolvedItems += unresolved.length
    }
  }

  // Petty cash: check for overdue imprest floats
  const cashComplete = unresolvedItems === 0 && bankComplete && mmComplete

  return {
    bankComplete,
    mmComplete,
    cashComplete,
    unresolvedItems,
  }
}

// ─── Generate Daily Report ─────────────────────────────────────────────────

export async function generateDailyReport(entityId: string, currency: string): Promise<DailyReport> {
  const position = await getCashPosition(entityId)
  const reconStatus = await checkReconciliationStatus(entityId)

  const alerts: string[] = []
  const recommendations: string[] = []

  // Low cash alert
  if (position.totalBaseCurrency < 1000) {
    alerts.push(`Low cash position: ${position.totalBaseCurrency.toFixed(2)} ${currency}`)
    recommendations.push("Consider transferring funds from savings or requesting CFO review")
  }

  // Per-account low balance
  for (const bank of position.bankAccounts) {
    if (bank.balance < 100) {
      alerts.push(`Bank account "${bank.name}" balance critically low: ${bank.balance.toFixed(2)}`)
      recommendations.push(`Replenish bank account "${bank.name}"`)
    }
  }

  // Reconciliation alerts
  if (!reconStatus.bankComplete) {
    alerts.push("Bank reconciliation incomplete for one or more accounts")
    recommendations.push("Complete outstanding bank reconciliations")
  }

  if (!reconStatus.mmComplete) {
    alerts.push("Mobile money reconciliation has unresolved items")
    recommendations.push("Review failed or pending mobile money transactions")
  }

  if (reconStatus.unresolvedItems > 0) {
    alerts.push(`${reconStatus.unresolvedItems} unreconciled transaction(s) across all accounts`)
    recommendations.push("Prioritize reconciliation of oldest unmatched items")
  }

  return {
    date: new Date().toISOString().split("T")[0],
    totalCash: position.totalBaseCurrency,
    alerts,
    recommendations,
  }
}
