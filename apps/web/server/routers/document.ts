import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { callModel } from "@xenboox/models";
import {
  applySpliceEdit,
  applySpliceEditByLine,
  extractSelectionContext,
  stripCodeFences,
} from "@/lib/chat/artifact-edit";
import {
  documents,
  documentLinks,
  documentViews,
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
        categories: z.array(z.enum(docTypeEnum.enumValues)).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const whereClause =
        input.categories && input.categories.length > 0
          ? and(
              eq(documents.entityId, entityId),
              inArray(documents.type, input.categories),
            )
          : input.category
            ? and(
                eq(documents.entityId, entityId),
                eq(documents.type, input.category),
              )
            : eq(documents.entityId, entityId);

      const rows = await db.query.documents.findMany({
        where: whereClause,
        orderBy: [desc(documents.createdAt)],
        with: {
          uploader: { columns: { id: true, name: true } },
        },
      });

      // Surface the uploader's display name (join on users) while keeping
      // the raw uploadedBy id for API compatibility.
      return rows.map(({ uploader, ...doc }) => ({
        ...doc,
        uploadedByName: uploader?.name ?? null,
      }));
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
        with: {
          uploader: { columns: { id: true, name: true } },
        },
      });
      if (!doc) return null;

      const links = await db.query.documentLinks.findMany({
        where: and(
          eq(documentLinks.documentId, doc.id),
          eq(documentLinks.entityId, ctx.entityId!),
        ),
      });

      const { uploader, ...rest } = doc;
      return { ...rest, uploadedByName: uploader?.name ?? null, links };
    }),

  /**
   * Marks a document as viewed by the current user (per-user read tracking).
   * Entity-scoped: the document must belong to ctx.entityId, and the view row
   * is always keyed to the session user — callers can't record views for
   * anyone else (no IDOR). Idempotent: re-opening just bumps viewedAt.
   */
  markDocumentViewed: rlsProtectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.documentId),
          eq(documents.entityId, ctx.entityId!),
        ),
        columns: { id: true, entityId: true },
      });
      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const viewedAt = new Date();
      await db
        .insert(documentViews)
        .values({
          entityId: doc.entityId,
          documentId: doc.id,
          userId,
          viewedAt,
        })
        .onConflictDoUpdate({
          target: [documentViews.documentId, documentViews.userId],
          set: { viewedAt },
        });

      return { ok: true, viewedAt };
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
      with: {
        uploader: { columns: { id: true, name: true } },
      },
    });

    const totalDocuments = docs.length;
    const totalSize = docs.reduce((sum, d) => sum + (d.sizeBytes ?? 0), 0);

    // Terminal states need no attention; everything else is still in the
    // processing pipeline (or failed) — i.e. pending review. The set mirrors
    // the "Terminal states" group in the doc_status enum (schema/documents.ts).
    const TERMINAL_STATUSES = new Set([
      "agent_processing",
      "persisted",
      "done",
      "archived",
      "processed",
      "uploaded",
    ]);
    const pendingReviewDocs = docs.filter(
      (d) => !TERMINAL_STATUSES.has(d.status),
    );
    const pendingReview = pendingReviewDocs.length;

    // Storage breakdown by document category (only categories in use).
    const categoryBreakdown = (
      [
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
      ] as const
    )
      .map((category) => {
        const items = docs.filter((d) => d.type === category);
        return {
          category,
          count: items.length,
          sizeBytes: items.reduce((sum, d) => sum + (d.sizeBytes ?? 0), 0),
        };
      })
      .filter((b) => b.count > 0);

    const withUploader = ({ uploader, ...doc }: (typeof docs)[number]) => ({
      ...doc,
      uploadedByName: uploader?.name ?? null,
    });

    const recentUploads = [...docs]
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
      .slice(0, 5)
      .map(withUploader);

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
      overview: {
        categoryBreakdown,
        pendingReviewTotal: pendingReview,
        pendingReview: pendingReviewDocs.slice(0, 8).map(withUploader),
        recentUploads,
      },
      documents: docs.map(withUploader),
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

  // ── AI Document Editing (ChatGPT/Claude-style) ─────────────────────────
  //
  // The viewer shows the extracted text of a document (OCR or text content)
  // and lets the user highlight a passage and ask the AI to change/redo it.
  // Edits are versioned in metadata (original extraction is never touched),
  // written to the audit trail, and returned to the viewer with an edit count.

  editDocumentText: rlsProtectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        instruction: z.string().min(2).max(600),
        mode: z.enum(["selection", "whole"]).default("selection"),
        selection: z.string().max(4000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      const meta = (doc.metadata ?? {}) as Record<string, unknown>;
      // Edits layer on top of the most recent edited copy, falling back to
      // the AI-extracted text. The original ocrText column is never mutated.
      const base =
        typeof meta.editedContent === "string" && meta.editedContent.length > 0
          ? meta.editedContent
          : doc.ocrText;
      if (!base || base.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This document has no extracted text to edit. Try asking the AI about it instead.",
        });
      }
      if (base.length > 100_000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This document is too large to edit in place. Try downloading it and editing it directly.",
        });
      }

      if (input.mode === "selection" && !input.selection?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select a passage in the document first",
        });
      }

      try {
        const newContent = await editPlainTextWithModel({
          entityId: ctx.entityId!,
          content: base,
          selection: input.selection?.trim() ?? "",
          instruction: input.instruction,
        });

        const editCount = ((meta.editCount as number) ?? 0) + 1;
        await db
          .update(documents)
          .set({
            metadata: {
              ...meta,
              editedContent: newContent,
              previousContent: base,
              editCount,
              editedAt: new Date().toISOString(),
              lastEdit: {
                instruction: input.instruction,
                selection: input.selection?.trim() || null,
                mode: input.mode,
                at: new Date().toISOString(),
              },
            },
          })
          .where(
            and(
              eq(documents.id, doc.id),
              eq(documents.entityId, ctx.entityId!),
            ),
          );

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "document.edit_text",
          entityType: "document",
          entityIdRef: doc.id,
          newValues: {
            name: doc.name,
            mode: input.mode,
            instruction: input.instruction,
            editCount,
          },
        });

        return { content: newContent, editCount };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[document.editDocumentText] failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "The AI couldn't edit this document right now. Try a different instruction or check your model connection.",
        });
      }
    }),

  /** Revert the last AI edit (one level). */
  undoDocumentEdit: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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

      const meta = (doc.metadata ?? {}) as Record<string, unknown>;
      const current =
        typeof meta.editedContent === "string" && meta.editedContent.length > 0
          ? meta.editedContent
          : null;
      const previous =
        typeof meta.previousContent === "string" &&
        meta.previousContent.length > 0
          ? meta.previousContent
          : null;
      if (!current || !previous) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nothing to undo",
        });
      }

      const editCount = Math.max(0, ((meta.editCount as number) ?? 1) - 1);
      const updatedMeta: Record<string, unknown> = {
        ...meta,
        editedContent: previous,
        editCount,
        editedAt: new Date().toISOString(),
        lastEdit: {
          ...((meta.lastEdit as Record<string, unknown>) ?? {}),
          undoneAt: new Date().toISOString(),
        },
      };
      // Once we're back at the original extraction, drop the edit layer
      // entirely so the viewer returns to the untouched document.
      if (editCount === 0) {
        delete updatedMeta.editedContent;
        delete updatedMeta.previousContent;
      }

      await db
        .update(documents)
        .set({ metadata: updatedMeta })
        .where(
          and(eq(documents.id, doc.id), eq(documents.entityId, ctx.entityId!)),
        );

      await db.insert(auditLog).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        action: "document.undo_edit",
        entityType: "document",
        entityIdRef: doc.id,
        newValues: { name: doc.name, editCount },
      });

      return { content: previous, editCount };
    }),
});

