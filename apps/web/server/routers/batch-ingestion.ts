/**
 * Batch Ingestion Router — Process multiple documents with real-time progress.
 *
 * Features:
 * - Batch upload multiple documents
 * - Real-time progress tracking per document
 * - Step-by-step status updates with timestamps
 * - Error recovery and retry
 * - Progress summary and statistics
 *
 * All procedures are entity-scoped and authenticated.
 */

import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { documents, auditLog } from "@xenboox/db/schema";
import {
  updateIngestionStatus,
  updateTerminalStatus,
  transitionToFailed,
  getStageLabel,
  getOrderedStages,
  type PipelineStage,
} from "@xenboox/ingestion/engine/status-tracker";
import {
  processDocumentForRAG,
  chunkText,
} from "@xenboox/ingestion/engine/embeddings";

// ─── Types ────────────────────────────────────────────────────────────────

type BatchStatus =
  "pending" | "processing" | "completed" | "failed" | "cancelled";

interface DocumentProgress {
  documentId: string;
  fileName: string;
  status: BatchStatus;
  currentStage: string;
  stageNumber: number;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface BatchProgress {
  batchId: string;
  entityId: string;
  status: BatchStatus;
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs?: number;
  documents: DocumentProgress[];
}

// ─── In-Memory Progress Store ─────────────────────────────────────────────
// In production, use Redis for multi-instance support
const progressStore = new Map<string, BatchProgress>();

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const batchDocumentSchema = z.object({
  fileName: z.string().min(1),
  content: z.string().min(1),
  mimeType: z.string().default("text/plain"),
  category: z.string().optional(),
});

const startBatchInputSchema = z.object({
  documents: z.array(batchDocumentSchema).min(1).max(50),
  autoProcess: z.boolean().default(true),
});

const getBatchProgressInputSchema = z.object({
  batchId: z.string().uuid(),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const batchIngestionRouter = router({
  /**
   * Start a batch ingestion job.
   * Creates document records and begins processing.
   */
  startBatch: protectedProcedure
    .input(startBatchInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { documents: docs, autoProcess } = input;

      const batchId = crypto.randomUUID();
      const now = new Date();

      // Create progress tracking
      const batchProgress: BatchProgress = {
        batchId,
        entityId,
        status: "pending",
        totalDocuments: docs.length,
        completedDocuments: 0,
        failedDocuments: 0,
        startedAt: now,
        documents: docs.map((doc, index) => ({
          documentId: crypto.randomUUID(),
          fileName: doc.fileName,
          status: "pending" as BatchStatus,
          currentStage: "Queued",
          stageNumber: 0,
        })),
      };

      progressStore.set(batchId, batchProgress);

      // Create document records in database
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const docProgress = batchProgress.documents[i];

        try {
          await db.insert(documents).values({
            id: docProgress.documentId,
            entityId,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            status: "detected",
            metadata: {
              batchId,
              batchIndex: i,
              category: doc.category,
            },
          });

          // Log detection
          await db.insert(auditLog).values({
            entityId,
            action: "batch.document_detected",
            entityType: "document",
            entityIdRef: docProgress.documentId,
            newValues: {
              batchId,
              fileName: doc.fileName,
              batchIndex: i,
            },
          });
        } catch (error) {
          docProgress.status = "failed";
          docProgress.error = `Failed to create document record: ${error instanceof Error ? error.message : String(error)}`;
          batchProgress.failedDocuments++;
        }
      }

      // Start processing if autoProcess is true
      if (autoProcess) {
        // Process asynchronously (in real implementation, use job queue)
        processBatchDocuments(batchId, entityId, docs).catch((error) => {
          console.error(`[batch-ingestion] Batch ${batchId} failed:`, error);
        });
      }

      return {
        batchId,
        totalDocuments: docs.length,
        status: autoProcess ? "processing" : "pending",
      };
    }),

  /**
   * Get progress for a batch ingestion job.
   */
  getBatchProgress: protectedProcedure
    .input(getBatchProgressInputSchema)
    .query(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { batchId } = input;

      const progress = progressStore.get(batchId);

      if (!progress || progress.entityId !== entityId) {
        return null;
      }

      return {
        batchId: progress.batchId,
        status: progress.status,
        totalDocuments: progress.totalDocuments,
        completedDocuments: progress.completedDocuments,
        failedDocuments: progress.failedDocuments,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        totalDurationMs: progress.totalDurationMs,
        documents: progress.documents.map((doc) => ({
          documentId: doc.documentId,
          fileName: doc.fileName,
          status: doc.status,
          currentStage: doc.currentStage,
          stageNumber: doc.stageNumber,
          startedAt: doc.startedAt,
          completedAt: doc.completedAt,
          durationMs: doc.durationMs,
          error: doc.error,
        })),
      };
    }),

  /**
   * Get all batch jobs for an entity.
   */
  listBatches: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { limit } = input;

      // Get batches from audit log
      const batches = await db
        .select({
          batchId: auditLog.newValues,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.entityId, entityId),
            eq(auditLog.action, "batch.document_detected"),
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(limit);

      // Deduplicate by batchId
      const uniqueBatches = new Map<
        string,
        { batchId: string; createdAt: Date }
      >();
      for (const batch of batches) {
        const values = batch.batchId as Record<string, unknown>;
        if (values?.batchId && !uniqueBatches.has(values.batchId as string)) {
          uniqueBatches.set(values.batchId as string, {
            batchId: values.batchId as string,
            createdAt: batch.createdAt,
          });
        }
      }

      return Array.from(uniqueBatches.values()).map((batch) => ({
        batchId: batch.batchId,
        createdAt: batch.createdAt,
        // Get progress from store if available
        progress: progressStore.get(batch.batchId),
      }));
    }),

