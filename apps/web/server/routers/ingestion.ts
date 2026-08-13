/**
 * Ingestion Review Router
 *
 * Manages the review queue for documents that the ingestion pipeline
 * couldn't auto-post (confidence < 95%). Users can review proposed entries,
 * approve, reject, or edit them before posting.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
} from "@/lib/trpc/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  documents,
  documentLinks,
  auditLog,
  agentActivity,
  notifications,
  userEntityAccess,
} from "@xenboox/db/schema";
import {
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import {
  runIngestionPipeline,
  registerUnmappedAccounts,
} from "@xenboox/ingestion";
import { postJournalEntry } from "@xenboox/ingestion/engine/journal-generator";
import { propagatePosting } from "@xenboox/ingestion/engine/propagation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingReviewItem {
  id: string;
  documentId: string;
  name: string;
  type: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string | null;
  confidence: number;
  workflow: string;
  action: string;
  dominantSignal: string;
  reviewItems: Array<Record<string, unknown>>;
  classification: {
    category: string;
    confidence: number;
  };
  hasProposedEntry: boolean;
}

export interface PendingReviewsResponse {
  items: PendingReviewItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ReviewDetailResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  mimeType: string | null;
  sizeBytes: number | null;
  ocrText: string | null;
  ocrConfidence: string | null;
  createdAt: string;
  updatedAt: string | null;
  metadata: Record<string, unknown>;
  review: {
    confidence: number;
    workflow: string;
    action: string;
    dominantSignal: string;
    reason: string;
    reviewItems: Array<Record<string, unknown>>;
    proposedEntry: Record<string, unknown> | null;
  };
  classification: {
    category: string;
    confidence: number;
    reasoning: string;
  };
  extraction: {
    data: Record<string, unknown>;
    fieldConfidence: Record<string, number>;
    confidence: number;
  };
}

export interface IngestionStatsResponse {
  total: number;
  autoPosted: number;
  pendingReview: number;
  failed: number;
  processing: number;
  autoPostRate: number;
}

export interface AgentApprovalItem {
  id: string;
  source: "agent";
  title: string;
  description: string;
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  type: string;
  workflow: string;
  documentName: string;
  createdAt: string | Date;
  metadata: Record<string, unknown>;
}

export interface AgentApprovalsResponse {
  items: AgentApprovalItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardResponse {
  stats: IngestionStatsResponse;
  confidenceDistribution: {
    excellent: number;
    good: number;
    fair: number;
    low: number;
    unknown: number;
  };
  workflowDistribution: Record<string, number>;
  activityFeed: Array<{
    id: string;
    action: string;
    agentName: string;
    status: string;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    confidence: number | null;
    durationMs: number | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
  recentEntries: Array<{
    id: string;
    entryNumber: number | null;
    description: string;
    date: string;
    reference: string | null;
    confidence: number | null;
    postedAt: string | null;
  }>;
}

// ─── Notification Helper ────────────────────────────────────────────────────

/**
 * Send a confirmation notification when a user resolves an ingestion review.
 * Creates notifications for all users of the entity so everyone stays informed.
 */
async function sendResolutionNotification(
  entityId: string,
  currentUserId: string,
  documentId: string,
  action: "approved" | "rejected",
  docName: string,
  workflow: string,
  journalEntryId?: string,
  entryNumber?: number,
  rejectionReason?: string,
) {
  try {
    // Find all users with access to this entity
    const accessRecords = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.entityId, entityId),
    });

    if (accessRecords.length === 0) return;

    const workflowLabel = workflow.replace(/_/g, " ");

    const notificationValues = accessRecords.map((record) => ({
      userId: record.userId,
      entityId,
      type: action === "approved" ? "ingestion_posted" : "ingestion_rejected",
      priority: action === "approved" ? "low" : "medium",
      title:
        action === "approved"
          ? `✅ ${workflowLabel} posted — #${entryNumber}`
          : `❌ ${workflowLabel} rejected`,
      body:
        action === "approved"
          ? `${docName} — Approved and posted as journal entry #${entryNumber}.`
          : `${docName} — Rejected. Reason: ${rejectionReason ?? "No reason provided."}`,
      data: JSON.stringify({
        documentId,
        documentName: docName,
        workflow,
        action,
        journalEntryId,
        entryNumber,
        rejectionReason,
        resolvedBy: currentUserId,
        resolvedAt: new Date().toISOString(),
        canRerun: action === "rejected",
      }),
      status: "sent" as const,
      sentAt: new Date(),
    }));

    await db.insert(notifications).values(notificationValues);
  } catch (error) {
    // Notification failure should never break the mutation
    logger.error({ err: error }, "Failed to send resolution notification");
  }
}

