/**
 * Batch Ingestion Router — Process multiple documents with real-time progress.
 *
 * Two-phase flow (mirrors the single-document upload path in document.ts):
 *   1. `startBatch` — validate files, create pending document rows, presign
 *      one R2 upload URL per file, and return them to the client.
 *   2. Client PUTs each file's bytes directly to R2.
 *   3. `confirmBatch` — verify each object landed (head + size), then trigger
 *      the real `process-document` pipeline per file. Progress is read from
 *      the documents table (status-tracker), never from an in-memory fake.
 *
 * All procedures are entity-scoped and authenticated.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { documents, auditLog } from "@xenboox/db/schema";
import { logger } from "@/lib/logger";
import {
  getObjectHead,
  generateStoragePath,
  getPresignedUploadUrl,
} from "@/lib/r2";
import {
  sanitizeFileName,
  extensionMatchesMime,
} from "@/lib/security/file-validation";
import { tenantJobOptions, triggerClient } from "@/lib/trigger";
import { getOrderedStages } from "@xenboox/ingestion/engine/status-tracker";
import { mapDocStatus, stageLabel } from "./batch-ingestion-helpers";

// ─── Types ────────────────────────────────────────────────────────────────

type BatchStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

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
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const batchDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(100 * 1024 * 1024),
  mimeType: z.string().min(1).max(200),
  category: z
    .enum([
      "invoice",
      "receipt",
      "contract",
      "voucher",
      "bank_statement",
      "tax_return",
      "payroll_report",
      "journal_entry",
      "po",
      "supporting",
    ])
    .optional(),
});

const startBatchInputSchema = z.object({
  documents: z.array(batchDocumentSchema).min(1).max(50),
});

const confirmBatchInputSchema = z.object({
  batchId: z.string().uuid(),
  uploads: z
    .array(
      z.object({
        documentId: z.string().uuid(),
        storagePath: z.string().min(1),
        fileSize: z.number().int().min(1),
      }),
    )
    .min(1)
    .max(50),
});

const getBatchProgressInputSchema = z.object({
  batchId: z.string().uuid(),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const batchIngestionRouter = router({
  /**
   * Phase 1: validate files, create pending document rows, and presign R2
   * upload URLs. The client PUTs each file, then calls confirmBatch.
   */
  startBatch: protectedProcedure
    .input(startBatchInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const batchId = crypto.randomUUID();
      const now = new Date();

      const uploads: Array<{
        documentId: string;
        storagePath: string;
        uploadUrl: string;
        fileName: string;
      }> = [];

      for (let i = 0; i < input.documents.length; i++) {
        const doc = input.documents[i];
        const documentId = crypto.randomUUID();

        // Sanitize the file name and cross-check extension ↔ MIME — same
        // guards the single-upload path applies (reject traversal/dotfiles
        // and extension/MIME mismatches before anything touches storage).
        let safeName: string;
        try {
          safeName = sanitizeFileName(doc.fileName);
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid file name: ${doc.fileName}`,
          });
        }
        if (!extensionMatchesMime(safeName, doc.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File type not allowed — extension and content type must match: ${safeName}`,
          });
        }

        const storagePath = generateStoragePath(entityId!, safeName);

        // Create the document row up-front (status "detected") so the batch
        // is visible and cancellable even before bytes land. r2Key/r2Bucket
        // are required columns — set them now; confirmBatch verifies size.
        await db.insert(documents).values({
          id: documentId,
          entityId,
          name: safeName,
          type: doc.category ?? "supporting",
          status: "detected",
          mimeType: doc.mimeType,
          sizeBytes: doc.fileSize,
          r2Key: storagePath,
          r2Bucket: "xenboox-documents",
          metadata: { batchId, batchIndex: i },
        });

        await db.insert(auditLog).values({
          entityId,
          action: "batch.document_detected",
          entityType: "document",
          entityIdRef: documentId,
          newValues: { batchId, fileName: safeName, batchIndex: i },
        });

        // Presign the upload URL bound to this storage path + size + mime.
        const uploadUrl = await getPresignedUploadUrl(
          storagePath,
          doc.mimeType,
          doc.fileSize,
        );

        uploads.push({
          documentId,
          storagePath,
          uploadUrl,
          fileName: safeName,
        });
      }

      logger.info(
        `Batch ${batchId} prepared — ${uploads.length} uploads (entity ${entityId})`,
      );

      return { batchId, startedAt: now.toISOString(), uploads };
    }),

  /**
   * Phase 2: verify every object landed in R2 with the declared size, then
   * trigger the real process-document pipeline per file. Progress is derived
   * from the documents table afterwards — no simulation.
   */
  confirmBatch: protectedProcedure
    .input(confirmBatchInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;

      // Verify the batch rows belong to this entity before touching anything.
      const batchDocs = await db.query.documents.findMany({
        where: and(
          eq(documents.entityId, entityId!),
          sql`${documents.metadata}->>'batchId' = ${input.batchId}`,
        ),
      });
      if (batchDocs.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Batch not found",
        });
      }

      const byId = new Map(batchDocs.map((d) => [d.id, d]));
      const triggered: string[] = [];
      const failures: Array<{ documentId: string; error: string }> = [];

      for (const upload of input.uploads) {
        const docRow = byId.get(upload.documentId);
        if (!docRow) {
          failures.push({
            documentId: upload.documentId,
            error: "Document not found in this batch",
          });
          continue;
        }

        // Verify the object actually landed with the declared size — catches
        // aborted/partial uploads (same check as confirmUpload).
        const head = await getObjectHead(upload.storagePath);
        if (!head) {
          failures.push({
            documentId: upload.documentId,
            error: "Upload not found in storage — re-upload the file.",
          });
          continue;
        }
        if (head.size !== upload.fileSize) {
          failures.push({
            documentId: upload.documentId,
            error: "Upload size mismatch — the file did not upload completely.",
          });
          continue;
        }

        // Row already exists with r2Key set; mark it ready for the pipeline
        // and fire the real document-processing task.
        await db
          .update(documents)
          .set({ sizeBytes: upload.fileSize })
          .where(eq(documents.id, upload.documentId));

        await triggerClient.tasks.trigger(
          "process-document",
          {
            documentId: upload.documentId,
            entityId: entityId!,
            storagePath: upload.storagePath,
            mimeType: docRow.mimeType ?? "application/octet-stream",
          },
          tenantJobOptions(entityId!, `process-document:${upload.documentId}`),
        );

        triggered.push(upload.documentId);
      }

      return {
        batchId: input.batchId,
        triggeredCount: triggered.length,
        failedCount: failures.length,
        failures,
      };
    }),

  /**
   * Get progress for a batch — read from the documents table (real statuses
   * written by the status-tracker), never from an in-memory store.
   */
  getBatchProgress: protectedProcedure
    .input(getBatchProgressInputSchema)
    .query(async ({ ctx, input }): Promise<BatchProgress | null> => {
      const { entityId } = ctx;
      const docs = await db.query.documents.findMany({
        where: and(
          eq(documents.entityId, entityId!),
          sql`${documents.metadata}->>'batchId' = ${input.batchId}`,
        ),
        orderBy: [documents.createdAt],
      });

      if (docs.length === 0) return null;

      const startedAt = docs.reduce(
        (min, d) => (d.createdAt < min ? d.createdAt : min),
        docs[0]!.createdAt,
      );

      const progressDocs: DocumentProgress[] = docs.map((d) => ({
        documentId: d.id,
        fileName: d.name,
        status: mapDocStatus(d.status),
        currentStage: stageLabel(d.status),
        stageNumber: 0,
        startedAt: d.createdAt,
        completedAt: d.updatedAt,
        error: (
          (d.metadata as Record<string, unknown>)?.ingestion as Record<
            string,
            unknown
          >
        )?.error as string | undefined,
      }));

      const completed = progressDocs.filter(
        (d) => d.status === "completed",
      ).length;
      const failed = progressDocs.filter((d) => d.status === "failed").length;
      const cancelled = progressDocs.filter(
        (d) => d.status === "cancelled",
      ).length;

      const status: BatchStatus =
        failed + cancelled === docs.length
          ? "failed"
          : completed === docs.length
            ? "completed"
            : "processing";

      return {
        batchId: input.batchId,
        entityId: entityId!,
        status,
        totalDocuments: docs.length,
        completedDocuments: completed,
        failedDocuments: failed,
        startedAt,
        completedAt: status === "completed" ? new Date() : undefined,
        documents: progressDocs,
      };
    }),

  /**
   * Get all batch jobs for an entity — distinct batchIds from document rows.
   */
  listBatches: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const docs = await db.query.documents.findMany({
        where: and(
          eq(documents.entityId, entityId!),
          sql`${documents.metadata}->>'batchId' IS NOT NULL`,
        ),
        orderBy: [desc(documents.createdAt)],
        limit: input.limit * 20, // overscan, dedup below
      });

      const seen = new Set<string>();
      const batches: Array<{ batchId: string; createdAt: Date }> = [];
      for (const d of docs) {
        const batchId = (d.metadata as Record<string, unknown>)?.batchId as
          | string
          | undefined;
        if (batchId && !seen.has(batchId)) {
          seen.add(batchId);
          batches.push({ batchId, createdAt: d.createdAt });
        }
        if (batches.length >= input.limit) break;
      }

      return batches;
    }),

  /**
   * Cancel a batch — marks pending (non-terminal) documents cancelled.
   */
  cancelBatch: protectedProcedure
    .input(getBatchProgressInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;
      await db
        .update(documents)
        .set({ status: "archived" })
        .where(
          and(
            eq(documents.entityId, entityId!),
            sql`${documents.metadata}->>'batchId' = ${input.batchId}`,
            inArray(documents.status, ["detected", "processing"]),
          ),
        );
      return { success: true };
    }),

  /**
   * Get pipeline stages for reference.
   */
  getPipelineStages: protectedProcedure.query(() => {
    return getOrderedStages();
  }),
});
