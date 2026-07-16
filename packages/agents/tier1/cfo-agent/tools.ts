import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import { chartOfAccounts, journalEntries, journalEntryLines, fiscalPeriods } from "@xenboox/db/schema/accounting"
import type { DepartmentConfirmation, EscalationItem } from "./state"

// ─── Instruction Classification ────────────────────────────────────────────

export type InstructionType =
  | "question"
  | "instruction"
  | "close_trigger"
  | "close_flag"
  | "approval"
  | "clarification"

export function classifyInstruction(text: string): InstructionType {
  const lower = text.toLowerCase().trim()

  if (/^(close|month.end|period.end)/.test(lower) && /close|run|process/.test(lower)) {
    return "close_trigger"
  }
  if (/^(yes|no|approve|reject|confirmed|go ahead|proceed)/.test(lower)) {
    return "approval"
  }
  if (/what|how|when|show|give me|tell me|list|report|summary/.test(lower) && !/close|post|enter|create|record/.test(lower)) {
    return "question"
  }
  if (/wrong|error|mistake|fix|reopen|incorrect|issue/.test(lower)) {
    return "close_flag"
  }
  return "instruction"
}

// ─── Department Routing ────────────────────────────────────────────────────

export type Department = "controller" | "treasury" | "payroll_manager" | "compliance"

export function routeToDepartment(instruction: string): Department {
  const lower = instruction.toLowerCase()

  if (/payroll|salary|wage|benefit|employee pay|staff pay/.test(lower)) {
    return "payroll_manager"
  }
  if (/cash|bank|reconcil|payment|mobile money|expense|treasury/.test(lower)) {
    return "treasury"
  }
  if (/tax|filing|compliance|audit|regulatory|vat/.test(lower)) {
    return "compliance"
  }
  // Default: GL, journal entries, AP, AR, assets, inventory -> Controller
  return "controller"
}

// ─── Close Readiness Check ─────────────────────────────────────────────────

export function evaluateCloseReadiness(
  departments: {
    controller: DepartmentConfirmation
    treasury: DepartmentConfirmation
    payrollManager: DepartmentConfirmation
    compliance: DepartmentConfirmation
  }
): { ready: boolean; blockers: string[]; overallConfidence: number } {
  const blockers: string[] = []
  const confidences: number[] = []

  const checks: Array<{ name: string; dept: DepartmentConfirmation }> = [
    { name: "Controller", dept: departments.controller },
    { name: "Treasury", dept: departments.treasury },
    { name: "Payroll Manager", dept: departments.payrollManager },
    { name: "Compliance", dept: departments.compliance },
  ]

  for (const check of checks) {
    if (!check.dept.confirmed) {
      blockers.push(`${check.name} has not confirmed`)
    }
    if (check.dept.confidence !== null && check.dept.confidence < 0.8) {
      blockers.push(`${check.name} confidence ${check.dept.confidence} below 0.8 threshold`)
    }
    if (check.dept.confidence !== null) {
      confidences.push(check.dept.confidence)
    }
  }

  const overallConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0

  return {
    ready: blockers.length === 0,
    blockers,
    overallConfidence,
  }
}

// ─── Escalation Helpers ────────────────────────────────────────────────────

export function createEscalation(params: {
  fromAgent: string
  severity: "info" | "warning" | "critical"
  description: string
  context: string
}): EscalationItem {
  return {
    id: crypto.randomUUID(),
    ...params,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
  }
}

// ─── Financial Summary Query ───────────────────────────────────────────────

export async function getEntityFinancialSummary(entityId: string) {
  // Get current open period
  const openPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "open")
    ),
  })

  if (!openPeriod) {
    return { period: null, accountCount: 0, totalActivity: 0 }
  }

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, openPeriod.id),
      eq(journalEntries.status, "posted")
    ),
  })

  let totalActivity = 0
  const accountIds = new Set<string>()

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    })
    for (const line of lines) {
      totalActivity += Number(line.debit) + Number(line.credit)
      accountIds.add(line.accountId)
    }
  }

  return {
    period: `${openPeriod.year}-${String(openPeriod.month).padStart(2, "0")}`,
    accountCount: accountIds.size,
    totalActivity,
    entryCount: entries.length,
  }
}