// ─── Review Queue Router ────────────────────────────────────────────────────

export const ingestionRouter = router({
  /**
   * List all documents pending review (confidence < 95% threshold).
   * These are documents where the ingestion engine marked them as
   * needing human verification before posting.
   */
  listPendingReviews: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
          status: z.enum(["pending_review", "escalated", "all"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<PendingReviewsResponse> => {
      const { limit = 20, offset = 0, status = "all" } = input ?? {};

      // Find documents where ingestion metadata indicates pending review
      const allDocs = await db.query.documents.findMany({
        where: and(
          eq(documents.entityId, ctx.entityId!),
          eq(documents.status, "agent_processing"),
        ),
        orderBy: [desc(documents.updatedAt)],
        limit,
        offset,
      });

      // Filter for documents with ingestion review metadata
      const pendingReviews = allDocs
        .filter((doc) => {
          const meta = (doc.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          return (
            ingestion.requiresReview === true ||
            ingestion.action === "pending_review" ||
            ingestion.action === "escalated"
          );
        })
        .map((doc) => {
          const meta = (doc.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          const classification = (meta.classification ?? {}) as Record<
            string,
            unknown
          >;
          const extraction = (meta.extraction ?? {}) as Record<string, unknown>;

          return {
            id: doc.id,
            documentId: doc.id,
            name: doc.name,
            type: doc.type,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            createdAt:
              doc.createdAt instanceof Date
                ? doc.createdAt.toISOString()
                : doc.createdAt,
            updatedAt:
              doc.updatedAt instanceof Date
                ? doc.updatedAt.toISOString()
                : (doc.updatedAt ?? null),
            confidence: (ingestion.confidence as number) ?? 0,
            workflow: (ingestion.workflow as string) ?? "unknown",
            action: (ingestion.action as string) ?? "pending_review",
            dominantSignal: (ingestion.dominantSignal as string) ?? "",
            reviewItems:
              (ingestion.reviewItems as Array<Record<string, unknown>>) ?? [],
            classification: {
              category: (classification.category as string) ?? doc.type,
              confidence: (classification.confidence as number) ?? 0,
            },
            hasProposedEntry: !!ingestion.proposedEntry,
          };
        });

      // Get total count
      const totalDocs = await db.query.documents.findMany({
        where: and(
          eq(documents.entityId, ctx.entityId!),
          eq(documents.status, "agent_processing"),
        ),
      });

      const totalPending = totalDocs.filter((doc) => {
        const meta = (doc.metadata ?? {}) as Record<string, unknown>;
        const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
        return ingestion.requiresReview === true;
      }).length;

      return {
        items: pendingReviews,
        total: totalPending,
        limit,
        offset,
      };
    }),

  /**
   * Get full details of a pending review, including the proposed journal entry.
   */
  getReviewDetails: rlsProtectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }): Promise<ReviewDetailResponse> => {
      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.documentId),
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
      const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
      const classification = (meta.classification ?? {}) as Record<
        string,
        unknown
      >;
      const extraction = (meta.extraction ?? {}) as Record<string, unknown>;

      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        status: doc.status,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        ocrText: doc.ocrText,
        ocrConfidence: doc.ocrConfidence,
        createdAt:
          doc.createdAt instanceof Date
            ? doc.createdAt.toISOString()
            : doc.createdAt,
        updatedAt:
          doc.updatedAt instanceof Date
            ? doc.updatedAt.toISOString()
            : (doc.updatedAt ?? null),
        metadata: meta,
        review: {
          confidence: (ingestion.confidence as number) ?? 0,
          workflow: (ingestion.workflow as string) ?? "unknown",
          action: (ingestion.action as string) ?? "pending_review",
          dominantSignal: (ingestion.dominantSignal as string) ?? "",
          reason: (ingestion.reason as string) ?? "",
          reviewItems:
            (ingestion.reviewItems as Array<Record<string, unknown>>) ?? [],
          proposedEntry:
            (ingestion.proposedEntry as Record<string, unknown>) ?? null,
        },
        classification: {
          category: (classification.category as string) ?? doc.type,
          confidence: (classification.confidence as number) ?? 0,
          reasoning: (classification.reasoning as string) ?? "",
        },
        extraction: {
          data: (extraction.data as Record<string, unknown>) ?? {},
          fieldConfidence:
            (extraction.fieldConfidence as Record<string, number>) ?? {},
          confidence: (extraction.confidence as number) ?? 0,
        },
      };
    }),

  /**
   * Approve a pending review, posting the proposed journal entry.
   * Can optionally edit the proposed entry before posting.
   */
  approveReview: rlsProtectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        editedEntry: z
          .object({
            description: z.string().optional(),
            date: z.string().optional(),
            lines: z
              .array(
                z.object({
                  accountId: z.string().uuid(),
                  debit: z.number().min(0),
                  credit: z.number().min(0),
                  description: z.string().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(
      async ({
        ctx,
        input,
      }): Promise<{
        success: boolean;
        journalEntryId: string;
        entryNumber: number | null;
      }> => {
        try {
          const doc = await db.query.documents.findFirst({
            where: and(
              eq(documents.id, input.documentId),
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
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          const proposedEntry = (ingestion.proposedEntry ?? {}) as Record<
            string,
            unknown
          >;
          const workflow =
            (ingestion.workflow as string) ?? "journal_adjustment";

          if (!proposedEntry || !proposedEntry.lines) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No proposed journal entry found for this document",
            });
          }

          // Apply any user edits to the proposed entry
          const entry = input.editedEntry
            ? {
                ...proposedEntry,
                ...input.editedEntry,
                lines: input.editedEntry.lines ?? proposedEntry.lines,
              }
            : proposedEntry;

          // Validate the entry is balanced
          const totalDebit = (
            entry.lines as Array<{ debit: number; credit: number }>
          ).reduce(
            (s: number, l: { debit: number; credit: number }) => s + l.debit,
            0,
          );
          const totalCredit = (
            entry.lines as Array<{ debit: number; credit: number }>
          ).reduce(
            (s: number, l: { debit: number; credit: number }) => s + l.credit,
            0,
          );

          if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Journal entry not balanced: debits ${totalDebit.toFixed(2)} != credits ${totalCredit.toFixed(2)}`,
            });
          }

          // Determine the fiscal period
          const entryDate =
            (entry.date as string) ?? new Date().toISOString().split("T")[0];
          const dateObj = new Date(entryDate);
          const period = await db.query.fiscalPeriods.findFirst({
            where: and(
              eq(fiscalPeriods.entityId, ctx.entityId!),
              eq(fiscalPeriods.year, dateObj.getFullYear()),
              eq(fiscalPeriods.month, dateObj.getMonth() + 1),
            ),
          });

          if (!period) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `No fiscal period found for date ${entryDate}. Create fiscal periods first.`,
            });
          }

          // Post the journal entry
          const { journalEntryId, entryNumber } = await postJournalEntry(
            ctx.entityId!,
            entry as any,
            0.95, // User approval = high confidence
            `user-${ctx.session!.user!.id}`,
          );

          // Propagate to downstream modules
          await propagatePosting(
            ctx.entityId!,
            entry as any,
            workflow as any,
            journalEntryId,
          );

          // Create document link
          await db.insert(documentLinks).values({
            documentId: doc.id,
            entityType: "journal_entry",
            entityId: journalEntryId,
          });

          // Update document status
          await db
            .update(documents)
            .set({
              status: "done",
              metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{ingestion}', ${JSON.stringify(
                {
                  ...ingestion,
                  resolvedAt: new Date().toISOString(),
                  resolvedBy: ctx.session!.user!.id,
                  resolvedAction: "approved",
                  journalEntryId,
                  entryNumber,
                  notes: input.notes,
                },
              )}::jsonb)`,
            } as any)
            .where(eq(documents.id, doc.id));

          // Create audit log
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id,
            action: "ingestion.approved",
            entityType: "document",
            entityIdRef: doc.id,
            newValues: {
              journalEntryId,
              entryNumber,
              workflow,
              confidence: 0.95,
              notes: input.notes,
            },
            confidence: "0.95",
          });

          // Send confirmation notification with journal entry link
          await sendResolutionNotification(
            ctx.entityId!,
            ctx.session!.user!.id!,
            doc.id,
            "approved",
            doc.name,
            workflow,
            journalEntryId,
            entryNumber,
          );

          return {
            success: true,
            journalEntryId,
            entryNumber,
          };
        } catch (error) {
          handleMutationError(error, "Failed to approve review");
        }
      },
    ),

  /**
   * Reject a pending review. The document will not be posted.
   */
  rejectReview: rlsProtectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        reason: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      try {
        const doc = await db.query.documents.findFirst({
          where: and(
            eq(documents.id, input.documentId),
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
        const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;

        // Update document status
        await db
          .update(documents)
          .set({
            status: "failed",
            metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{ingestion}', ${JSON.stringify(
              {
                ...ingestion,
                resolvedAt: new Date().toISOString(),
                resolvedBy: ctx.session!.user!.id,
                resolvedAction: "rejected",
                rejectionReason: input.reason,
              },
            )}::jsonb)`,
          } as any)
          .where(eq(documents.id, doc.id));

        // Create audit log
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id,
          action: "ingestion.rejected",
          entityType: "document",
          entityIdRef: doc.id,
          newValues: {
            reason: input.reason,
            workflow: ingestion.workflow,
          },
          confidence: "0",
        });

        // Send rejection notification with rerun action data
        await sendResolutionNotification(
          ctx.entityId!,
          ctx.session!.user!.id!,
          doc.id,
          "rejected",
          doc.name,
          (ingestion.workflow as string) ?? "unknown",
          undefined,
          undefined,
          input.reason,
        );

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to reject review");
      }
    }),

  /**
   * Re-run the ingestion pipeline for a document. Useful if
   * data was corrected or new accounts were created.
   */
  rerunIngestion: rlsProtectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(
      async ({
        ctx,
        input,
      }): Promise<{
        success: boolean;
        confidence: number;
        action: string;
        posted: boolean | undefined;
        journalEntryId: string | undefined;
        error: string | undefined;
      }> => {
        try {
          const doc = await db.query.documents.findFirst({
            where: and(
              eq(documents.id, input.documentId),
              eq(documents.entityId, ctx.entityId!),
            ),
          });

          if (!doc) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Document not found",
            });
          }

          // Reset document to synced status
          await db
            .update(documents)
            .set({
              status: "synced",
              metadata: sql`COALESCE(metadata, '{}'::jsonb) - 'ingestion'`,
            } as any)
            .where(eq(documents.id, doc.id));

          // Run the ingestion pipeline again
          const result = await runIngestionPipeline(
            input.documentId,
            ctx.entityId!,
          );

          return {
            success: result.success,
            confidence: result.confidence.overall,
            action: result.postingDecision.action,
            posted: result.postingResult?.posted,
            journalEntryId: result.postingResult?.journalEntryId,
            error: result.error,
          };
        } catch (error) {
          handleMutationError(error, "Failed to rerun ingestion");
        }
      },
    ),

  /**
   * Get ingestion statistics for the dashboard.
   */
  /**
   * Comprehensive dashboard data: stats, recent entries, confidence distribution, activity feed.
   */
  getDashboard: rlsProtectedProcedure.query(
    async ({ ctx }): Promise<DashboardResponse> => {
      // ── Pipeline Stats ──
      const allDocs = await db.query.documents.findMany({
        where: eq(documents.entityId, ctx.entityId!),
      });

      const total = allDocs.length;
      const autoPosted = allDocs.filter((d) => {
        const meta = (d.metadata ?? {}) as Record<string, unknown>;
        const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
        return ingestion.action === "auto_post";
      }).length;
      const pendingReview = allDocs.filter((d) => {
        const meta = (d.metadata ?? {}) as Record<string, unknown>;
        const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
        return ingestion.requiresReview === true;
      }).length;
      const failed = allDocs.filter((d) => d.status === "failed").length;
      const processing = allDocs.filter(
        (d) =>
          d.status === "processing" ||
          d.status === "extracted" ||
          d.status === "synced" ||
          d.status === "agent_processing",
      ).length;
      const autoPostRate =
        total > 0 ? Math.round((autoPosted / total) * 100) : 0;

      // ── Confidence Distribution ──
      const configDistribution = {
        excellent: allDocs.filter((d) => {
          const meta = (d.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          return (ingestion.confidence as number) >= 0.95;
        }).length,
        good: allDocs.filter((d) => {
          const meta = (d.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          const c = ingestion.confidence as number;
          return c >= 0.85 && c < 0.95;
        }).length,
        fair: allDocs.filter((d) => {
          const meta = (d.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          const c = ingestion.confidence as number;
          return c >= 0.6 && c < 0.85;
        }).length,
        low: allDocs.filter((d) => {
          const meta = (d.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          const c = ingestion.confidence as number;
          return c > 0 && c < 0.6;
        }).length,
        unknown: allDocs.filter((d) => {
          const meta = (d.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          return !ingestion.confidence;
        }).length,
      };

      // ── Recent Activity Feed ──
      const recentActivity = await db.query.agentActivity.findMany({
        where: and(
          eq(agentActivity.entityId, ctx.entityId!),
          sql`${agentActivity.agentName} = 'ingestion-engine'`,
        ),
        orderBy: [desc(agentActivity.createdAt)],
        limit: 30,
      });

      const activityFeed = recentActivity.map((act) => ({
        id: act.id,
        action: act.action,
        agentName: act.agentName,
        status: act.status,
        input: act.input as Record<string, unknown> | null,
        output: act.output as Record<string, unknown> | null,
        confidence: act.confidence ? parseFloat(act.confidence) : null,
        durationMs: act.durationMs,
        errorMessage: act.errorMessage,
        createdAt:
          act.createdAt instanceof Date
            ? act.createdAt.toISOString()
            : act.createdAt,
      }));

      // ── Recent Auto-Posted Entries ──
      const recentJournalEntries = await db.query.journalEntries.findMany({
        where: and(
          eq(journalEntries.entityId, ctx.entityId!),
          eq(journalEntries.status, "posted"),
          eq(journalEntries.source, "document_upload"),
        ),
        orderBy: [desc(journalEntries.createdAt)],
        limit: 10,
      });

      // ── Workflow Distribution ──
      const workflowCounts = allDocs.reduce(
        (acc, doc) => {
          const meta = (doc.metadata ?? {}) as Record<string, unknown>;
          const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
          const workflow = (ingestion.workflow as string) ?? "unknown";
          acc[workflow] = (acc[workflow] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        stats: {
          total,
          autoPosted,
          pendingReview,
          failed,
          processing,
          autoPostRate,
        },
        confidenceDistribution: configDistribution,
        workflowDistribution: workflowCounts,
        activityFeed,
        recentEntries: recentJournalEntries.map((e) => ({
          id: e.id,
          entryNumber: e.entryNumber,
          description: e.description,
          date: e.date,
          reference: e.reference,
          confidence: e.confidence ? parseFloat(e.confidence) : null,
          postedAt: e.postedAt?.toISOString() ?? null,
        })),
      };
    },
  ),

  /**
   * List agent-generated approval items.
   * Queries the agent activity log for items flagged by AP, AR, Cash, Compliance,
   * and other agents that require human review before proceeding.
   *
   * Agents log items needing review with actions like:
   *   - "escalate" | "escalated" — Agent needs human decision
   *   - "flag_for_review" | "needs_review" — Agent flagged uncertainty
   *   - "approval_needed" — Explicit approval request
   */
  listAgentApprovals: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<AgentApprovalsResponse> => {
      const { limit = 20, offset = 0 } = input ?? {};

      // Known agent names that can generate approval items
      const agentNames = [
        "ap-agent",
        "ar-agent",
        "cash-agent",
        "compliance-agent",
        "treasury-agent",
        "payroll-manager-agent",
        "controller-agent",
        "asset-agent",
        "inventory-agent",
      ];

      // Actions that indicate a human review is needed
      const reviewActions = [
        "escalate",
        "escalated",
        "flag_for_review",
        "needs_review",
        "approval_needed",
        "review_required",
      ];

      const activities = await db.query.agentActivity.findMany({
        where: and(
          eq(agentActivity.entityId, ctx.entityId!),
          inArray(agentActivity.agentName, agentNames),
          // Items that need review have confidence < 0.8 or status indicating escalation
          sql`(
            COALESCE(${agentActivity.confidence}::numeric, 0) < 0.8
            OR ${agentActivity.status} = 'review_needed'
          )`,
        ),
        orderBy: [desc(agentActivity.createdAt)],
        limit,
        offset,
      });

      // Also look for explicit escalation actions regardless of agent
      const escalationActivities = await db.query.agentActivity.findMany({
        where: and(
          eq(agentActivity.entityId, ctx.entityId!),
          inArray(agentActivity.action, reviewActions),
        ),
        orderBy: [desc(agentActivity.createdAt)],
        limit: 10,
      });

      // Deduplicate by ID
      const seen = new Set<string>();
      const merged = [...activities, ...escalationActivities].filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

      // Sort merged by createdAt descending
      merged.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const items = merged.slice(0, limit).map((act) => {
        const inputData = (act.input ?? {}) as Record<string, unknown>;
        const outputData = (act.output ?? {}) as Record<string, unknown>;
        const confidence = act.confidence ? parseFloat(act.confidence) : 0.5;

        // Build a human-readable title from the agent activity
        const agentLabel = act.agentName
          .replace(/-/g, " ")
          .replace(/agent$/i, "")
          .trim();

        const actionLabel = act.action
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        const title =
          (outputData.title as string) ??
          (outputData.message as string) ??
          `${agentLabel} — ${actionLabel}`;

        const description =
          (outputData.reason as string) ??
          (outputData.reasoning as string) ??
          (outputData.description as string) ??
          (inputData.description as string) ??
          `Flagged by ${agentLabel} for review`;

        const recommendation =
          (outputData.recommendation as string) ??
          (outputData.suggestion as string) ??
          "Review and take appropriate action";

        const sourceRef =
          (inputData.documentName as string) ??
          (inputData.invoiceNumber as string) ??
          (inputData.reference as string) ??
          (inputData.source as string) ??
          (outputData.reference as string) ??
          act.id.slice(0, 8);

        // Determine type and workflow from context
        const type =
          (inputData.type as string) ??
          (outputData.type as string) ??
          act.action;
        const workflow =
          (inputData.workflow as string) ??
          (outputData.workflow as string) ??
          "review";

        // Priority based on confidence and action
        const isEscalation = reviewActions.includes(act.action);
        const priority: "critical" | "high" | "medium" | "low" =
          isEscalation || confidence < 0.4
            ? "critical"
            : confidence < 0.6
              ? "high"
              : confidence < 0.8
                ? "medium"
                : "low";

        return {
          id: act.id,
          source: "agent" as const,
          title,
          description,
          confidence,
          priority,
          type,
          workflow,
          documentName: sourceRef,
          createdAt: act.createdAt.toISOString(),
          metadata: {
            agent: agentLabel,
            recommendation,
            agentAction: act.action,
            inputData,
            outputData,
          },
        };
      });

      // Get total count
      const totalCount = await db.query.agentActivity.findMany({
        where: and(
          eq(agentActivity.entityId, ctx.entityId!),
          inArray(agentActivity.agentName, agentNames),
          sql`COALESCE(${agentActivity.confidence}::numeric, 0) < 0.8`,
        ),
      });

      return {
        items,
        total: totalCount.length + escalationActivities.length,
        limit,
        offset,
      };
    }),

  getStats: rlsProtectedProcedure.query(
    async ({ ctx }): Promise<IngestionStatsResponse> => {
      const allDocs = await db.query.documents.findMany({
        where: eq(documents.entityId, ctx.entityId!),
      });

      const total = allDocs.length;
      const autoPosted = allDocs.filter((d) => {
        const meta = (d.metadata ?? {}) as Record<string, unknown>;
        const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
        return ingestion.action === "auto_post";
      }).length;

      const pendingReview = allDocs.filter((d) => {
        const meta = (d.metadata ?? {}) as Record<string, unknown>;
        const ingestion = (meta.ingestion ?? {}) as Record<string, unknown>;
        return ingestion.requiresReview === true;
      }).length;

      const failed = allDocs.filter((d) => d.status === "failed").length;
      const processing = allDocs.filter(
        (d) =>
          d.status === "processing" ||
          d.status === "extracted" ||
          d.status === "synced" ||
          d.status === "agent_processing",
      ).length;

      const autoPostRate =
        total > 0 ? Math.round((autoPosted / total) * 100) : 0;

      return {
        total,
        autoPosted,
        pendingReview,
        failed,
        processing,
        autoPostRate,
      };
    },
  ),

  listRecentActivity: rlsProtectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const activities = await db.query.agentActivity.findMany({
        where: eq(agentActivity.entityId, ctx.entityId!),
        orderBy: [desc(agentActivity.createdAt)],
        limit: input.limit,
      });
      return activities.map((a) => ({
        id: a.id,
        agent: a.agentName,
        action: a.action,
        description:
          ((a.output as Record<string, unknown> | null)
            ?.description as string) ?? "",
        status: a.status,
        confidence: a.confidence ? parseFloat(a.confidence) : null,
        entityId: a.entityId,
        createdAt: a.createdAt,
        metadata: (a.input as Record<string, unknown> | null) ?? null,
      }));
    }),
});
