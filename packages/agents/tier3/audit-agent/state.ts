import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { AuditEntry } from "../../core/state";

export const AuditOperationEnum = z.enum([
  "sample_transactions",
  "compare_to_golden_dataset",
  "prepare_audit_package",
  "respond_to_auditor_query",
  "detect_pattern_deviations",
  "independent_recomputation",
  "anomaly_detection",
]);

export const AuditOperationStatusEnum = z.enum([
  "processing",
  "completed",
  "failed",
]);

export const AuditSampleSchema = z.object({
  sampleId: z.string(),
  totalTransactions: z.number(),
  sampleSize: z.number(),
  criteria: z.string(),
  items: z.array(
    z.object({
      transactionId: z.string(),
      amount: z.number(),
      date: z.string(),
      description: z.string(),
      status: z.string(),
      flags: z.array(z.string()),
    }),
  ),
});

export type AuditSample = z.infer<typeof AuditSampleSchema>;

export const GoldenDatasetComparisonSchema = z.object({
  agentId: z.string(),
  totalChecks: z.number(),
  passed: z.number(),
  failed: z.number(),
  score: z.number(),
  deviations: z.array(
    z.object({
      scenario: z.string(),
      expected: z.string(),
      actual: z.string(),
      severity: z.enum(["info", "warning", "critical"]),
    }),
  ),
});

export type GoldenDatasetComparison = z.infer<
  typeof GoldenDatasetComparisonSchema
>;

export const AuditPackageSchema = z.object({
  entityId: z.string(),
  period: z.string(),
  preparedAt: z.string(),
  sections: z.array(
    z.object({
      name: z.string(),
      itemCount: z.number(),
      status: z.string(),
    }),
  ),
  totalItems: z.number(),
});

export type AuditPackage = z.infer<typeof AuditPackageSchema>;

export const AuditorQueryResponseSchema = z.object({
  queryId: z.string(),
  response: z.string(),
  supportingDocuments: z.array(z.string()),
  confidence: z.number(),
  requiresFollowUp: z.boolean(),
});

export type AuditorQueryResponse = z.infer<typeof AuditorQueryResponseSchema>;

export const AuditState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof AuditOperationEnum>;
    status: z.infer<typeof AuditOperationStatusEnum>;
    input: Record<string, unknown>;
    output: unknown | null;
    error: string | null;
  } | null>,

  auditSample: Annotation<AuditSample | null>,
  goldenDatasetComparison: Annotation<GoldenDatasetComparison | null>,
  auditPackage: Annotation<AuditPackage | null>,
  auditorQueryResponse: Annotation<AuditorQueryResponse | null>,
  patternDeviations: Annotation<{
    hasDeviation: boolean;
    deviations: Array<{ type: string; detail: string; severity: string }>;
    confidence: number;
  } | null>,
  recomputationResults: Annotation<Array<{
    transactionRef: string;
    recomputedResult: Record<string, unknown>;
    matchesOriginal: boolean;
  }> | null>,
  anomalyResults: Annotation<Array<{
    type: string;
    description: string;
    severity: string;
  }> | null>,

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

export type AuditStateType = typeof AuditState.State;
