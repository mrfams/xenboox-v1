import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { AuditEntry } from "../../core/state";

export const ExpenseOperationEnum = z.enum([
  "extract_receipt",
  "check_policy_compliance",
  "route_for_approval",
  "expense_report",
]);

export const ExpenseOperationStatusEnum = z.enum([
  "processing",
  "completed",
  "failed",
]);

export const ExtractedReceiptSchema = z.object({
  documentId: z.string().uuid(),
  vendorName: z.string().nullable(),
  receiptDate: z.string().nullable(),
  totalAmount: z.number().nullable(),
  taxAmount: z.number().nullable(),
  currency: z.string().nullable(),
  category: z.string().nullable(),
  ocrConfidence: z.number().min(0).max(1),
  rawText: z.string().nullable(),
});

export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;

export const PolicyCheckResultSchema = z.object({
  claimId: z.string().uuid(),
  compliant: z.boolean(),
  policyViolations: z.array(
    z.object({
      rule: z.string(),
      severity: z.enum(["warning", "violation"]),
      detail: z.string(),
    }),
  ),
  requiresApproval: z.boolean(),
  approvalLevel: z.string().nullable(),
});

export type PolicyCheckResult = z.infer<typeof PolicyCheckResultSchema>;

export const ApprovalRouteResultSchema = z.object({
  claimId: z.string().uuid(),
  routedTo: z.string(),
  routedToName: z.string(),
  status: z.string(),
  escalationLevel: z.number(),
});

export type ApprovalRouteResult = z.infer<typeof ApprovalRouteResultSchema>;

export const ExpenseState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof ExpenseOperationEnum>;
    status: z.infer<typeof ExpenseOperationStatusEnum>;
    input: Record<string, unknown>;
    output: unknown | null;
    error: string | null;
  } | null>,

  extractedReceipt: Annotation<ExtractedReceipt | null>,
  policyCheckResult: Annotation<PolicyCheckResult | null>,
  approvalRouteResult: Annotation<ApprovalRouteResult | null>,
  expenseReportResult: Annotation<{
    claimCount: number;
    byStatus: Record<string, number>;
    totalAmount: number;
    pendingApproval: number;
  } | null>,

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
});

export type ExpenseStateType = typeof ExpenseState.State;
