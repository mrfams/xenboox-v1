import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { documents, documentLinks } from "@xenboox/db/schema/documents";
import type { ClassificationResult, LinkResult } from "./state";
import { extractText } from "@xenboox/jobs/lib/ocr";
import { classifyDocument } from "@xenboox/jobs/lib/classification";
import { extractStructuredData } from "@xenboox/jobs/lib/extraction";

// ─── Ingest Document ──────────────────────────────────────────────────────

export interface IngestDocumentInput {
  name: string;
  type: string;
  r2Key: string;
  r2Bucket: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface IngestDocumentResult {
  success: boolean;
  documentId?: string;
  errors: string[];
}

export async function ingestDocument(
  entityId: string,
  input: IngestDocumentInput,
): Promise<IngestDocumentResult> {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push("Document name is required");
  }
  if (!input.r2Key || input.r2Key.trim().length === 0) {
    errors.push("R2 key is required");
  }
  if (!input.type || input.type.trim().length === 0) {
    errors.push("Document type is required");
  }
  if (!input.r2Bucket || input.r2Bucket.trim().length === 0) {
    errors.push("R2 bucket is required");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const [created] = await db
    .insert(documents)
    .values({
      entityId,
      name: input.name,
      type: input.type as
        | "invoice"
        | "receipt"
        | "contract"
        | "voucher"
        | "bank_statement"
        | "tax_return"
        | "payroll_report"
        | "journal_entry"
        | "po"
        | "supporting",
      status: "detected",
      r2Key: input.r2Key,
      r2Bucket: input.r2Bucket,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
    })
    .returning();

  return { success: true, documentId: created.id, errors: [] };
}

// ─── Extract Document Text (Real OCR) ─────────────────────────────────────

export interface ExtractTextResult {
  success: boolean;
  ocrText: string | null;
  ocrConfidence: number | null;
  method: string | null;
  errors: string[];
}

export async function extractDocumentText(
  entityId: string,
  documentId: string,
): Promise<ExtractTextResult> {
  const errors: string[] = [];

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.entityId, entityId)),
  });

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`);
    return {
      success: false,
      ocrText: null,
      ocrConfidence: null,
      method: null,
      errors,
    };
  }

  // Download from R2 and run OCR
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const response = await r2.send(
    new GetObjectCommand({
      Bucket: doc.r2Bucket,
      Key: doc.r2Key,
    }),
  );

  const fileBuffer = await response.Body?.transformToByteArray();
  if (!fileBuffer) {
    errors.push("Failed to download document from R2");
    return {
      success: false,
      ocrText: null,
      ocrConfidence: null,
      method: null,
      errors,
    };
  }

  const ocrResult = await extractText(
    fileBuffer,
    doc.mimeType ?? "application/pdf",
    entityId,
  );

  await db
    .update(documents)
    .set({
      ocrText: ocrResult.text,
      ocrConfidence: String(ocrResult.confidence),
      status: "extracted",
    })
    .where(and(eq(documents.id, documentId), eq(documents.entityId, entityId)));

  return {
    success: true,
    ocrText: ocrResult.text,
    ocrConfidence: ocrResult.confidence,
    method: ocrResult.method,
    errors: [],
  };
}

// ─── Classify Document (Real AI) ───────────────────────────────────────────

export interface ClassifyDocumentResult {
  success: boolean;
  classification: ClassificationResult | null;
  errors: string[];
}

export async function classifyDocumentAgent(
  entityId: string,
  documentId: string,
  ocrText: string,
): Promise<ClassifyDocumentResult> {
  const errors: string[] = [];

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.entityId, entityId)),
  });

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`);
    return { success: false, classification: null, errors };
  }

  const result = await classifyDocument(
    ocrText,
    doc.mimeType ?? "application/pdf",
    entityId,
  );

  await db
    .update(documents)
    .set({
      type: result.category as
        | "invoice"
        | "receipt"
        | "contract"
        | "voucher"
        | "bank_statement"
        | "tax_return"
        | "payroll_report"
        | "journal_entry"
        | "po"
        | "supporting",
      metadata: {
        ...((doc.metadata as Record<string, unknown>) ?? {}),
        classification: {
          category: result.category,
          confidence: result.confidence,
          reasoning: result.reasoning,
          metadata: result.metadata,
          classifiedAt: new Date().toISOString(),
        },
      },
    })
    .where(and(eq(documents.id, documentId), eq(documents.entityId, entityId)));

  return {
    success: true,
    classification: {
      category: result.category,
      subcategory: null,
      confidence: result.confidence,
    },
    errors: [],
  };
}

// ─── Extract Structured Data (Real AI) ────────────────────────────────────

export interface ExtractStructuredDataResult {
  success: boolean;
  structuredData: Record<string, unknown> | null;
  errors: string[];
}

export async function extractStructuredDataAgent(
  entityId: string,
  documentId: string,
  classification: ClassificationResult,
): Promise<ExtractStructuredDataResult> {
  const errors: string[] = [];

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.entityId, entityId)),
  });

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`);
    return { success: false, structuredData: null, errors };
  }

  if (!doc.ocrText) {
    errors.push(
      `Document ${documentId} has no OCR text — run extract_text first`,
    );
    return { success: false, structuredData: null, errors };
  }

  const extraction = await extractStructuredData(
    doc.ocrText,
    classification.category,
    entityId,
  );

  const structuredData: Record<string, unknown> = {
    category: classification.category,
    classificationConfidence: classification.confidence,
    extractionConfidence: extraction.confidence,
    fieldConfidence: extraction.fieldConfidence,
    extractedAt: new Date().toISOString(),
    sourceDocumentId: documentId,
    data: extraction.data,
  };

  await db
    .update(documents)
    .set({
      metadata: {
        ...((doc.metadata as Record<string, unknown>) ?? {}),
        structuredData,
      },
      status: "synced",
    })
    .where(and(eq(documents.id, documentId), eq(documents.entityId, entityId)));

  return { success: true, structuredData, errors: [] };
}

// ─── Link to Transaction ──────────────────────────────────────────────────

export interface LinkToTransactionResult {
  success: boolean;
  link: LinkResult | null;
  errors: string[];
}

export async function linkToTransaction(
  entityId: string,
  documentId: string,
  entityType: string,
  targetEntityId: string,
): Promise<LinkToTransactionResult> {
  const errors: string[] = [];

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.entityId, entityId)),
  });

  if (!doc) {
    errors.push(`Document ${documentId} not found for entity ${entityId}`);
    return { success: false, link: null, errors };
  }

  if (!entityType || entityType.trim().length === 0) {
    errors.push("Entity type is required for linking");
  }
  if (!targetEntityId || targetEntityId.trim().length === 0) {
    errors.push("Target entity ID is required for linking");
  }
  if (errors.length > 0) {
    return { success: false, link: null, errors };
  }

  const existingLink = await db.query.documentLinks.findFirst({
    where: and(
      eq(documentLinks.documentId, documentId),
      eq(documentLinks.entityType, entityType),
      eq(documentLinks.entityId, targetEntityId),
    ),
  });

  if (existingLink) {
    return {
      success: true,
      link: { documentId, entityType, entityId: targetEntityId, linked: true },
      errors: [],
    };
  }

  await db.insert(documentLinks).values({
    documentId,
    entityType,
    entityId: targetEntityId,
  });

  return {
    success: true,
    link: { documentId, entityType, entityId: targetEntityId, linked: true },
    errors: [],
  };
}
