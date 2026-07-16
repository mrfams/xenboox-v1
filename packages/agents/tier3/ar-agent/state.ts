import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const ArOperationEnum = z.enum([
  "create_invoice",
  "aging_report",
  "match_payment",
  "overdue_alerts",
])

export const ArOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const AgingBucketSchema = z.object({
  current: z.number(),
  days30: z.number(),
  days60: z.number(),
  days90: z.number(),
  days120Plus: z.number(),
})

export type AgingBucket = z.infer<typeof AgingBucketSchema>

export const AgingReportSchema = z.object({
  generatedAt: z.string(),
  totalOutstanding: z.number(),
  buckets: AgingBucketSchema,
  invoiceCount: z.number(),
  overdueCount: z.number(),
})

export type AgingReport = z.infer<typeof AgingReportSchema>

export const OverdueAlertSchema = z.object({
  invoiceId: z.string().uuid(),
  customerName: z.string(),
  amount: z.number(),
  daysOverdue: z.number(),
  escalationLevel: z.enum(["7d", "30d", "60d", "90d+"]),
})

export type OverdueAlert = z.infer<typeof OverdueAlertSchema>

export const ArState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Operation
  currentOperation: Annotation<{
    type: z.infer<typeof ArOperationEnum>
    status: z.infer<typeof ArOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  // Aging report
  agingReport: Annotation<AgingReport | null>,

  // Overdue alerts
  overdueAlerts: Annotation<OverdueAlert[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  // Audit trail
  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  // Result
  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,

  // Errors
  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
})

export type ArStateType = typeof ArState.State
