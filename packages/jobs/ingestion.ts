/**
 * Autonomous Accounting Ingestion Job
 *
 * Triggered after a document has been processed (OCR + classification + extraction).
 * Runs the full ingestion pipeline: workflow classification → accounting treatment →
 * COA mapping → journal generation → confidence scoring → auto-posting or review.
 *
 * This is Stage 6 of the document pipeline (after Stage 5's agent_processing).
 */

import { task, logger } from "@trigger.dev/sdk";
import { db } from "@xenboox/db";
import { documents, auditLog } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";
import { processIngestion } from "@xenboox/ingestion";

export const runDocumentIngestion = task({
  id: "run-document-ingestion",
  maxDuration: 300, // 5 minutes max
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 120_000,
  },
  queue: {
    concurrencyLimit: 5,
  },

  run: async (payload: { documentId: string; entityId: string }) => {
    const { documentId, entityId } = payload;

    logger.info("[Ingestion] Starting autonomous accounting ingestion", {
      documentId,
      entityId,
    });

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc) {
      logger.error("[Ingestion] Document not found", { documentId });
      return { success: false, error: "Document not found" };
    }

    // Only process documents that have been synced (OCR + classification + extraction done)
    // or are in early ingestion stages (for pipeline recovery/retry)
    const READY_STATUSES = new Set([
      "synced",
      "agent_processing",
      "resolving",
      "classifying_workflow",
      "mapping_accounts",
      "calculating_tax",
      "generating_journal",
      "validating_entry",
      "deciding_post",
    ]);
    if (!READY_STATUSES.has(doc.status)) {
      logger.info("[Ingestion] Document not ready for ingestion", {
        documentId,
        status: doc.status,
      });
      return { success: false, reason: "not_ready", status: doc.status };
    }

    try {
      // Run the full autonomous ingestion pipeline
      const result = await processIngestion(documentId, entityId);

      logger.info("[Ingestion] Pipeline completed", {
        documentId,
        workflow: result.workflow,
        confidence: result.confidence.overall,
        action: result.postingDecision.action,
        posted: result.postingResult?.posted ?? false,
        journalEntryId: result.postingResult?.journalEntryId,
        durationMs: result.pipelineDurationMs,
      });

      // Document status is now managed by the ingestion pipeline itself.
      // - auto_post → status = "done"
      // - pending_review → status = "agent_processing" (with review metadata)
      // - rejected → status = "failed"

      return {
        success: result.success,
        workflow: result.workflow,
        confidence: result.confidence.overall,
        action: result.postingDecision.action,
        posted: result.postingResult?.posted,
        journalEntryId: result.postingResult?.journalEntryId,
        entryNumber: result.postingResult?.entryNumber,
        durationMs: result.pipelineDurationMs,
        error: result.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("[Ingestion] Pipeline failed", {
        documentId,
        error: errorMessage,
      });

      // Update document status to failed
      await db
        .update(documents)
        .set({
          status: "failed",
          metadata: {
            error: errorMessage,
            failedAt: new Date().toISOString(),
            pipelineStage: "ingestion",
          },
        } as any)
        .where(eq(documents.id, documentId));

      return { success: false, error: errorMessage };
    }
  },
});
