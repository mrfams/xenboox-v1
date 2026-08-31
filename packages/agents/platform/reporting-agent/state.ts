import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { AuditEntry } from "../../core/state";

export const ReportTypeEnum = z.enum([
  "profit_loss",
  "balance_sheet",
  "trial_balance",
  "cash_flow",
  "budget_vs_actual",
  "narrative_summary",
  "custom",
]);

export const ReportFormatEnum = z.enum(["web", "pdf"]);

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
    }),
  ),
  expensesByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    }),
  ),
});

export type ProfitAndLoss = z.infer<typeof ProfitAndLossSchema>;

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
    }),
  ),
  liabilitiesByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    }),
  ),
  equityByAccount: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    }),
  ),
});

export type BalanceSheet = z.infer<typeof BalanceSheetSchema>;

export const TrialBalanceSchema = z.object({
  accounts: z.array(
    z.object({
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      debitBalance: z.number(),
      creditBalance: z.number(),
    }),
  ),
  totalDebits: z.number(),
  totalCredits: z.number(),
  balanced: z.boolean(),
});

export type TrialBalance = z.infer<typeof TrialBalanceSchema>;

export const NarrativeSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
  action: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
  generatedAt: z.string().optional(),
  poweredBy: z.enum(["llm", "fallback"]).default("llm"),
});

export type Narrative = z.infer<typeof NarrativeSchema>;

export const CashFlowLineSchema = z.object({
  accountId: z.string(),
  accountCode: z.string(),
  accountName: z.string(),
  amount: z.number(),
});

export type CashFlowLine = z.infer<typeof CashFlowLineSchema>;

export const CashFlowSchema = z.object({
  period: z.string(),
  openingCash: z.number(),
  closingCash: z.number(),
  netCashChange: z.number(),
  operating: z.object({
    total: z.number(),
    lines: z.array(CashFlowLineSchema),
  }),
  investing: z.object({
    total: z.number(),
    lines: z.array(CashFlowLineSchema),
  }),
  financing: z.object({
    total: z.number(),
    lines: z.array(CashFlowLineSchema),
  }),
});

export type CashFlow = z.infer<typeof CashFlowSchema>;

export const BudgetVsActualLineSchema = z.object({
  accountId: z.string(),
  accountCode: z.string(),
  accountName: z.string(),
  budgetedAmount: z.number(),
  actualAmount: z.number(),
  variance: z.number(),
  variancePct: z.number(),
  status: z.enum(["on_track", "approaching", "exceeded", "no_budget"]),
});

export type BudgetVsActualLine = z.infer<typeof BudgetVsActualLineSchema>;

export const BudgetVsActualSchema = z.object({
  period: z.string(),
  fiscalYear: z.number(),
  budgetName: z.string(),
  totalBudgeted: z.number(),
  totalActual: z.number(),
  totalVariance: z.number(),
  totalVariancePct: z.number(),
  lines: z.array(BudgetVsActualLineSchema),
});

export type BudgetVsActual = z.infer<typeof BudgetVsActualSchema>;

export const ReportingState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Current request
  currentRequest: Annotation<{
    type: z.infer<typeof ReportTypeEnum>;
    period: string;
    format: z.infer<typeof ReportFormatEnum>;
    requestedAt: string;
  } | null>,

  // Report data
  reportData: Annotation<{
    profitAndLoss: ProfitAndLoss | null;
    balanceSheet: BalanceSheet | null;
    trialBalance: TrialBalance | null;
    cashFlow: CashFlow | null;
    budgetVsActual: BudgetVsActual | null;
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
});

export type ReportingStateType = typeof ReportingState.State;