// ─── AI plain-text editing helper ───────────────────────────────────────────

/**
 * Edit an extracted document's plain text with the model.
 * - With a selection: the model returns a replacement spliced into the
 *   original around the selected passage (data-preserving).
 * - Whole-document: the model rewrites the text as plain text, preserving
 *   every figure, date, and label unless the instruction targets it.
 */
async function editPlainTextWithModel(params: {
  entityId: string;
  content: string;
  selection: string;
  instruction: string;
}): Promise<string> {
  const { entityId, content, selection, instruction } = params;

  if (selection) {
    const window = extractSelectionContext(content, selection);
    const response = await callModel({
      agentName: "cfo",
      taskType: "report_generation",
      entityId,
      systemPrompt: `You are editing the extracted text of a financial document inside Xenboox. The user selected a passage and asked for a change.

Return ONLY the replacement text for the selected passage — a single continuous string. No explanations, no markdown, no surrounding quotes.

RULES (non-negotiable):
- Preserve the document's plain-text format exactly.
- NEVER change any figure, account name, currency, date, or total unless the user's instruction explicitly targets that exact value.
- The replacement replaces exactly the selected text, so make it self-contained.`,
      messages: [
        {
          role: "user",
          content: `SELECTED PASSAGE:\n"""${selection}"""\n\nINSTRUCTION:\n"""${instruction}"""\n\nCONTEXT (the document around the selection):\n"""${window}"""`,
        },
      ],
      maxTokens: 1500,
      temperature: 0.2,
    });

    const replacement = stripCodeFences(response.content);
    if (!replacement) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The AI returned an empty replacement — please try again.",
      });
    }

    const spliced =
      applySpliceEdit(content, selection, replacement) ??
      applySpliceEditByLine(content, selection, replacement);
    if (spliced === null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Couldn't locate the selected text in the document — please try again.",
      });
    }
    return spliced;
  }

  const response = await callModel({
    agentName: "cfo",
    taskType: "report_generation",
    entityId,
    systemPrompt: `You are editing the extracted text of a financial document inside Xenboox. The user asked you to change or redo the whole document.

Return ONLY the revised plain text. No explanations, no markdown, no code fences.

RULES (non-negotiable):
- Keep the same structure and sections unless the instruction asks to reorganize.
- NEVER invent, round, change, add, or remove any financial figure, account name, currency, date, or total unless the instruction explicitly targets that exact value.`,
    messages: [
      {
        role: "user",
        content: `INSTRUCTION:\n"""${instruction}"""\n\nDOCUMENT (rewrite it completely with the change applied):\n"""${content}"""`,
      },
    ],
    maxTokens: 4000,
    temperature: 0.2,
  });

  const cleaned = stripCodeFences(response.content);
  if (!cleaned || cleaned.length < 10) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "The AI didn't return valid text — please try a different instruction.",
    });
  }
  return cleaned;
}
