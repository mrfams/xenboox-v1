import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { triggerClient } from "./trigger-client";
import { db } from "@xenboox/db";
import { documents } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";
import { extractText } from "./lib/ocr";
import { downloadFromR2 } from "./lib/r2";
import { classifyDocument } from "./lib/classification";
import { extractStructuredData } from "./lib/extraction";
import { runTrustGuard } from "@xenboox/ingestion/engine/trust-guard";
import type { IngestionState } from "@xenboox/ingestion/core/types";
import { assertMimeMatches } from "@xenboox/ingestion/engine/file-validation";
import {
  updateIngestionStatus,
  updateTerminalStatus,
  transitionToFailed,
  type PipelineStage,
} from "@xenboox/ingestion/engine/status-tracker";

// ---------------------------------------------------------------------------
// Pipeline Helpers
// ---------------------------------------------------------------------------

async function getExistingMetadata(
  documentId: string,
): Promise<Record<string, unknown>> {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
  return (doc?.metadata as Record<string, unknown>) ?? {};
}

/**
 * Race a promise against a timeout — rejects if the promise does not
 * settle within `ms`, preventing a hung R2 call from pinning the task.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Operation timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Stage 1: DETECTED — Document received, starting pipeline
// ---------------------------------------------------------------------------

async function stageDetected(
  documentId: string,
  entityId: string,
): Promise<void> {
  logger.info("[Stage 1] DETECTED — Document received, starting pipeline", {
    documentId,
  });

  // Only stamp "detected" on a genuinely fresh run. On a task retry the
  // document is already mid-pipeline (or beyond) — re-setting the status to
  // stage 1 would regress progress tracking and write a redundant audit row.
  const current = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    columns: { status: true },
  });
  if (
    !current ||
    current.status === "detected" ||
    current.status === "uploaded"
  ) {
    await updateIngestionStatus(documentId, entityId, "detected");
  }
}

// ---------------------------------------------------------------------------
// Stage 2: PROCESSING — Format detection + file download
// ---------------------------------------------------------------------------

async function stageProcessing(
  documentId: string,
  entityId: string,
  storagePath: string,
  mimeType: string,
): Promise<{ fileBuffer: Uint8Array }> {
  logger.info("[Stage 2] PROCESSING — Format detection and parsing", {
    documentId,
    mimeType,
  });

  await updateIngestionStatus(documentId, entityId, "processing", {
    mimeType,
  });

  // 30s timeout on the R2 download
  const fileBuffer = await withTimeout(downloadFromR2(storagePath), 30_000);
  if (!fileBuffer) {
    throw new Error("Failed to read file from R2");
  }

  // §20.3 defense in depth: the presigned URL trusted the client's declared
  // MIME; here we sniff the ACTUAL bytes. A file that claims application/pdf
  // but is actually HTML/SVG/executable is rejected before it ever reaches
  // the LLM pipeline.
  try {
    assertMimeMatches(new Uint8Array(fileBuffer), mimeType);
  } catch (error) {
    logger.error("File content MIME mismatch — rejecting upload", {
      documentId,
      mimeType,
      reason: error instanceof Error ? error.message : String(error),
    });
    await updateIngestionStatus(documentId, entityId, "failed", {
      error: error instanceof Error ? error.message : "MIME mismatch",
    });
    throw error;
  }

  logger.info("File downloaded from R2", {
    documentId,
    size: fileBuffer.length,
  });

  // Record the real downloaded size (the presigned-upload declared size may
  // be client-supplied; the actual byte count is ground truth).
  await db
    .update(documents)
    .set({ sizeBytes: fileBuffer.length })
    .where(eq(documents.id, documentId));

  return { fileBuffer };
}

// ---------------------------------------------------------------------------
// Stage 3: EXTRACTED — OCR text extraction + confidence scoring
// ---------------------------------------------------------------------------

async function stageExtracted(
  documentId: string,
  entityId: string,
  fileBuffer: Uint8Array,
  mimeType: string,
): Promise<{
  ocrResult: Awaited<ReturnType<typeof extractText>>;
}> {
  logger.info("[Stage 3] EXTRACTED — OCR and field population", {
    documentId,
  });

  const ocrResult = await extractText(fileBuffer, mimeType, entityId);

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
    })
    .where(eq(documents.id, documentId));

  await updateIngestionStatus(documentId, entityId, "extracted", {
    method: ocrResult.method,
    confidence: ocrResult.confidence,
    textLength: ocrResult.text.length,
  });

  return { ocrResult };
}

// ---------------------------------------------------------------------------
// Stage 4: SYNCED — Classification + structured extraction + validation
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
  logger.info("[Stage 4] SYNCED — Classification and structured extraction", {
    documentId,
  });

  const classification = await classifyDocument(ocrText, mimeType, entityId);

  logger.info("Classification completed", {
    documentId,
    category: classification.category,
    confidence: classification.confidence,
  });

  await db
    .update(documents)
    .set({
      type: classification.category,
    })
    .where(eq(documents.id, documentId));

  await updateIngestionStatus(documentId, entityId, "synced", {
    category: classification.category,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
  });

  const extraction = await extractStructuredData(
    ocrText,
    classification.category,
    entityId,
    classification.metadata,
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
    })
    .where(eq(documents.id, documentId));

  return { classification, extraction };
}

// ---------------------------------------------------------------------------
// Stage 5: VALIDATED — TrustGuard cross-validation (deterministic math checks)
// ---------------------------------------------------------------------------

/**
 * Build an IngestionState from the pipeline's extracted data so we can
 * run TrustGuard cross-validation. This is the deterministic safety net
 * that verifies the LLM's extracted figures before any GL write.
 */
