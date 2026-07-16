import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import { documents, documentLinks, auditLog } from "@xenboox/db/schema/documents"
import type { CurrentDocument, ExtractionResult, ClassificationResult, LinkResult } from "./state"

// ─── Ingest Document ──────────────────────────────────────────────────────

export interface IngestDocumentInput {
  name: string
  type: string
  r2Key: string
  r2Bucket: string
  mimeType?: string
  sizeBytes?: number
}

export interface IngestDocumentResult {
  success: boolean
  documentId?: string
  errors: string[]
}

export async function ingestDocument(
  entityId: string,
  input: IngestDocumentInput
): Promise<IngestDocumentResult> {
  const errors: string[] = []

  if (!input.name || input.name.trim().length === 0) {
    errors.push("Document name is required")
  }

  if (!input.r2Key || input.r2Key.trim().length === 0) {
    errors.push("R2 key is required")
  }

  if (!input.type || input.type.trim().length === 0) {
    errors.push("Document type is required")
  }

  if (!input.r2Bucket || input.r2Bucket.trim().length === 0) {
    errors.push("R2 bucket is required")
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  const [created] = await db
    .insert(documents)
    .values({
      entityId,
      name: input.name,
      type: input.type as "invoice" | "receipt" | "contract" | "voucher" | "bank_statement" | "tax_return" | "payroll_report" | "journal_entry" | "po" | "supporting",
      status: "uploaded",
      r2Key: input.r2Key,
      r2Bucket: input.r2Bucket,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
    })
    .returning()

  return {
    success: true,
    documentId: created.id,
    errors: [],
  }
}

// ─── Extract Document Text (simulated OCR) ────────────────────────────────

export interface ExtractTextResult {
  success: boolean
  ocrText: string | null
  ocrConfidence: number | null
  errors: string[]
}

export async function extractDocumentText(
  entityId: string,
  documentId: string
): Promise<ExtractTextResult> {
  const errors: string[] = []

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.entityId, entityId),
    ),
  })

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`)
    return { success: false, ocrText: null, ocrConfidence: null, errors }
  }

  const simulatedOcrText = `[OCR extraction placeholder for document "${doc.name}" (${doc.r2Key})]`
  const simulatedConfidence = 0.88

  await db
    .update(documents)
    .set({
      ocrText: simulatedOcrText,
      ocrConfidence: String(simulatedConfidence),
      status: "processing",
    })
    .where(and(eq(documents.id, documentId), eq(documents.entityId, entityId)))

  return {
    success: true,
    ocrText: simulatedOcrText,
    ocrConfidence: simulatedConfidence,
    errors: [],
  }
}

// ─── Classify Document ────────────────────────────────────────────────────

export interface ClassifyDocumentResult {
  success: boolean
  classification: ClassificationResult | null
  errors: string[]
}

export async function classifyDocument(
  entityId: string,
  documentId: string,
  ocrText: string
): Promise<ClassifyDocumentResult> {
  const errors: string[] = []

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.entityId, entityId),
    ),
  })

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`)
    return { success: false, classification: null, errors }
  }

  const lowerText = ocrText.toLowerCase()

  let category = "supporting"
  let subcategory: string | null = null
  let confidence = 0.5

  if (lowerText.includes("invoice") || lowerText.includes("bill")) {
    category = "invoice"
    subcategory = lowerText.includes("tax") ? "tax_invoice" : "supplier_invoice"
    confidence = 0.85
  } else if (lowerText.includes("receipt")) {
    category = "receipt"
    subcategory = lowerText.includes("purchase") ? "purchase_receipt" : "payment_receipt"
    confidence = 0.82
  } else if (lowerText.includes("statement") || lowerText.includes("bank")) {
    category = "bank_statement"
    confidence = 0.88
  } else if (lowerText.includes("contract") || lowerText.includes("agreement")) {
    category = "contract"
    confidence = 0.80
  } else if (lowerText.includes("payslip") || lowerText.includes("payroll")) {
    category = "payroll_report"
    confidence = 0.83
  } else if (lowerText.includes("tax") || lowerText.includes("vat")) {
    category = "tax_return"
    confidence = 0.78
  }

  await db
    .update(documents)
    .set({
      type: category as "invoice" | "receipt" | "contract" | "voucher" | "bank_statement" | "tax_return" | "payroll_report" | "journal_entry" | "po" | "supporting",
    })
    .where(and(eq(documents.id, documentId), eq(documents.entityId, entityId)))

  return {
    success: true,
    classification: { category, subcategory, confidence },
    errors: [],
  }
}

