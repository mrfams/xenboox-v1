import { db } from "@xenboox/db"
import { eq, and, desc } from "drizzle-orm"
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting"
import type { PendingEntry, ConstraintLogEntry } from "./state"

// ─── Deterministic Validators ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  error?: string
  constraint?: string
}

export async function validateDoubleEntry(
  entries: PendingEntry["entries"]
): Promise<ValidationResult> {
  if (entries.length < 2) {
    return { valid: false, error: "Entry must have at least 2 lines", constraint: "min_lines" }
  }

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      valid: false,
      error: `Entry does not balance. Debits: ${totalDebit}, Credits: ${totalCredit}, Difference: ${Math.abs(totalDebit - totalCredit)}`,
      constraint: "double_entry_balance",
    }
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.debit < 0 || e.credit < 0) {
      return {
        valid: false,
        error: `Line ${i + 1} (account ${e.accountCode}): negative amounts not permitted`,
        constraint: "no_negative_amounts",
      }
    }
    if (e.debit === 0 && e.credit === 0) {
      return {
        valid: false,
        error: `Line ${i + 1} (account ${e.accountCode}): must have a non-zero debit or credit`,
        constraint: "non_zero_amounts",
      }
    }
    if (e.debit > 0 && e.credit > 0) {
      return {
        valid: false,
        error: `Line ${i + 1} (account ${e.accountCode}): cannot have both debit and credit`,
        constraint: "no_mixed_lines",
      }
    }
  }

  return { valid: true }
}

export async function validateAccountsExist(
  entries: PendingEntry["entries"],
  entityId: string
): Promise<ValidationResult> {
  for (const entry of entries) {
    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.id, entry.accountId),
        eq(chartOfAccounts.entityId, entityId)
      ),
    })
    if (!account) {
      return {
        valid: false,
        error: `Account ${entry.accountCode} (${entry.accountId}) not found in chart of accounts`,
        constraint: "account_validity",
      }
    }
    if (!account.isActive) {
      return {
        valid: false,
        error: `Account ${entry.accountCode} (${account.name}) is inactive`,
        constraint: "account_active",
      }
    }
  }
  return { valid: true }
}

export async function validatePeriodOpen(periodId: string): Promise<ValidationResult> {
  const period = await db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.id, periodId),
  })
  if (!period) {
    return { valid: false, error: `Period ${periodId} not found`, constraint: "period_exists" }
  }
  if (period.status === "closed" || period.status === "locked") {
    return {
      valid: false,
      error: `Period ${period.year}-${String(period.month).padStart(2, "0")} is ${period.status}`,
      constraint: "period_integrity",
    }
  }
  return { valid: true }
}

export async function validateEntityScope(
  entityId: string,
  entryEntityId: string | undefined
): Promise<ValidationResult> {
  if (!entryEntityId) {
    return { valid: false, error: "Missing entityId on entry", constraint: "entity_scope" }
  }
  if (entryEntityId !== entityId) {
    return {
      valid: false,
      error: `Entity scope mismatch: expected ${entityId}, got ${entryEntityId}`,
      constraint: "entity_scope",
    }
  }
  return { valid: true }
}

export async function validateControllerApproval(
  approvedByController: boolean
): Promise<ValidationResult> {
  if (!approvedByController) {
    return {
      valid: false,
      error: "Entry not approved by Controller Agent",
      constraint: "controller_approval",
    }
  }
  return { valid: true }
}

export async function validateNoDuplicate(
  reference: string | null,
  entityId: string
): Promise<ValidationResult> {
  if (!reference) return { valid: true }

  const existing = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.reference, reference),
      eq(journalEntries.status, "posted")
    ),
  })
  if (existing) {
    return {
      valid: false,
      error: `Duplicate entry: reference "${reference}" already posted as JE-${existing.entryNumber}`,
      constraint: "no_duplicate",
    }
  }
  return { valid: true }
}

// ─── Run All Validations ───────────────────────────────────────────────────

