import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import {
  documents,
  documentLinks,
  auditLog,
  currencies,
  exchangeRates,
} from "@xenboox/db/schema"
import { triggerClient } from "@/lib/trigger"
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateStoragePath,
  ALLOWED_MIME_TYPES,
} from "@/lib/r2"
import { sendDocumentUploadedEmail, sendDocumentProcessedEmail } from "@/lib/email"

// ─── Document Router ─────────────────────────────────────────────────────────

export const documentRouter = router({
  // ── Documents ──
  listDocuments: protectedProcedure.query(({ ctx }) => {
    return db.query.documents.findMany({
      where: eq(documents.entityId, ctx.entityId!),
      orderBy: [desc(documents.createdAt)],
    })
  }),

  // ── Upload Flow ──

  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileSize: z.number().int().min(1).max(100 * 1024 * 1024),
        mimeType: z.enum(ALLOWED_MIME_TYPES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const storagePath = generateStoragePath(ctx.entityId!, input.fileName)

      const uploadUrl = await getPresignedUploadUrl(
        storagePath,
        input.mimeType,
        input.fileSize,
      )

      return {
        uploadUrl,
        storagePath,
      }
    }),

  confirmUpload: protectedProcedure
    .input(
      z.object({
        r2Key: z.string().min(1),
        r2Bucket: z.string().min(1),
        name: z.string().min(1),
        type: z.enum([
          "invoice", "receipt", "contract", "voucher", "bank_statement",
          "tax_return", "payroll_report", "journal_entry", "po", "supporting",
        ]),
        mimeType: z.string().optional(),
        fileSize: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [doc] = await db
          .insert(documents)
          .values({
            entityId: ctx.entityId!,
            uploadedBy: ctx.session!.user!.id!,
            status: "uploaded",
            name: input.name,
            type: input.type,
            r2Key: input.r2Key,
            r2Bucket: input.r2Bucket,
            mimeType: input.mimeType,
            sizeBytes: input.fileSize,
          })
          .returning()

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "document.upload",
          entityType: "document",
          entityIdRef: doc.id,
          newValues: { name: input.name, type: input.type, mimeType: input.mimeType },
        })

        if (input.mimeType) {
          await triggerClient.tasks.trigger("process-document", {
            documentId: doc.id,
            entityId: ctx.entityId!,
            storagePath: input.r2Key,
            mimeType: input.mimeType,
          })
        }

        return { documentId: doc.id }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to confirm document upload" })
      }
    }),

  download: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const doc = await db.query.documents.findFirst({
          where: eq(documents.id, input.id),
        })

        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
        }

        if (doc.entityId !== ctx.entityId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied to this document" })
        }

        if (!doc.r2Key) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Document has no storage key" })
        }

        const downloadUrl = await getPresignedDownloadUrl(doc.r2Key)

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "document.download",
          entityType: "document",
          entityIdRef: input.id,
        })

        return { downloadUrl, mimeType: doc.mimeType }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate download URL" })
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const doc = await db.query.documents.findFirst({
          where: eq(documents.id, input.id),
        })

        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
        }

        if (doc.entityId !== ctx.entityId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied to this document" })
        }

        await db.delete(documents).where(eq(documents.id, input.id))

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "document.delete",
          entityType: "document",
          entityIdRef: input.id,
          newValues: { name: doc.name, type: doc.type },
        })

        return { success: true }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete document" })
      }
    }),

  createDocument: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum([
          "invoice", "receipt", "contract", "voucher", "bank_statement",
          "tax_return", "payroll_report", "journal_entry", "po", "supporting",
        ]),
        mimeType: z.string().optional(),
        sizeBytes: z.number().int().min(0).optional(),
        r2Key: z.string().min(1),
        r2Bucket: z.string().min(1),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [doc] = await db
        .insert(documents)
        .values({
          ...input,
          entityId: ctx.entityId!,
          uploadedBy: ctx.session!.user!.id!,
        })
        .returning()

      // Trigger document processing job
      if (input.mimeType) {
        await triggerClient.tasks.trigger("process-document", {
          documentId: doc.id,
          entityId: ctx.entityId!,
          storagePath: input.r2Key,
          mimeType: input.mimeType,
        })
      }

      return doc
    }),

  updateDocument: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.documents.findFirst({
        where: and(eq(documents.id, input.id), eq(documents.entityId, ctx.entityId!)),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
      const { id, ...data } = input
      const [updated] = await db
        .update(documents)
        .set(data)
        .where(and(eq(documents.id, id), eq(documents.entityId, ctx.entityId!)))
        .returning()
      return updated
    }),

  getDocumentById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const doc = await db.query.documents.findFirst({
        where: and(eq(documents.id, input.id), eq(documents.entityId, ctx.entityId!)),
      })
      if (!doc) return null

      const links = await db.query.documentLinks.findMany({
        where: eq(documentLinks.documentId, doc.id),
      })

      return { ...doc, links }
    }),

  // ── Document Links ──
  createDocumentLink: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        entityType: z.string().min(1),
        entityId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify document belongs to current entity
      const doc = await db.query.documents.findFirst({
        where: and(eq(documents.id, input.documentId), eq(documents.entityId, ctx.entityId!)),
      })
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
      const [link] = await db
        .insert(documentLinks)
        .values(input)
        .returning()
      return link
    }),

  removeDocumentLink: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(documentLinks)
        .where(eq(documentLinks.id, input.id))
        .returning()
      return deleted
    }),

  // ── Audit Log ──
  listAuditLog: protectedProcedure.query(({ ctx }) => {
    return db.query.auditLog.findMany({
      where: eq(auditLog.entityId, ctx.entityId!),
      orderBy: [desc(auditLog.createdAt)],
      limit: 100,
    })
  }),

  // ── Currencies (global reference — no entity scoping) ──
  listCurrencies: protectedProcedure.query(() => {
    return db.query.currencies.findMany()
  }),

  // ── Exchange Rates (global reference — no entity scoping) ──
  listExchangeRates: protectedProcedure.query(() => {
    return db.query.exchangeRates.findMany({
      orderBy: [desc(exchangeRates.createdAt)],
    })
  }),

  createExchangeRate: protectedProcedure
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
        rate: z.string(),
        source: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [rate] = await db
        .insert(exchangeRates)
        .values(input)
        .returning()
      return rate
    }),
})
