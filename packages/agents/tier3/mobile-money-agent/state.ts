import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const MobileMoneyOperationEnum = z.enum([
  "ingest_statement",
  "match_transactions",
  "reconcile_wallet",
  "track_fees",
])

export const MobileMoneyOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const IngestionResultSchema = z.object({
  imported: z.number(),
  duplicates: z.number(),
  errors: z.number(),
})

export type IngestionResult = z.infer<typeof IngestionResultSchema>

export const MatchResultSchema = z.object({
  mobileMoneyTxId: z.string().uuid(),
  journalEntryId: z.string().uuid().nullable(),
  matched: z.boolean(),
  confidence: z.number(),
  reason: z.string(),
})

export type MatchResult = z.infer<typeof MatchResultSchema>

export const WalletReconciliationSchema = z.object({
  walletBalance: z.number(),
  ledgerBalance: z.number(),
  difference: z.number(),
  status: z.enum(["reconciled", "discrepancy", "unresolved"]),
})

export type WalletReconciliation = z.infer<typeof WalletReconciliationSchema>

export const FeeAnalysisSchema = z.object({
  totalFees: z.number(),
  feeByProvider: z.record(z.number()),
  averageFeeRate: z.number(),
})

export type FeeAnalysis = z.infer<typeof FeeAnalysisSchema>

export const MobileMoneyState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof MobileMoneyOperationEnum>
    status: z.infer<typeof MobileMoneyOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  ingestionResult: Annotation<IngestionResult | null>,

  matchResults: Annotation<MatchResult[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  walletReconciliation: Annotation<WalletReconciliation | null>,

  feeAnalysis: Annotation<FeeAnalysis | null>,

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

export type MobileMoneyStateType = typeof MobileMoneyState.State
