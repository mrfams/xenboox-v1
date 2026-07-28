import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { AuditEntry } from "../../core/state";

export const TaxOperationEnum = z.enum([
  "calculate_vat",
  "prepare_filing_package",
  "export_jurisdiction_format",
]);

export const TaxOperationStatusEnum = z.enum([
  "processing",
  "completed",
  "failed",
]);

export const VatCalculationSchema = z.object({
  period: z.string(),
  inputVat: z.number(),
  outputVat: z.number(),
  netPosition: z.number(),
  status: z.string(),
  confidence: z.number().min(0).max(1),
});

export type VatCalculation = z.infer<typeof VatCalculationSchema>;

export const FilingPackageSchema = z.object({
  jurisdiction: z.string(),
  period: z.string(),
  filingType: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  status: z.string(),
  formats: z.array(z.string()),
});

export type FilingPackage = z.infer<typeof FilingPackageSchema>;

export const FormatExportSchema = z.object({
  jurisdiction: z.string(),
  format: z.string(),
  content: z.record(z.unknown()),
  exportedAt: z.string(),
});

export type FormatExport = z.infer<typeof FormatExportSchema>;

export const TaxState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof TaxOperationEnum>;
    status: z.infer<typeof TaxOperationStatusEnum>;
    input: Record<string, unknown>;
    output: unknown | null;
    error: string | null;
  } | null>,

  vatCalculation: Annotation<VatCalculation | null>,
  filingPackage: Annotation<FilingPackage | null>,
  formatExport: Annotation<FormatExport | null>,

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

export type TaxStateType = typeof TaxState.State;