export interface FullValidationResult {
  valid: boolean
  constraintLog: ConstraintLogEntry[]
  errors: string[]
}

export async function runAllValidations(
  entry: PendingEntry,
  entityId: string
): Promise<FullValidationResult> {
  const log: ConstraintLogEntry[] = []
  const errors: string[] = []
  const ts = new Date().toISOString()

  const checks = [
    { name: "controller_approval", fn: () => validateControllerApproval(entry.approvedByController) },
    { name: "double_entry", fn: () => validateDoubleEntry(entry.entries) },
    { name: "accounts_exist", fn: () => validateAccountsExist(entry.entries, entityId) },
    { name: "period_open", fn: () => validatePeriodOpen(entry.periodId) },
    { name: "entity_scope", fn: () => validateEntityScope(entityId, entry.id ? entityId : undefined) },
    { name: "no_duplicate", fn: () => validateNoDuplicate(entry.reference, entityId) },
  ]

  for (const check of checks) {
    const result = await check.fn()
    log.push({
      timestamp: ts,
      constraint: check.name,
      passed: result.valid,
      details: result.error || "passed",
      entryId: entry.id,
    })
    if (!result.valid && result.error) {
      errors.push(result.error)
    }
  }

  return { valid: errors.length === 0, constraintLog: log, errors }
}

// ─── Database Operations ───────────────────────────────────────────────────

export async function postEntry(entry: PendingEntry, entityId: string) {
  // Generate entry number
  const lastEntry = await db.query.journalEntries.findFirst({
    where: eq(journalEntries.entityId, entityId),
    orderBy: [desc(journalEntries.entryNumber)],
  })
  const entryNumber = (lastEntry?.entryNumber ?? 0) + 1

  // Insert journal entry
  const [journalEntry] = await db
    .insert(journalEntries)
    .values({
      entityId,
      entryNumber,
      description: entry.description,
      reference: entry.reference,
      date: entry.date,
      periodId: entry.periodId,
      status: "posted",
      postedBy: "ledger-agent",
      postedAt: new Date(),
      source: entry.sourceAgent,
      confidence: "0.95",
    })
    .returning()

  // Insert lines
  await Promise.all(
    entry.entries.map((line) =>
      db.insert(journalEntryLines).values({
        journalEntryId: journalEntry.id,
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
      })
    )
  )

  return journalEntry
}

export async function generateTrialBalance(
  entityId: string,
  periodId: string
) {
  const period = await db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.id, periodId),
  })

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
      eq(journalEntries.status, "posted")
    ),
  })

  const accountMap = new Map<
    string,
    { code: string; name: string; type: string; debit: number; credit: number }
  >()

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    })

    for (const line of lines) {
      const existing = accountMap.get(line.accountId)
      if (existing) {
        existing.debit += Number(line.debit)
        existing.credit += Number(line.credit)
      } else {
        const account = await db.query.chartOfAccounts.findFirst({
          where: eq(chartOfAccounts.id, line.accountId),
        })
        accountMap.set(line.accountId, {
          code: account?.code ?? "???",
          name: account?.name ?? "Unknown",
          type: account?.type ?? "asset",
          debit: Number(line.debit),
          credit: Number(line.credit),
        })
      }
    }
  }

  const accounts = Array.from(accountMap.entries()).map(([accountId, data]) => ({
    accountId,
    accountCode: data.code,
    accountName: data.name,
    accountType: data.type as "asset" | "liability" | "equity" | "revenue" | "expense",
    debitBalance: data.debit,
    creditBalance: data.credit,
    netBalance: data.debit - data.credit,
  }))

  const totalDebits = accounts.reduce((sum, a) => sum + a.debitBalance, 0)
  const totalCredits = accounts.reduce((sum, a) => sum + a.creditBalance, 0)

  return {
    periodId,
    periodLabel: period ? `${period.year}-${String(period.month).padStart(2, "0")}` : "Unknown",
    generatedAt: new Date().toISOString(),
    accounts,
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.01,
  }
}