async function stageValidated(
  documentId: string,
  entityId: string,
  classification: Awaited<ReturnType<typeof classifyDocument>>,
  extraction: Awaited<ReturnType<typeof extractStructuredData>>,
): Promise<{
  trustGuardResult: ReturnType<typeof runTrustGuard>;
}> {
  logger.info("[Stage 5] VALIDATED — TrustGuard cross-validation", {
    documentId,
    category: classification.category,
  });

  // Build IngestionState from pipeline data
  const state: IngestionState = {
    documentId,
    entityId,
    mimeType: "", // Not needed for TrustGuard
    ocrText: "", // Not needed for TrustGuard
    ocrConfidence: 0, // Not needed for TrustGuard
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
  };

  // Run TrustGuard — 100% deterministic, zero LLM calls
  const trustGuardResult = runTrustGuard(state);

  logger.info("TrustGuard completed", {
    documentId,
    passed: trustGuardResult.passed,
    passedCount: trustGuardResult.passedCount,
    totalCount: trustGuardResult.totalCount,
    confidenceImpact: trustGuardResult.confidenceImpact,
    failedChecks: trustGuardResult.checks
      .filter((c) => !c.passed)
      .map((c) => c.name),
  });

  // Store TrustGuard results in document metadata
  const existingMetadata = await getExistingMetadata(documentId);
  const failedChecks = trustGuardResult.checks
    .filter((c) => !c.passed)
    .map((c) => ({
      name: c.name,
      description: c.description,
      severity: c.severity,
      expected: c.expected,
      actual: c.actual,
      difference: c.difference,
      message: c.message,
    }));

  // Transition to validated (TrustGuard passed) or agent_processing (failed)
  const nextStage: PipelineStage = trustGuardResult.passed
    ? "validated"
    : "agent_processing";

  await db
    .update(documents)
    .set({
      status: nextStage,
      metadata: {
        ...existingMetadata,
        trustGuard: {
          passed: trustGuardResult.passed,
          checks: trustGuardResult.checks.length,
          passedCount: trustGuardResult.passedCount,
          confidenceImpact: trustGuardResult.confidenceImpact,
          summary: trustGuardResult.summary,
          failedChecks,
          validatedAt: new Date().toISOString(),
        },
      },
    })
    .where(eq(documents.id, documentId));

  // Audit log for TrustGuard
  await updateIngestionStatus(documentId, entityId, nextStage, {
    pipelineStage: "validated",
    passed: trustGuardResult.passed,
    passedCount: trustGuardResult.passedCount,
    totalCount: trustGuardResult.totalCount,
    confidenceImpact: trustGuardResult.confidenceImpact,
    failedCheckNames: failedChecks.map((c) => c.name),
    summary: trustGuardResult.summary,
  });

  return { trustGuardResult };
}

// ---------------------------------------------------------------------------
// Stage 6: AGENT_PROCESSING — Hand off to downstream agent jobs
// ---------------------------------------------------------------------------

