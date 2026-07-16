import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const ReconciliationOperationEnum = z.enum([
  "match_transactions",
  "ingest_statement",
  "reconciliation_report",
  "flag_unmatched",
])

export const ReconciliationOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const MatchFactorSchema = z.object({
  amountMatch: z.number().min(0).max(1),
  dateProximity: z.number().min(0).max(1),
  referenceMatch: z.number().min(0).max(1),
})

export const MatchResultSchema = z.object({
  statementTxId: z.string().uuid(),
  ledgerEntryId: z.string().uuid().nullable(),
  matchType: z.enum(["exact", "fuzzy", "unmatched"]),
  confidence: z.number().min(0).max(1),
  matchFactors: MatchFactorSchema,
})

export type MatchResult = z.infer<typeof MatchResultSchema>

export const ReconciliationSummarySchema = z.object({
  matchedCount: z.number(),
  unmatchedCount: z.number(),
  totalAmount: z.number(),
  matchedAmount: z.number(),
  unmatchedAmount: z.number(),
})

export type ReconciliationSummary = z.infer<typeof ReconciliationSummarySchema>

export const ReconciliationState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof ReconciliationOperationEnum>
    status: z.infer<typeof ReconciliationOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  currentMatchResults: Annotation<MatchResult[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  reconciliationSummary: Annotation<ReconciliationSummary | null>,

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

export type ReconciliationStateType = typeof ReconciliationState.State
