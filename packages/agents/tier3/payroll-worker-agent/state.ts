import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const PayrollWorkerOperationEnum = z.enum([
  "calculate_paye",
  "calculate_social_security",
  "generate_payslip",
  "process_payroll_batch",
])

export const PayrollWorkerOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const PayslipDataSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  period: z.string(),
  basicSalary: z.number(),
  allowances: z.number(),
  grossPay: z.number(),
  payeTax: z.number(),
  socialSecurityEmployee: z.number(),
  socialSecurityEmployer: z.number(),
  otherDeductions: z.number(),
  loanDeduction: z.number(),
  totalDeductions: z.number(),
  netPay: z.number(),
})

export type PayslipData = z.infer<typeof PayslipDataSchema>

export const PayrollWorkerState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof PayrollWorkerOperationEnum>
    status: z.infer<typeof PayrollWorkerOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  payslips: Annotation<PayslipData[] | null>,

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

export type PayrollWorkerStateType = typeof PayrollWorkerState.State
