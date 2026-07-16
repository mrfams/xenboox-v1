import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const AnalyticsOperationEnum = z.enum([
  "financial_ratios",
  "trend_analysis",
  "kpi_dashboard",
  "cash_flow_analysis",
])

export const AnalyticsOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const FinancialRatioSchema = z.object({
  name: z.string(),
  value: z.number(),
  description: z.string(),
  benchmark: z.string().optional(),
  status: z.enum(["good", "warning", "critical"]),
})

export type FinancialRatio = z.infer<typeof FinancialRatioSchema>

export const AnalyticsSummarySchema = z.object({
  period: z.string(),
  ratios: z.array(FinancialRatioSchema),
  insights: z.array(z.string()),
  kpis: z.record(z.number()),
})

export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>

export const AnalyticsState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof AnalyticsOperationEnum>
    status: z.infer<typeof AnalyticsOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  analyticsSummary: Annotation<AnalyticsSummary | null>,

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

export type AnalyticsStateType = typeof AnalyticsState.State
