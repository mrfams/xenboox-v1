import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import { cashAccounts, imprestFloats, imprestReceipts, pettyCashLedger } from "@xenboox/db/schema/cash"
import type { CashPosition, DiscrepancyReport } from "./state"

// ─── Get Daily Cash Position ───────────────────────────────────────────────

export async function getDailyCashPosition(
  entityId: string
): Promise<CashPosition> {
  const accounts = await db.query.cashAccounts.findMany({
    where: and(
      eq(cashAccounts.entityId, entityId),
      eq(cashAccounts.isActive, true),
    ),
  })

  let totalBalance = 0
  for (const acct of accounts) {
    totalBalance += Number(acct.currentBalance)
  }

  const activeFloats = await db.query.imprestFloats.findMany({
    where: and(
      eq(imprestFloats.entityId, entityId),
      eq(imprestFloats.status, "active"),
    ),
  })

  let outstandingImprest = 0
  for (const float of activeFloats) {
    outstandingImprest += Number(float.remainingBalance)
  }

  return {
    totalBalance,
    accountCount: accounts.length,
    activeFloats: activeFloats.length,
    outstandingImprest,
  }
}

// ─── Issue Imprest ─────────────────────────────────────────────────────────

export interface IssueImprestInput {
  cashAccountId: string
  assigneeName: string
  assigneeUserId?: string
  amount: number
  purpose?: string
  settleByDate?: string
}

export interface IssueImprestResult {
  success: boolean
  floatId?: string
  amount?: number
  remainingBalance?: number
  status?: string
  errors: string[]
}

