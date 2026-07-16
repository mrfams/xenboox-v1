import { Annotation } from "@langchain/langgraph"
import type { AuditEntry } from "../../core/state"

export const ComplianceOperationEnum = {
  TAX_REVIEW: "tax_review",
  FILING_STATUS: "filing_status",
  CLOSE_CONFIRMATION: "close_confirmation",
  AUDIT_PREP: "audit_prep",
} as const

export type ComplianceOperationType = typeof ComplianceOperationEnum[keyof typeof ComplianceOperationEnum]

export const ComplianceState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: ComplianceOperationType
    status: "processing" | "completed" | "failed"
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  filingStatus: Annotation<{
    vat: "current" | "overdue" | "not_applicable"
    incomeTax: "current" | "overdue"
    payroll: "current" | "overdue"
  } | null>,

  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,

  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
})

export type ComplianceStateType = typeof ComplianceState.State