// ─── Extract Structured Data ──────────────────────────────────────────────

export interface ExtractStructuredDataResult {
  success: boolean
  structuredData: Record<string, unknown> | null
  errors: string[]
}

export async function extractStructuredData(
  entityId: string,
  documentId: string,
  classification: ClassificationResult
): Promise<ExtractStructuredDataResult> {
  const errors: string[] = []

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.entityId, entityId),
    ),
  })

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`)
    return { success: false, structuredData: null, errors }
  }

  if (!doc.ocrText) {
    errors.push(`Document ${documentId} has no OCR text — run extract_text first`)
    return { success: false, structuredData: null, errors }
  }

  const structuredData: Record<string, unknown> = {
    category: classification.category,
    subcategory: classification.subcategory,
    classificationConfidence: classification.confidence,
    extractedAt: new Date().toISOString(),
    sourceDocumentId: documentId,
    ocrTextLength: doc.ocrText.length,
  }

  if (classification.category === "invoice") {
    structuredData.invoiceFields = {
      invoiceNumber: null,
      supplierName: null,
      totalAmount: null,
      taxAmount: null,
      dueDate: null,
      lineItems: [],
    }
  } else if (classification.category === "receipt") {
    structuredData.receiptFields = {
      merchantName: null,
      totalAmount: null,
      transactionDate: null,
      paymentMethod: null,
    }
  } else if (classification.category === "bank_statement") {
    structuredData.statementFields = {
      bankName: null,
      accountNumber: null,
      statementPeriod: null,
      openingBalance: null,
      closingBalance: null,
      transactions: [],
    }
  }

  await db
    .update(documents)
    .set({
      metadata: { ...((doc.metadata as Record<string, unknown>) ?? {}), structuredData },
      status: "processed",
    })
    .where(and(eq(documents.id, documentId), eq(documents.entityId, entityId)))

  return {
    success: true,
    structuredData,
    errors: [],
  }
}

// ─── Link to Transaction ──────────────────────────────────────────────────

export interface LinkToTransactionResult {
  success: boolean
  link: LinkResult | null
  errors: string[]
}

export async function linkToTransaction(
  entityId: string,
  documentId: string,
  entityType: string,
  targetEntityId: string
): Promise<LinkToTransactionResult> {
  const errors: string[] = []

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.entityId, entityId),
    ),
  })

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`)
    return { success: false, link: null, errors }
  }

  if (!entityType || entityType.trim().length === 0) {
    errors.push("Entity type is required for linking")
  }

  if (!targetEntityId || targetEntityId.trim().length === 0) {
    errors.push("Target entity ID is required for linking")
  }

  if (errors.length > 0) {
    return { success: false, link: null, errors }
  }

  const existingLink = await db.query.documentLinks.findFirst({
    where: and(
      eq(documentLinks.documentId, documentId),
      eq(documentLinks.entityType, entityType),
      eq(documentLinks.entityId, targetEntityId),
    ),
  })

  if (existingLink) {
    return {
      success: true,
      link: {
        documentId,
        entityType,
        entityId: targetEntityId,
        linked: true,
      },
      errors: [],
    }
  }

  await db.insert(documentLinks).values({
    documentId,
    entityType,
    entityId: targetEntityId,
  })

  return {
    success: true,
    link: {
      documentId,
      entityType,
      entityId: targetEntityId,
      linked: true,
    },
    errors: [],
  }
}
