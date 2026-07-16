import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const BudgetOperationEnum = z.enum([
  "create_budget",
  "variance_analysis",
  "budget_forecast",
  "budget_vs_actual",
])

export const BudgetOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const BudgetItemSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  budgetAmount: z.number(),
  actualAmount: z.number(),
  variance: z.number(),
  variancePercent: z.number(),
})

export type BudgetItem = z.infer<typeof BudgetItemSchema>

export const BudgetSummarySchema = z.object({
  period: z.string(),
  totalBudget: z.number(),
  totalActual: z.number(),
  totalVariance: z.number(),
  variancePercent: z.number(),
  items: z.array(BudgetItemSchema),
})

export type BudgetSummary = z.infer<typeof BudgetSummarySchema>

export const BudgetState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof BudgetOperationEnum>
    status: z.infer<typeof BudgetOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  budgetSummary: Annotation<BudgetSummary | null>,

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

export type BudgetStateType = typeof BudgetState.State
