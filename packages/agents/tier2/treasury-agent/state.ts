import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { AuditEntry } from "../../core/state";

export const TreasuryOperationEnum = z.enum([
  "cash_position",
  "reconcile",
  "daily_report",
  "close",
]);

export const TreasuryOperationStatusEnum = z.enum([
  "processing",
  "completed",
  "failed",
]);

export const BankAccountSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  balance: z.number(),
  lastReconciled: z.string().nullable(),
});

export const MMWalletSummarySchema = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  balance: z.number(),
});

export const CashPositionSchema = z.object({
  bankAccounts: z.array(BankAccountSummarySchema),
  mmWallets: z.array(MMWalletSummarySchema),
  physicalCash: z.number(),
  totalBaseCurrency: z.number(),
});

export const ReconciliationStatusSchema = z.object({
  bankComplete: z.boolean(),
  mmComplete: z.boolean(),
  cashComplete: z.boolean(),
  unresolvedItems: z.number(),
});

export const DailyReportSchema = z.object({
  date: z.string(),
  totalCash: z.number(),
  alerts: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type BankAccountSummary = z.infer<typeof BankAccountSummarySchema>;
export type MMWalletSummary = z.infer<typeof MMWalletSummarySchema>;
export type CashPosition = z.infer<typeof CashPositionSchema>;
export type ReconciliationStatus = z.infer<typeof ReconciliationStatusSchema>;
export type DailyReport = z.infer<typeof DailyReportSchema>;

export const TreasuryState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof TreasuryOperationEnum>;
    status: z.infer<typeof TreasuryOperationStatusEnum>;
    input: Record<string, unknown>;
    output: unknown | null;
    error: string | null;
  } | null>,

  cashPosition: Annotation<CashPosition | null>,

  reconciliationStatus: Annotation<ReconciliationStatus | null>,

  dailyReport: Annotation<DailyReport | null>,

  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,
  humanResponse: Annotation<string | null>,

  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
});

export type TreasuryStateType = typeof TreasuryState.State;
