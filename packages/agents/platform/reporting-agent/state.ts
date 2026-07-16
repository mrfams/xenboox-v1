import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const ReportTypeEnum = z.enum([
  "profit_loss",
  "balance_sheet",
  "trial_balance",
  "narrative_summary",
  "custom",
])

export const ReportFormatEnum = z.enum(["web", "pdf"])

export const ProfitAndLossSchema = z.object({
  revenue: z.number(),
  expenses: z.number(),
  netProfit: z.number(),
  revenueByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  expensesByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
})

export type ProfitAndLoss = z.infer<typeof ProfitAndLossSchema>

export const BalanceSheetSchema = z.object({
  assets: z.number(),
  liabilities: z.number(),
  equity: z.number(),
  assetsByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  liabilitiesByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  equityByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
})

export type BalanceSheet = z.infer<typeof BalanceSheetSchema>

export const TrialBalanceSchema = z.object({
  accounts: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      debitBalance: z.number(),
      creditBalance: z.number(),
    })
  ),
  totalDebits: z.number(),
  totalCredits: z.number(),
  balanced: z.boolean(),
})

export type TrialBalance = z.infer<typeof TrialBalanceSchema>

export const NarrativeSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
})

export type Narrative = z.infer<typeof NarrativeSchema>

export const ReportingState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Current request
  currentRequest: Annotation<{
    type: z.infer<typeof ReportTypeEnum>
    period: string
    format: z.infer<typeof ReportFormatEnum>
    requestedAt: string
  } | null>,

  // Report data
  reportData: Annotation<{
    profitAndLoss: ProfitAndLoss | null
    balanceSheet: BalanceSheet | null
    trialBalance: TrialBalance | null
  } | null>,

  // Narrative summary
  narrative: Annotation<Narrative | null>,

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

export type ReportingStateType = typeof ReportingState.State
