import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const ControllerOperationEnum = z.enum([
  "review_entries",
  "review_trial_balance",
  "run_close_checklist",
  "reconcile_subledgers",
])

export const ControllerOperationStatusEnum = z.enum([
  "processing",
  "completed",
  "failed",
])

export const ReviewStatusEnum = z.enum([
  "pending",
  "approved",
  "rejected",
  "needs_correction",
])

export const PendingEntryReviewSchema = z.object({
  id: z.string().uuid(),
  sourceAgent: z.string(),
  description: z.string(),
  entries: z.array(
    z.object({
      accountId: z.string().uuid(),
      accountCode: z.string(),
      accountName: z.string().nullable(),
      debit: z.number().min(0),
      credit: z.number().min(0),
    })
  ),
  totalDebit: z.number(),
  totalCredit: z.number(),
  reference: z.string().nullable(),
  status: ReviewStatusEnum,
  rejectionReason: z.string().nullable(),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  confidence: z.number().min(0).max(1),
})

export type PendingEntryReview = z.infer<typeof PendingEntryReviewSchema>

export const SubLedgerStatusSchema = z.object({
  ap: z.object({ reconciled: z.boolean(), variance: z.number() }),
  ar: z.object({ reconciled: z.boolean(), variance: z.number() }),
  fixedAssets: z.object({ reconciled: z.boolean(), variance: z.number() }),
  inventory: z.object({ reconciled: z.boolean(), variance: z.number() }),
})

export type SubLedgerStatus = z.infer<typeof SubLedgerStatusSchema>

export const CloseChecklistItemSchema = z.object({
  domain: z.string(),
  description: z.string(),
  status: z.enum(["pending", "in_progress", "complete", "blocked"]),
  completedAt: z.string().nullable(),
  blockedReason: z.string().nullable(),
})

export const CloseChecklistSchema = z.object({
  period: z.string(),
  items: z.array(CloseChecklistItemSchema),
  allComplete: z.boolean(),
  confirmedToCFO: z.boolean(),
})

export type CloseChecklist = z.infer<typeof CloseChecklistSchema>

export const ControllerState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Current operation
  currentOperation: Annotation<{
    type: z.infer<typeof ControllerOperationEnum>
    status: z.infer<typeof ControllerOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  // Pending entries for review (batch)
  pendingEntries: Annotation<PendingEntryReview[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  // Review results
  approvedEntries: Annotation<PendingEntryReview[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
  rejectedEntries: Annotation<PendingEntryReview[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  // Trial balance
  trialBalance: Annotation<{
    generatedAt: string | null
    totalDebits: number
    totalCredits: number
    balanced: boolean
    accounts: Array<{
      accountId: string
      accountCode: string
      accountName: string
      debitBalance: number
      creditBalance: number
    }>
  } | null>,

  // Close checklist
  closeChecklist: Annotation<CloseChecklist | null>,

  // Sub-ledger reconciliation
  subLedgerStatus: Annotation<SubLedgerStatus | null>,

  // Audit
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

export type ControllerStateType = typeof ControllerState.State