async function stageAgentProcessing(
  documentId: string,
  entityId: string,
  classification: Awaited<ReturnType<typeof classifyDocument>>,
  storagePath: string,
  mimeType: string,
): Promise<void> {
  logger.info("[Stage 6] AGENT_PROCESSING — Hand off to agent pipeline", {
    documentId,
    category: classification.category,
  });

  await updateTerminalStatus(documentId, entityId, "agent_processing", {
    category: classification.category,
    triggeredAt: new Date().toISOString(),
  });

  // Trigger downstream jobs based on document type
  if (classification.category === "bank_statement") {
    logger.info("Bank statement detected, triggering bank import", {
      documentId,
    });
    await triggerClient.tasks.trigger(
      "import-bank-statement",
      {
        documentId,
        entityId,
        storagePath,
        mimeType,
      },
      // Per-tenant queue + dedup on the downstream jobs too.
      {
        concurrencyKey: entityId,
        idempotencyKey: `import-bank-statement:${documentId}`,
      },
    );
  }

  if (
    classification.category === "invoice" ||
    classification.category === "receipt"
  ) {
    logger.info("Triggering auto-link for document", {
      documentId,
      category: classification.category,
    });
    await triggerClient.tasks.trigger(
      "auto-link-document",
      {
        documentId,
        entityId,
      },
      {
        concurrencyKey: entityId,
        idempotencyKey: `auto-link-document:${documentId}`,
      },
    );
  }

  // Always trigger the autonomous accounting ingestion pipeline
  // This runs after the document is fully processed and classified.
  // It will determine the accounting treatment, map to COA, generate
  // journal entries, score confidence, and auto-post or request review.
  logger.info("Triggering autonomous accounting ingestion", {
    documentId,
    category: classification.category,
  });
  await triggerClient.tasks.trigger(
    "run-document-ingestion",
    {
      documentId,
      entityId,
    },
    {
      concurrencyKey: entityId,
      idempotencyKey: `run-document-ingestion:${documentId}`,
    },
  );
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

  // DLQ: after retries are exhausted, surface the poison task to the ops
  // review queue instead of silently dropping the document.
  onFailure: dlqOnFailure<{
    documentId: string;
    entityId: string;
    storagePath: string;
    mimeType: string;
  }>({
    task: "process-document",
    type: "data_validation",
    severity: "high",
    title: (p) => `Document processing failed: ${p.documentId}`,
    entityIdFrom: (p) => p.entityId,
  }),

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

    // Stage 1: DETECTED — Document already exists in DB with status='detected'
    // (Handled by the upload/create endpoint when the document row was created)
    await stageDetected(documentId, entityId);

    try {
      // Stage 2: PROCESSING — Format detection, file download, parser routing
      const { fileBuffer } = await stageProcessing(
        documentId,
        entityId,
        storagePath,
        mimeType,
      );

      // Stage 3: EXTRACTED — OCR text extraction, per-field confidence scoring
      const { ocrResult } = await stageExtracted(
        documentId,
        entityId,
        fileBuffer,
        mimeType,
      );

      // Stage 4: SYNCED — Classification, structured extraction
      const { classification, extraction } = await stageSynced(
        documentId,
        entityId,
        ocrResult.text,
        mimeType,
      );

      // Stage 5: VALIDATED — TrustGuard cross-validation (deterministic math checks)
      const { trustGuardResult } = await stageValidated(
        documentId,
        entityId,
        classification,
        extraction,
      );

      // Stage 6: AGENT_PROCESSING — Hand off to downstream agent jobs
      // TrustGuard results are stored in document metadata and available
      // to the posting engine which makes the final auto-post decision.
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
        trustGuardPassed: trustGuardResult.passed,
        stagesCompleted: 6,
      });

      return {
        success: true,
        documentId,
        pipelineStages: 6,
        category: classification.category,
        extractionType: extraction.type,
        ocrMethod: ocrResult.method,
        ocrConfidence: ocrResult.confidence,
        classificationConfidence: classification.confidence,
        extractionConfidence: extraction.confidence,
        trustGuardPassed: trustGuardResult.passed,
        trustGuardConfidenceImpact: trustGuardResult.confidenceImpact,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("Document pipeline failed", {
        documentId,
        error: errorMessage,
      });

      await transitionToFailed(documentId, entityId, errorMessage);

      throw error;
    }
  },
});
