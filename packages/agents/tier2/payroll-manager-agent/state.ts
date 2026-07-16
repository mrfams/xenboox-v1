import { Annotation } from "@langchain/langgraph"
import type { AuditEntry } from "../../core/state"

export const PayrollOperationEnum = {
  PROCESS_PAYROLL: "process_payroll",
  VALIDATE_PAYROLL: "validate_payroll",
  CLOSE_CONFIRMATION: "close_confirmation",
} as const

export type PayrollOperationType = typeof PayrollOperationEnum[keyof typeof PayrollOperationEnum]

export const PayrollManagerState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: PayrollOperationType
    status: "processing" | "completed" | "failed"
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  payrollSummary: Annotation<{
    period: string
    employeeCount: number
    grossPay: number
    deductions: number
    netPay: number
    status: "validated" | "pending" | "failed"
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

export type PayrollManagerStateType = typeof PayrollManagerState.State
