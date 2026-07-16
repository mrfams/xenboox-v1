import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const CashOperationEnum = z.enum([
  "daily_cash_position",
  "issue_imprest",
  "retire_imprest",
  "count_cash",
  "detect_discrepancy",
])

export const CashOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const CashPositionSchema = z.object({
  totalBalance: z.number(),
  accountCount: z.number(),
  activeFloats: z.number(),
  outstandingImprest: z.number(),
})

export type CashPosition = z.infer<typeof CashPositionSchema>

export const ImprestResultSchema = z.object({
  floatId: z.string().uuid(),
  amount: z.number(),
  remainingBalance: z.number(),
  status: z.string(),
})

export type ImprestResult = z.infer<typeof ImprestResultSchema>

export const DiscrepancyItemSchema = z.object({
  location: z.string(),
  expected: z.number(),
  actual: z.number(),
  difference: z.number(),
  severity: z.string(),
})

export const DiscrepancyReportSchema = z.object({
  generatedAt: z.string(),
  totalLocations: z.number(),
  discrepancyCount: z.number(),
  discrepancies: z.array(DiscrepancyItemSchema),
})

export type DiscrepancyReport = z.infer<typeof DiscrepancyReportSchema>

export const CashState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof CashOperationEnum>
    status: z.infer<typeof CashOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  cashPosition: Annotation<CashPosition | null>,

  imprestResult: Annotation<ImprestResult | null>,

  discrepancyReport: Annotation<DiscrepancyReport | null>,

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

export type CashStateType = typeof CashState.State