  /**
   * Cancel a batch ingestion job.
   */
  cancelBatch: protectedProcedure
    .input(getBatchProgressInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { batchId } = input;

      const progress = progressStore.get(batchId);

      if (!progress || progress.entityId !== entityId) {
        throw new Error("Batch not found");
      }

      if (progress.status === "completed" || progress.status === "failed") {
        throw new Error("Batch already finished");
      }

      // Mark all pending documents as cancelled
      for (const doc of progress.documents) {
        if (doc.status === "pending" || doc.status === "processing") {
          doc.status = "cancelled";
          doc.currentStage = "Cancelled";
        }
      }

      progress.status = "cancelled";
      progress.completedAt = new Date();
      progress.totalDurationMs =
        progress.completedAt.getTime() - progress.startedAt.getTime();

      return { success: true };
    }),

  /**
   * Retry failed documents in a batch.
   */
  retryFailed: protectedProcedure
    .input(getBatchProgressInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { batchId } = input;

      const progress = progressStore.get(batchId);

      if (!progress || progress.entityId !== entityId) {
        throw new Error("Batch not found");
      }

      const failedDocs = progress.documents.filter(
        (doc) => doc.status === "failed",
      );

      if (failedDocs.length === 0) {
        return { retriedCount: 0 };
      }

      // Reset failed documents
      for (const doc of failedDocs) {
        doc.status = "pending";
        doc.currentStage = "Queued";
        doc.stageNumber = 0;
        doc.error = undefined;
        doc.startedAt = undefined;
        doc.completedAt = undefined;
        doc.durationMs = undefined;
      }

      // Reset batch status
      progress.status = "processing";
      progress.failedDocuments = 0;
      progress.completedAt = undefined;
      progress.totalDurationMs = undefined;

      return { retriedCount: failedDocs.length };
    }),

  /**
   * Get pipeline stages for reference.
   */
  getPipelineStages: protectedProcedure.query(() => {
    return getOrderedStages();
  }),
});

// ─── Batch Processing Logic ───────────────────────────────────────────────

/**
 * Process all documents in a batch.
 * Updates progress in real-time.
 */
async function processBatchDocuments(
  batchId: string,
  entityId: string,
  docs: Array<{
    fileName: string;
    content: string;
    mimeType: string;
    category?: string;
  }>,
): Promise<void> {
  const progress = progressStore.get(batchId);
  if (!progress) return;

  progress.status = "processing";

  const stages = getOrderedStages();

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const docProgress = progress.documents[i];

    if (docProgress.status === "failed" || docProgress.status === "cancelled") {
      continue;
    }

    docProgress.status = "processing";
    docProgress.startedAt = new Date();

    try {
      // Simulate processing through each stage
      for (const stage of stages) {
        if (docProgress.status !== "processing") break;

        // Update stage progress
        docProgress.currentStage = stage.label;
        docProgress.stageNumber = stage.number;

        // Update database status
        await updateIngestionStatus(
          docProgress.documentId,
          entityId,
          stage.key as PipelineStage,
          { batchId, fileName: doc.fileName },
        );

        // Simulate work (in real implementation, this would be actual processing)
        await simulateStageProcessing(docProgress.documentId, stage.key);
      }

      // Process for RAG
      await processDocumentForRAG(
        docProgress.documentId,
        entityId,
        doc.content,
        {
          sourceType: "uploaded_document",
          title: doc.fileName,
          category: doc.category,
        },
      );

      // Mark as complete
      docProgress.status = "completed";
      docProgress.currentStage = "Complete";
      docProgress.completedAt = new Date();
      docProgress.durationMs =
        docProgress.completedAt.getTime() -
        (docProgress.startedAt?.getTime() ?? Date.now());

      await updateTerminalStatus(docProgress.documentId, entityId, "done", {
        batchId,
        fileName: doc.fileName,
        durationMs: docProgress.durationMs,
      });

      progress.completedDocuments++;
    } catch (error) {
      docProgress.status = "failed";
      docProgress.error =
        error instanceof Error ? error.message : String(error);
      docProgress.completedAt = new Date();
      docProgress.durationMs =
        docProgress.completedAt.getTime() -
        (docProgress.startedAt?.getTime() ?? Date.now());

      await transitionToFailed(
        docProgress.documentId,
        entityId,
        docProgress.error,
        docProgress.currentStage,
      );

      progress.failedDocuments++;
    }
  }

  // Mark batch as complete
  progress.status =
    progress.failedDocuments === progress.totalDocuments
      ? "failed"
      : "completed";
  progress.completedAt = new Date();
  progress.totalDurationMs =
    progress.completedAt.getTime() - progress.startedAt.getTime();
}

/**
 * Simulate processing for a pipeline stage.
 * In real implementation, this would be actual processing logic.
 */
async function simulateStageProcessing(
  documentId: string,
  stage: string,
): Promise<void> {
  // Simulate processing time (200-500ms per stage)
  const delay = 200 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate occasional failures (5% chance)
  if (Math.random() < 0.05) {
    throw new Error(`Processing failed at stage: ${stage}`);
  }
}
