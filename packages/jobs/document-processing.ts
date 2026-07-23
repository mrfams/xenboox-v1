import { task, logger } from "@trigger.dev/sdk";
import { triggerClient } from "./trigger-client";
import { db } from "@xenboox/db";
import { documents, auditLog } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { extractText } from "./lib/ocr";
import { classifyDocument } from "./lib/classification";
import { extractStructuredData } from "./lib/extraction";

// ---------------------------------------------------------------------------
// Pipeline Helpers
// ---------------------------------------------------------------------------

async function writeAudit(params: {
  entityId: string;
  action: string;
  entityIdRef: string;
  newValues: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    entityId: params.entityId,
    action: params.action,
    entityType: "document",
    entityIdRef: params.entityIdRef,
    newValues: params.newValues,
  });
}

async function transitionStatus(
  documentId: string,
  entityId: string,
  status: string,
  auditAction: string,
  metadata?: Record<string, unknown>,
) {
  await db
    .update(documents)
    .set({ status } as any)
    .where(eq(documents.id, documentId));
  await writeAudit({
    entityId,
    action: auditAction,
    entityIdRef: documentId,
    newValues: { status, ...metadata },
  });
}

async function getExistingMetadata(
  documentId: string,
): Promise<Record<string, unknown>> {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
  return (doc?.metadata as Record<string, unknown>) ?? {};
}

// ---------------------------------------------------------------------------
// R2 Client
// ---------------------------------------------------------------------------

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ---------------------------------------------------------------------------
// Stage 2/5: PROCESSING - Format detection + file download
// ---------------------------------------------------------------------------

async function stageProcessing(
  documentId: string,
  entityId: string,
  storagePath: string,
  mimeType: string,
): Promise<{ fileBuffer: Uint8Array }> {
  logger.info("[Stage 2/5] PROCESSING - Format detection and parsing", {
    documentId,
    mimeType,
  });

  await transitionStatus(
    documentId,
    entityId,
    "processing",
    "document.processing",
    {
      pipelineStage: 2,
      mimeType,
    },
  );

  const response = await r2.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: storagePath,
    }),
  );

  const fileBuffer = await response.Body?.transformToByteArray();
  if (!fileBuffer) {
    throw new Error("Failed to read file from R2");
  }

  logger.info("File downloaded from R2", {
    documentId,
    size: fileBuffer.length,
  });

  return { fileBuffer };
}

// ---------------------------------------------------------------------------
// Stage 3/5: EXTRACTED - OCR text extraction + confidence scoring
// ---------------------------------------------------------------------------

async function stageExtracted(
  documentId: string,
  entityId: string,
  fileBuffer: Uint8Array,
  mimeType: string,
): Promise<{
  ocrResult: Awaited<ReturnType<typeof extractText>>;
}> {
  logger.info("[Stage 3/5] EXTRACTED - OCR and field population", {
    documentId,
  });

  const ocrResult = await extractText(fileBuffer, mimeType);

  logger.info("OCR completed", {
    documentId,
    method: ocrResult.method,
    confidence: ocrResult.confidence,
    textLength: ocrResult.text.length,
    pageCount: ocrResult.pageCount,
  });

  const existingMetadata = await getExistingMetadata(documentId);

  await db
    .update(documents)
    .set({
      ocrText: ocrResult.text,
      ocrConfidence: String(ocrResult.confidence),
      status: "extracted",
      metadata: {
        ...existingMetadata,
        ocr: {
          method: ocrResult.method,
          confidence: ocrResult.confidence,
          pageCount: ocrResult.pageCount,
          completedAt: new Date().toISOString(),
        },
      },
    } as any)
    .where(eq(documents.id, documentId));

  await writeAudit({
    entityId,
    action: "document.extracted",
    entityIdRef: documentId,
    newValues: {
      pipelineStage: 3,
      method: ocrResult.method,
      confidence: ocrResult.confidence,
      textLength: ocrResult.text.length,
    },
  });

  return { ocrResult };
}

// ---------------------------------------------------------------------------
// Stage 4/5: SYNCED - Classification + structured extraction + validation
// ---------------------------------------------------------------------------

async function stageSynced(
  documentId: string,
  entityId: string,
  ocrText: string,
  mimeType: string,
): Promise<{
  classification: Awaited<ReturnType<typeof classifyDocument>>;
  extraction: Awaited<ReturnType<typeof extractStructuredData>>;
}> {
  logger.info(
    "[Stage 4/5] SYNCED - Schema validation and structured extraction",
    {
      documentId,
    },
  );

  const classification = await classifyDocument(ocrText, mimeType);

  logger.info("Classification completed", {
    documentId,
    category: classification.category,
    confidence: classification.confidence,
  });

  await db
    .update(documents)
    .set({
      type: classification.category as any,
    })
    .where(eq(documents.id, documentId));

  await writeAudit({
    entityId,
    action: "document.classified",
    entityIdRef: documentId,
    newValues: {
      pipelineStage: 4,
      category: classification.category,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    },
  });

  const extraction = await extractStructuredData(
    ocrText,
    classification.category,
  );

  logger.info("Data extraction completed", {
    documentId,
    type: extraction.type,
    confidence: extraction.confidence,
  });

  const existingMetadata = await getExistingMetadata(documentId);

  await db
    .update(documents)
    .set({
      status: "synced",
      metadata: {
        ...existingMetadata,
        classifiedAt: new Date().toISOString(),
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          metadata: classification.metadata,
        },
        extraction: {
          type: extraction.type,
          confidence: extraction.confidence,
          fieldConfidence: extraction.fieldConfidence,
          data: extraction.data ?? {},
        },
      },
    } as any)
    .where(eq(documents.id, documentId));

  await writeAudit({
    entityId,
    action: "document.synced",
    entityIdRef: documentId,
    newValues: {
      pipelineStage: 4,
      category: classification.category,
      extractionType: extraction.type,
      extractionConfidence: extraction.confidence,
      fieldCount: Object.keys(extraction.fieldConfidence ?? {}).length,
      lowConfidenceFields: Object.entries(extraction.fieldConfidence ?? {})
        .filter(([_, score]) => score < 0.7)
        .map(([field, _]) => field),
    },
  });

  return { classification, extraction };
}

