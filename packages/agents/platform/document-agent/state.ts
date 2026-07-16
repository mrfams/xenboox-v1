import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const DocumentOperationEnum = z.enum([
  "ingest_document",
  "extract_text",
  "classify",
  "extract_data",
  "link_transaction",
])

export const DocumentOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const CurrentDocumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  r2Key: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
})

export type CurrentDocument = z.infer<typeof CurrentDocumentSchema>

export const ExtractionResultSchema = z.object({
  ocrText: z.string().nullable(),
  ocrConfidence: z.number().nullable(),
  structuredData: z.record(z.unknown()).nullable(),
})

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>

export const ClassificationResultSchema = z.object({
  category: z.string(),
  subcategory: z.string().nullable(),
  confidence: z.number(),
})

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>

export const LinkResultSchema = z.object({
  documentId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  linked: z.boolean(),
})

export type LinkResult = z.infer<typeof LinkResultSchema>

export const DocumentState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof DocumentOperationEnum>
    status: z.infer<typeof DocumentOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  currentDocument: Annotation<CurrentDocument | null>,

  extractionResult: Annotation<ExtractionResult | null>,

  classificationResult: Annotation<ClassificationResult | null>,

  linkResult: Annotation<LinkResult | null>,

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

export type DocumentStateType = typeof DocumentState.State
