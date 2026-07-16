import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const LedgerOperationEnum = z.enum([
  "post_entry",
  "trial_balance",
  "period_close",
  "period_open",
  "chart_update",
  "balance_check",
])

export const LedgerOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const PendingEntrySchema = z.object({
  id: z.string().uuid(),
  sourceAgent: z.string(),
  approvedByController: z.boolean(),
  entries: z.array(
    z.object({
      accountId: z.string().uuid(),
      accountCode: z.string(),
      debit: z.number().min(0),
      credit: z.number().min(0),
    })
  ),
  totalDebit: z.number(),
  totalCredit: z.number(),
  reference: z.string().nullable(),
  description: z.string(),
  periodId: z.string().uuid(),
  date: z.string(),
})

export type PendingEntry = z.infer<typeof PendingEntrySchema>

export const TrialBalanceAccountSchema = z.object({
  accountId: z.string().uuid(),
  accountCode: z.string(),
  accountName: z.string(),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  debitBalance: z.number(),
  creditBalance: z.number(),
  netBalance: z.number(),
})

export const TrialBalanceSchema = z.object({
  periodId: z.string().uuid(),
  periodLabel: z.string(),
  generatedAt: z.string(),
  accounts: z.array(TrialBalanceAccountSchema),
  totalDebits: z.number(),
  totalCredits: z.number(),
  balanced: z.boolean(),
})

export type TrialBalance = z.infer<typeof TrialBalanceSchema>

export const ConstraintLogEntrySchema = z.object({
  timestamp: z.string(),
  constraint: z.string(),
  passed: z.boolean(),
  details: z.string(),
  entryId: z.string().uuid().nullable(),
})

export type ConstraintLogEntry = z.infer<typeof ConstraintLogEntrySchema>

export const LedgerState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Operation
  currentOperation: Annotation<{
    type: z.infer<typeof LedgerOperationEnum>
    status: z.infer<typeof LedgerOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  // Entry being processed
  pendingEntry: Annotation<PendingEntry | null>,

  // Trial balance
  trialBalance: Annotation<TrialBalance | null>,

  // Constraint enforcement log
  constraintLog: Annotation<ConstraintLogEntry[]>({
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

export type LedgerStateType = typeof LedgerState.State