// ---------------------------------------------------------------------------
// Stage 5/5: AGENT_PROCESSING - Hand off to agent pipeline
// ---------------------------------------------------------------------------

async function stageAgentProcessing(
  documentId: string,
  entityId: string,
  classification: Awaited<ReturnType<typeof classifyDocument>>,
  storagePath: string,
  mimeType: string,
): Promise<void> {
  logger.info("[Stage 5/5] AGENT_PROCESSING - Hand off to agent pipeline", {
    documentId,
    category: classification.category,
  });

  await transitionStatus(
    documentId,
    entityId,
    "agent_processing",
    "document.agent_processing",
    {
      pipelineStage: 5,
      category: classification.category,
    },
  );

  // Trigger downstream jobs based on document type
  if (classification.category === "bank_statement") {
    logger.info("Bank statement detected, triggering bank import", {
      documentId,
    });
    await triggerClient.tasks.trigger("import-bank-statement", {
      documentId,
      entityId,
      storagePath,
      mimeType,
    });
  }

  if (
    classification.category === "invoice" ||
    classification.category === "receipt"
  ) {
    logger.info("Triggering auto-link for document", {
      documentId,
      category: classification.category,
    });
    await triggerClient.tasks.trigger("auto-link-document", {
      documentId,
      entityId,
    });
  }

  // Always trigger the autonomous accounting ingestion pipeline
  // This runs after the document is fully processed and classified.
  // It will determine the accounting treatment, map to COA, generate
  // journal entries, score confidence, and auto-post or request review.
  logger.info("Triggering autonomous accounting ingestion", {
    documentId,
    category: classification.category,
  });
  await triggerClient.tasks.trigger("run-document-ingestion", {
    documentId,
    entityId,
  });
}

// ---------------------------------------------------------------------------
// Main Task
// ---------------------------------------------------------------------------

export const processDocument = task({
  id: "process-document",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 10,
  },

  run: async (payload: {
    documentId: string;
    entityId: string;
    storagePath: string;
    mimeType: string;
  }) => {
    const { documentId, entityId, storagePath, mimeType } = payload;

    logger.info("Starting document pipeline", {
      documentId,
      mimeType,
      entityId,
    });

    // Stage 1: DETECTED - Document already exists in DB with status='detected'
    // (Handled by the upload/create endpoint when the document row was created)
    logger.info("[Stage 1/5] DETECTED - Document received, starting pipeline", {
      documentId,
    });

    try {
      // Stage 2: PROCESSING - Format detection, file download, parser routing
      const { fileBuffer } = await stageProcessing(
        documentId,
        entityId,
        storagePath,
        mimeType,
      );

      // Stage 3: EXTRACTED - OCR text extraction, per-field confidence scoring
      const { ocrResult } = await stageExtracted(
        documentId,
        entityId,
        fileBuffer,
        mimeType,
      );

      // Stage 4: SYNCED - Classification, structured extraction, validation
      const { classification, extraction } = await stageSynced(
        documentId,
        entityId,
        ocrResult.text,
        mimeType,
      );

      // Stage 5: AGENT_PROCESSING - Hand off to downstream agent jobs
      await stageAgentProcessing(
        documentId,
        entityId,
        classification,
        storagePath,
        mimeType,
      );

      logger.info("Document pipeline completed successfully", {
        documentId,
        category: classification.category,
        extractionType: extraction.type,
        stagesCompleted: 5,
      });

      return {
        success: true,
        documentId,
        pipelineStages: 5,
        category: classification.category,
        extractionType: extraction.type,
        ocrMethod: ocrResult.method,
        ocrConfidence: ocrResult.confidence,
        classificationConfidence: classification.confidence,
        extractionConfidence: extraction.confidence,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("Document pipeline failed", {
        documentId,
        error: errorMessage,
      });

      await db
        .update(documents)
        .set({
          status: "failed",
          metadata: {
            error: errorMessage,
            failedAt: new Date().toISOString(),
            pipelineStage: "failed",
          },
        } as any)
        .where(eq(documents.id, documentId));

      await writeAudit({
        entityId,
        action: "document.failed",
        entityIdRef: documentId,
        newValues: { error: errorMessage, pipelineStage: "failed" },
      });

      throw error;
    }
  },
});
