import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { journalEntries } from "@xenboox/db/schema/accounting";
import { agentRoutingLogs } from "@xenboox/db/schema/agents";
import { notifications } from "@xenboox/db/schema/notifications";
import { createAuditEntry } from "@xenboox/agents/core/state";

import { db } from "@/lib/db";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  adminProcedure,
  paginationSchema,
} from "@/lib/trpc/server";

// ─── Types ─────────────────────────────────────────────────────────────────

const ApprovableEntityTypeEnum = z.enum([
  "journal_entry",
  "bank_reconciliation",
  "payroll_run",
  "imprest_retirement",
  "ingestion_review",
  "agent_escalation",
]);

const ApprovalActionEnum = z.enum(["approved", "rejected", "needs_correction"]);

// ─── Router ────────────────────────────────────────────────────────────────

export const approvalsRouter = router({
  /**
   * List pending approval items (journal entries, escalations, etc.).
   * These are surfaced from agent_escalation routing logs and pending journal entries.
   */
  listPending: rlsProtectedProcedure
    .input(
      paginationSchema.extend({
        type: ApprovableEntityTypeEnum.optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        confidence: number;
        priority: string;
        createdAt: Date;
        metadata: Record<string, unknown>;
        agentId?: string;
        recommendedAction?: string;
      }> = [];

      // 1. Fetch pending agent routing logs with escalation decisions
      const escalationLogs = await db.query.agentRoutingLogs.findMany({
        where: and(
          eq(agentRoutingLogs.entityId, ctx.entityId!),
          eq(agentRoutingLogs.decision, "escalated"),
        ),
        orderBy: [desc(agentRoutingLogs.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      for (const log of escalationLogs) {
        const meta = log.metadata
          ? (JSON.parse(log.metadata) as Record<string, unknown>)
          : {};
        items.push({
          id: log.id,
          type: "agent_escalation",
          title: `Escalation: ${log.intentType}`,
          description: log.inputSummary,
          confidence: parseFloat(log.confidence),
          priority: (meta.priority as string) ?? "normal",
          createdAt: log.createdAt ?? new Date(),
          metadata: meta,
          agentId: log.agentsInvolved?.[0],
          recommendedAction:
            (meta.recommendedAction as string) ?? "Review and approve",
        });
      }

      // 2. Fetch pending (draft) journal entries that need approval
      const pendingEntries = await db.query.journalEntries.findMany({
        where: and(
          eq(journalEntries.entityId, ctx.entityId!),
          eq(journalEntries.status, "draft"),
        ),
        orderBy: [desc(journalEntries.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      for (const entry of pendingEntries) {
        items.push({
          id: entry.id,
          type: "journal_entry",
          title: `Journal Entry: ${entry.entryNumber ?? "Draft"}`,
          description: entry.description ?? "No description",
          confidence: 0.5,
          priority: "normal",
          createdAt: entry.createdAt ?? new Date(),
          metadata: {
            entryNumber: entry.entryNumber,
            date: entry.date,
            periodId: entry.periodId,
          },
        });
      }

      // Sort by priority (critical > high > normal > low) then createdAt desc
      const priorityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3,
      };

      items.sort((a, b) => {
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      return {
        items: items.slice(0, input.limit),
        totalCount: items.length,
      };
    }),

  /**
   * Resolve an approval item — approve, reject, or request correction.
   * Records the decision and updates the underlying entity.
   */
  resolve: adminProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: ApprovableEntityTypeEnum,
        action: ApprovalActionEnum,
        reason: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.itemType === "agent_escalation") {
          // §20.2 — atomic resolve: only an unresolved escalation (humanResponse
          // still null) can be resolved. Concurrent double-resolution loses the
          // race and gets CONFLICT instead of a duplicate notification.
          const log = await db.query.agentRoutingLogs.findFirst({
            where: eq(agentRoutingLogs.id, input.itemId),
          });

          if (!log) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Escalation item not found",
            });
          }

          const resolution = `[${input.action.toUpperCase()}] ${input.reason ?? "No reason provided"}`;

          const [claimed] = await db
            .update(agentRoutingLogs)
            .set({ humanResponse: resolution })
            .where(
              and(
                eq(agentRoutingLogs.id, input.itemId),
                eq(agentRoutingLogs.decision, "escalated"),
                sql`${agentRoutingLogs.humanResponse} IS NULL`,
              ),
            )
            .returning();

          if (!claimed) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Escalation already resolved by another user",
            });
          }

          // For approved items, create a success notification
          if (input.action === "approved") {
            await db.insert(notifications).values({
              userId: ctx.session!.user!.id!,
              entityId: ctx.entityId,
              type: "agent_escalation",
              priority: "medium",
              title: "Escalation Resolved: Approved",
              body: `You approved: ${log.inputSummary}`,
              data: JSON.stringify({
                logId: input.itemId,
                action: input.action,
                reason: input.reason,
              }),
              read: false,
              status: "sent",
              sentAt: new Date(),
            });
          }
        }

        if (input.itemType === "journal_entry") {
          const entry = await db.query.journalEntries.findFirst({
            where: and(
              eq(journalEntries.id, input.itemId),
              eq(journalEntries.entityId, ctx.entityId!),
            ),
          });

          if (!entry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Journal entry not found",
            });
          }

          // §20.2 — atomic status-guarded transition: only a draft (pending
          // approval) entry can be approved/rejected. The conditional UPDATE
          // wins the race atomically — a second concurrent approve (or an
          // approve-after-reject) affects 0 rows and gets CONFLICT instead of
          // silently double-posting or flipping an already-decided entry.
          if (input.action === "approved") {
            const [updated] = await db
              .update(journalEntries)
              .set({
                status: "posted",
                postedBy: ctx.session!.user!.id!,
                postedAt: new Date(),
              })
              .where(
                and(
                  eq(journalEntries.id, input.itemId),
                  eq(journalEntries.entityId, ctx.entityId!),
                  eq(journalEntries.status, "draft"),
                ),
              )
              .returning();
            if (!updated) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Journal entry is no longer pending approval — it may have already been approved or rejected",
              });
            }
          } else if (input.action === "rejected") {
            const [updated] = await db
              .update(journalEntries)
              .set({ status: "voided" })
              .where(
                and(
                  eq(journalEntries.id, input.itemId),
                  eq(journalEntries.entityId, ctx.entityId!),
                  eq(journalEntries.status, "draft"),
                ),
              )
              .returning();
            if (!updated) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Journal entry is no longer pending approval — it may have already been approved or rejected",
              });
            }
          } else {
            // needs_correction — leave as draft for editing
            // The frontend should open the entry for editing
          }
        }

        // Audit trail
        const auditEntry = createAuditEntry({
          agentId: "approvals-router",
          action: `approval_${input.action}`,
          details: {
            itemId: input.itemId,
            itemType: input.itemType,
            reason: input.reason,
            userId: ctx.session!.user!.id!,
          },
          confidence: 1,
        });

        return {
          success: true,
          action: input.action,
          auditEntry,
        };
      } catch (error) {
        handleMutationError(error, "Failed to resolve approval item");
      }
    }),

  /**
   * Get a count of pending items for badge display.
   */
  getPendingCount: rlsProtectedProcedure.query(async ({ ctx }) => {
    const escalationCount = (
      await db.query.agentRoutingLogs.findMany({
        where: and(
          eq(agentRoutingLogs.entityId, ctx.entityId!),
          eq(agentRoutingLogs.decision, "escalated"),
          sql`${agentRoutingLogs.humanResponse} IS NULL`,
        ),
        columns: { id: true },
      })
    ).length;

    const pendingJournalCount = (
      await db.query.journalEntries.findMany({
        where: and(
          eq(journalEntries.entityId, ctx.entityId!),
          eq(journalEntries.status, "draft"),
        ),
        columns: { id: true },
      })
    ).length;

    return {
      total: escalationCount + pendingJournalCount,
      escalations: escalationCount,
      pendingJournals: pendingJournalCount,
    };
  }),
});
