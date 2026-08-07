import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  documents,
  documentLinks,
  auditLog,
  currencies,
  exchangeRates,
  organizations,
  userEntityAccess,
  docTypeEnum,
} from "@xenboox/db/schema";
import { triggerClient } from "@/lib/trigger";
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateStoragePath,
  ALLOWED_MIME_TYPES,
  FILE_SIZE_LIMITS,
} from "@/lib/r2";
import {
  sendDocumentUploadedEmail,
  sendDocumentProcessedEmail,
} from "@/lib/email";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getEntityPlan(entityId: string): Promise<string> {
  const access = await db.query.userEntityAccess.findFirst({
    where: eq(userEntityAccess.entityId, entityId),
  });
  if (!access) return "free";
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, access.entityId),
  });
  return (org?.plan as string) ?? "free";
}

// ─── Document Router ─────────────────────────────────────────────────────────

export const documentRouter = router({
  // ── Documents ──
  listDocuments: rlsProtectedProcedure
    .input(
      z.object({
        category: z.enum(docTypeEnum.enumValues).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.category
        ? and(
            eq(documents.entityId, ctx.entityId!),
            eq(documents.type, input.category),
          )
        : eq(documents.entityId, ctx.entityId!);

      return db.query.documents.findMany({
        where: whereClause,
        orderBy: [desc(documents.createdAt)],
      });
    }),

  getStatus: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.entityId, ctx.entityId!),
        ),
      });
      if (!doc)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      return {
        id: doc.id,
        status: doc.status,
        type: doc.type,
        ocrText: doc.ocrText,
        ocrConfidence: doc.ocrConfidence,
        metadata: doc.metadata,
      };
    }),

  // ── Upload Flow ──

  getUploadUrl: rlsProtectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileSize: z
          .number()
          .int()
          .min(1)
          .max(100 * 1024 * 1024),
        mimeType: z.enum(ALLOWED_MIME_TYPES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Plan-based file size limits
      const plan = await getEntityPlan(ctx.entityId!);
      const maxSize = FILE_SIZE_LIMITS[plan] ?? FILE_SIZE_LIMITS.free;
      if (input.fileSize > maxSize) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit for your plan. Upgrade to upload larger files.`,
        });
      }

      const storagePath = generateStoragePath(ctx.entityId!, input.fileName);

      const uploadUrl = await getPresignedUploadUrl(
        storagePath,
        input.mimeType,
        input.fileSize,
      );

      return { uploadUrl, storagePath };
    }),

  confirmUpload: rlsProtectedProcedure
    .input(
      z.object({
        r2Key: z.string().min(1),
        r2Bucket: z.string().min(1),
        name: z.string().min(1),
        type: z.enum([
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
        ]),
        mimeType: z.string().optional(),
        fileSize: z.number().int().min(0).optional(),
        checksum: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [doc] = await db
          .insert(documents)
          .values({
            entityId: ctx.entityId!,
            uploadedBy: ctx.session!.user!.id!,
            status: "detected",
            name: input.name,
            type: input.type,
            r2Key: input.r2Key,
            r2Bucket: input.r2Bucket,
            mimeType: input.mimeType,
            sizeBytes: input.fileSize,
            metadata: input.checksum ? { checksum: input.checksum } : {},
          })
          .returning();

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "document.upload",
          entityType: "document",
          entityIdRef: doc.id,
          newValues: {
            name: input.name,
            type: input.type,
            mimeType: input.mimeType,
          },
        });

        // Trigger AI processing pipeline
        if (input.mimeType) {
          await triggerClient.tasks.trigger("process-document", {
            documentId: doc.id,
            entityId: ctx.entityId!,
            storagePath: input.r2Key,
            mimeType: input.mimeType,
          });
        }

        return { documentId: doc.id };
      } catch (error) {
        handleMutationError(error, "Failed to confirm document upload");
      }
    }),

  download: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const doc = await db.query.documents.findFirst({
          where: and(
            eq(documents.id, input.id),
            eq(documents.entityId, ctx.entityId!),
          ),
        });

        if (!doc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        if (!doc.r2Key) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Document has no storage key",
          });
        }

        const downloadUrl = await getPresignedDownloadUrl(doc.r2Key);

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "document.download",
          entityType: "document",
          entityIdRef: input.id,
        });

        return { downloadUrl, mimeType: doc.mimeType };
      } catch (error) {
        handleMutationError(error, "Failed to generate download URL");
      }
    }),

  delete: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const doc = await db.query.documents.findFirst({
          where: and(
            eq(documents.id, input.id),
            eq(documents.entityId, ctx.entityId!),
          ),
        });

        if (!doc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        await db.delete(documents).where(eq(documents.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "document.delete",
          entityType: "document",
          entityIdRef: input.id,
          newValues: { name: doc.name, type: doc.type },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete document");
      }
    }),

  createDocument: rlsProtectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum([
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
        ]),
        mimeType: z.string().optional(),
        sizeBytes: z.number().int().min(0).optional(),
        r2Key: z.string().min(1),
        r2Bucket: z.string().min(1),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [doc] = await db
        .insert(documents)
        .values({
          ...input,
          entityId: ctx.entityId!,
          uploadedBy: ctx.session!.user!.id!,
        })
        .returning();

      // Trigger document processing job
      if (input.mimeType) {
        await triggerClient.tasks.trigger("process-document", {
          documentId: doc.id,
          entityId: ctx.entityId!,
          storagePath: input.r2Key,
          mimeType: input.mimeType,
        });
      }

      return doc;
    }),

  updateDocument: rlsProtectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.entityId, ctx.entityId!),
        ),
      });
      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      const { id, ...data } = input;
      const [updated] = await db
        .update(documents)
        .set(data)
        .where(and(eq(documents.id, id), eq(documents.entityId, ctx.entityId!)))
        .returning();
      return updated;
    }),

  getDocumentById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.entityId, ctx.entityId!),
        ),
      });
      if (!doc) return null;

      const links = await db.query.documentLinks.findMany({
        where: and(
          eq(documentLinks.documentId, doc.id),
          eq(documentLinks.entityId, ctx.entityId!),
        ),
      });

      return { ...doc, links };
    }),

  // ── Document Links ──
  createDocumentLink: rlsProtectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        entityType: z.string().min(1),
        entityId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify document belongs to current entity
      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.documentId),
          eq(documents.entityId, ctx.entityId!),
        ),
      });
      if (!doc)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      const [link] = await db
        .insert(documentLinks)
        .values({ ...input, entityId: ctx.entityId! })
        .returning();
      return link;
    }),

  removeDocumentLink: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .delete(documentLinks)
        .where(
          and(
            eq(documentLinks.id, input.id),
            eq(documentLinks.entityId, ctx.entityId!),
          ),
        )
        .returning();
      return deleted;
    }),

  // ── Audit Log ──
  listAuditLog: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.auditLog.findMany({
      where: eq(auditLog.entityId, ctx.entityId!),
      orderBy: [desc(auditLog.createdAt)],
      limit: 100,
    });
  }),

  // ── Currencies (global reference — no entity scoping) ──
  listCurrencies: rlsProtectedProcedure.query(() => {
    return db.query.currencies.findMany();
  }),

  // ── Exchange Rates (global reference — no entity scoping) ──
  listExchangeRates: rlsProtectedProcedure.query(() => {
    return db.query.exchangeRates.findMany({
      orderBy: [desc(exchangeRates.createdAt)],
    });
  }),

  createExchangeRate: rlsProtectedProcedure
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
        rate: z.string(),
        source: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const [rate] = await db.insert(exchangeRates).values(input).returning();
      return rate;
    }),

  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const docs = await db.query.documents.findMany({
      where: eq(documents.entityId, entityId),
    });

    const totalDocuments = docs.length;
    const pendingReview = docs.filter((d) => d.status === "processed").length;
    const totalSize = docs.reduce((sum, d) => sum + (d.sizeBytes ?? 0), 0);

    return {
      summary: {
        totalDocuments,
        totalDocumentsChange: 0,
        storageUsed: totalSize,
        storageLimit: 1073741824,
        recentUploads: docs.filter((d) => {
          const day = new Date(d.createdAt ?? Date.now());
          const now = new Date();
          return day.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000;
        }).length,
        pendingReview,
      },
      documents: docs,
    };
  }),

  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const docs = await db.query.documents.findMany({
      where: eq(documents.entityId, entityId),
      limit: 10,
    });

    return docs.map((doc) => ({
      id: doc.id,
      type: "info" as const,
      title: doc.name,
      description: `Document uploaded on ${new Date(doc.createdAt ?? Date.now()).toLocaleDateString()}`,
      actionLabel: "View",
    }));
  }),
});