export async function issueImprest(
  entityId: string,
  input: IssueImprestInput
): Promise<IssueImprestResult> {
  const errors: string[] = []

  const cashAccount = await db.query.cashAccounts.findFirst({
    where: and(
      eq(cashAccounts.id, input.cashAccountId),
      eq(cashAccounts.entityId, entityId),
      eq(cashAccounts.isActive, true),
    ),
  })

  if (!cashAccount) {
    errors.push(`Cash account ${input.cashAccountId} not found or inactive for entity ${entityId}`)
  }

  if (input.amount <= 0) {
    errors.push(`Imprest amount must be positive, got ${input.amount}`)
  }

  if (!input.assigneeName || input.assigneeName.trim().length === 0) {
    errors.push("Assignee name is required")
  }

  if (cashAccount && input.amount > Number(cashAccount.currentBalance)) {
    errors.push(
      `Insufficient cash in account "${cashAccount.name}": balance ${cashAccount.currentBalance}, requested ${input.amount}`
    )
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  const today = new Date().toISOString().split("T")[0]

  const [created] = await db
    .insert(imprestFloats)
    .values({
      entityId,
      cashAccountId: input.cashAccountId,
      assigneeName: input.assigneeName,
      assigneeUserId: input.assigneeUserId ?? null,
      amount: String(input.amount),
      remainingBalance: String(input.amount),
      purpose: input.purpose ?? null,
      status: "active",
      issuedDate: today,
      settleByDate: input.settleByDate ?? null,
    })
    .returning()

  return {
    success: true,
    floatId: created.id,
    amount: input.amount,
    remainingBalance: input.amount,
    status: "active",
    errors: [],
  }
}

// ─── Retire Imprest ────────────────────────────────────────────────────────

export interface RetireImprestResult {
  success: boolean
  floatId?: string
  originalAmount?: number
  totalReceipts?: number
  remainingBalance?: number
  status?: string
  errors: string[]
}

export async function retireImprest(
  entityId: string,
  floatId: string
): Promise<RetireImprestResult> {
  const errors: string[] = []

  const float = await db.query.imprestFloats.findFirst({
    where: and(
      eq(imprestFloats.id, floatId),
      eq(imprestFloats.entityId, entityId),
    ),
  })

  if (!float) {
    errors.push(`Imprest float ${floatId} not found for entity ${entityId}`)
    return { success: false, errors }
  }

  if (float.status !== "active") {
    errors.push(`Imprest float ${floatId} is not active (current status: ${float.status})`)
    return { success: false, errors }
  }

  const receipts = await db.query.imprestReceipts.findMany({
    where: eq(imprestReceipts.imprestFloatId, floatId),
  })

  let totalReceipts = 0
  for (const receipt of receipts) {
    totalReceipts += Number(receipt.amount)
  }

  const originalAmount = Number(float.amount)
  const remainingBalance = originalAmount - totalReceipts
  const newStatus = remainingBalance <= 0 ? "settled" : "active"

  await db
    .update(imprestFloats)
    .set({
      remainingBalance: String(Math.max(0, remainingBalance)),
      status: newStatus,
      settledAt: new Date(),
    })
    .where(eq(imprestFloats.id, floatId))

  return {
    success: true,
    floatId,
    originalAmount,
    totalReceipts,
    remainingBalance: Math.max(0, remainingBalance),
    status: newStatus,
    errors: [],
  }
}

// ─── Count Cash ────────────────────────────────────────────────────────────

export interface CountCashResult {
  cashAccountId: string
  accountName: string
  expected: number
  actual: number
  difference: number
  hasDiscrepancy: boolean
  severity: string
}

export async function countCash(
  entityId: string,
  cashAccountId: string,
  countedAmount: number
): Promise<CountCashResult> {
  const cashAccount = await db.query.cashAccounts.findFirst({
    where: and(
      eq(cashAccounts.id, cashAccountId),
      eq(cashAccounts.entityId, entityId),
    ),
  })

  if (!cashAccount) {
    throw new Error(`Cash account ${cashAccountId} not found for entity ${entityId}`)
  }

  const expected = Number(cashAccount.currentBalance)
  const difference = countedAmount - expected
  const absDifference = Math.abs(difference)
  const hasDiscrepancy = absDifference > 0

  let severity = "none"
  if (hasDiscrepancy && expected > 0) {
    const pct = (absDifference / expected) * 100
    if (pct < 1) severity = "minor"
    else if (pct <= 5) severity = "moderate"
    else if (pct <= 10) severity = "material"
    else severity = "critical"
  } else if (hasDiscrepancy) {
    severity = "critical"
  }

  if (hasDiscrepancy) {
    await db
      .update(cashAccounts)
      .set({ currentBalance: String(countedAmount) })
      .where(eq(cashAccounts.id, cashAccountId))
  }

  return {
    cashAccountId,
    accountName: cashAccount.name,
    expected,
    actual: countedAmount,
    difference,
    hasDiscrepancy,
    severity,
  }
}

// ─── Detect Discrepancies ──────────────────────────────────────────────────

export async function detectDiscrepancies(
  entityId: string
): Promise<DiscrepancyReport> {
  const accounts = await db.query.cashAccounts.findMany({
    where: and(
      eq(cashAccounts.entityId, entityId),
      eq(cashAccounts.isActive, true),
    ),
  })

  const discrepancies: DiscrepancyReport["discrepancies"] = []

  for (const acct of accounts) {
    const latestCount = await db.query.pettyCashLedger.findFirst({
      where: eq(pettyCashLedger.cashAccountId, acct.id),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    })

    if (!latestCount) continue

    const recordedBalance = Number(acct.currentBalance)
    const ledgerBalance = Number(latestCount.balance)
    const difference = ledgerBalance - recordedBalance

    if (Math.abs(difference) > 0) {
      const absDifference = Math.abs(difference)
      const base = recordedBalance > 0 ? recordedBalance : 1
      const pct = (absDifference / base) * 100

      let severity = "minor"
      if (pct >= 10) severity = "critical"
      else if (pct >= 5) severity = "material"
      else if (pct >= 1) severity = "moderate"

      discrepancies.push({
        location: acct.name,
        expected: recordedBalance,
        actual: ledgerBalance,
        difference,
        severity,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalLocations: accounts.length,
    discrepancyCount: discrepancies.length,
    discrepancies,
  }
}
