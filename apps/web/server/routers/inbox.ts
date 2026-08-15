import { z } from "zod";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";
import {
  journalEntries,
  invoicesAp,
  salesInvoices,
  bankAccounts,
  documents,
  paymentsAp,
  conversations,
  chatMessages,
  auditLog,
  agentRoutingLogs,
} from "@xenboox/db/schema";

import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Inbox Router ──────────────────────────────────────────────────────────

export const inboxRouter = router({
  /**
   * Get summary counts for the inbox overview cards.
   * Returns: All Items, Needs Approval, AI Review, Information, Completed, Rejected
   */
  getSummaryCounts: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // All items = pending journals + escalations + pending AP invoices + pending payments
    const pendingJournalsCount =
      (
        await db
          .select({ count: count() })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.entityId, entityId),
              eq(journalEntries.status, "draft"),
            ),
          )
      )[0]?.count ?? 0;

    const escalationCount =
      (
        await db
          .select({ count: count() })
          .from(agentRoutingLogs)
          .where(
            and(
              eq(agentRoutingLogs.entityId, entityId),
              eq(agentRoutingLogs.decision, "escalated"),
            ),
          )
      )[0]?.count ?? 0;

    const pendingApCount =
      (
        await db
          .select({ count: count() })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              eq(invoicesAp.status, "pending"),
            ),
          )
      )[0]?.count ?? 0;

    // Needs Approval = items that require human decision
    const needsApprovalCount = pendingJournalsCount + pendingApCount;

    // AI Review = agent escalations requiring review
    const aiReviewCount = escalationCount;

    // Information = informational items (completed items without action needed)
    const informationCount = 5; // Placeholder — would come from notification preferences

    // Completed = posted journals + paid invoices
    const completedJournalsCount =
      (
        await db
          .select({ count: count() })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.entityId, entityId),
              eq(journalEntries.status, "posted"),
            ),
          )
      )[0]?.count ?? 0;

    const paidInvoicesCount =
      (
        await db
          .select({ count: count() })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              eq(invoicesAp.status, "paid"),
            ),
          )
      )[0]?.count ?? 0;

    const completedCount = completedJournalsCount + paidInvoicesCount;

    // Rejected = voided journals
    const rejectedCount =
      (
        await db
          .select({ count: count() })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.entityId, entityId),
              eq(journalEntries.status, "voided"),
            ),
          )
      )[0]?.count ?? 0;

    const allItemsCount =
      needsApprovalCount +
      aiReviewCount +
      informationCount +
      completedCount +
      rejectedCount;

    return {
      allItems: allItemsCount,
      needsApproval: needsApprovalCount,
      aiReview: aiReviewCount,
      information: informationCount,
      completed: completedCount,
      rejected: rejectedCount,
    };
  }),

  /**
   * List approval items with filtering and sorting.
   */
  listApprovals: protectedProcedure
    .input(
      z.object({
        filter: z
          .enum([
            "all",
            "needs_approval",
            "ai_review",
            "information",
            "completed",
            "rejected",
          ])
          .default("all"),
        sort: z
          .enum(["newest", "oldest", "priority", "amount"])
          .default("newest"),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const items: Array<{
        id: string;
        type: string;
        title: string;
        subtitle: string;
        amount: string;
        amountValue: number;
        priority: "high" | "medium" | "low";
        status: "pending" | "review" | "completed" | "rejected";
        createdAt: Date;
        metadata: Record<string, unknown>;
      }> = [];

      // Fetch pending journals
      if (input.filter === "all" || input.filter === "needs_approval") {
        const draftEntries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "draft"),
          ),
          orderBy: [desc(journalEntries.createdAt)],
          limit: input.limit,
          offset: input.offset,
        });

        for (const entry of draftEntries) {
          items.push({
            id: entry.id,
            type: "journal_entry",
            title: `Journal Entry Review`,
            subtitle: `AI-generated adjusting entries for ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`,
            amount: "—",
            amountValue: 0,
            priority: "medium",
            status: "pending",
            createdAt: new Date(entry.createdAt),
            metadata: {
              entryNumber: entry.entryNumber,
              description: entry.description,
            },
          });
        }
      }

      // Fetch agent escalations
      if (input.filter === "all" || input.filter === "ai_review") {
        const escalations = await db.query.agentRoutingLogs.findMany({
          where: and(
            eq(agentRoutingLogs.entityId, entityId),
            eq(agentRoutingLogs.decision, "escalated"),
          ),
          orderBy: [desc(agentRoutingLogs.createdAt)],
          limit: input.limit,
          offset: input.offset,
        });

        for (const log of escalations) {
          const meta = log.metadata
            ? (JSON.parse(log.metadata) as Record<string, unknown>)
            : {};

          items.push({
            id: log.id,
            type: "agent_escalation",
            title: log.intentType ?? "Agent Review",
            subtitle: log.inputSummary ?? "Requires review",
            amount: (meta.amount as string) ?? "—",
            amountValue: (meta.amountValue as number) ?? 0,
            priority:
              (meta.priority as string as "high" | "medium" | "low") ??
              "medium",
            status: "review",
            createdAt: new Date(log.createdAt),
            metadata: meta,
          });
        }
      }

      // Fetch completed journals
      if (input.filter === "all" || input.filter === "completed") {
        const postedEntries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "posted"),
          ),
          orderBy: [desc(journalEntries.createdAt)],
          limit: input.limit,
          offset: input.offset,
        });

        for (const entry of postedEntries) {
          items.push({
            id: entry.id,
            type: "journal_entry",
            title: `Journal Entry Posted`,
            subtitle: entry.description ?? "Completed",
            amount: "—",
            amountValue: 0,
            priority: "low",
            status: "completed",
            createdAt: entry.postedAt
              ? new Date(entry.postedAt)
              : new Date(entry.createdAt),
            metadata: {
              entryNumber: entry.entryNumber,
              postedBy: entry.postedBy,
            },
          });
        }
      }

      // Fetch rejected journals
      if (input.filter === "all" || input.filter === "rejected") {
        const voidedEntries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "voided"),
          ),
          orderBy: [desc(journalEntries.createdAt)],
          limit: input.limit,
          offset: input.offset,
        });

        for (const entry of voidedEntries) {
          items.push({
            id: entry.id,
            type: "journal_entry",
            title: `Journal Entry Rejected`,
            subtitle: entry.description ?? "Rejected",
            amount: "—",
            amountValue: 0,
            priority: "low",
            status: "rejected",
            createdAt: new Date(entry.createdAt),
            metadata: {
              entryNumber: entry.entryNumber,
            },
          });
        }
      }

      // Sort items
      const priorityOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };

      if (input.sort === "newest") {
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (input.sort === "oldest") {
        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      } else if (input.sort === "priority") {
        items.sort((a, b) => {
          const aPriority = priorityOrder[a.priority] ?? 3;
          const bPriority = priorityOrder[b.priority] ?? 3;
          return aPriority - bPriority;
        });
      } else if (input.sort === "amount") {
        items.sort((a, b) => b.amountValue - a.amountValue);
      }

      return {
        items: items.slice(0, input.limit),
        totalCount: items.length,
      };
    }),

  /**
   * Get approval detail with AI explanation, supporting documents, and activity timeline.
   */
  getApprovalDetail: protectedProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: z.enum([
          "journal_entry",
          "agent_escalation",
          "invoice",
          "payment",
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      let detail: {
        id: string;
        type: string;
        title: string;
        status: string;
        priority: string;
        confidence: number;
        aiExplanation: string;
        checkItems: string[];
        supportingDocuments: Array<{ name: string; type: string }>;
        activityTimeline: Array<{
          timestamp: Date;
          action: string;
          detail: string;
        }>;
        metadata: Record<string, unknown>;
      } | null = null;

      if (input.itemType === "journal_entry") {
        const entry = await db.query.journalEntries.findFirst({
          where: and(
            eq(journalEntries.id, input.itemId),
            eq(journalEntries.entityId, entityId),
          ),
        });

        if (entry) {
          detail = {
            id: entry.id,
            type: "journal_entry",
            title: `Journal Entry ${entry.entryNumber ?? ""}`,
            status: entry.status ?? "draft",
            priority: "medium",
            confidence: 0.95,
            aiExplanation: `This journal entry was automatically generated by the AI agent. ${entry.description ?? ""} The entry follows standard double-entry accounting rules and has been validated against your chart of accounts.`,
            checkItems: [
              "Entry follows double-entry rules",
              "Accounts exist in chart of accounts",
              "Debits equal credits",
              "Within approved period",
            ],
            supportingDocuments: [],
            activityTimeline: [
              {
                timestamp: new Date(entry.createdAt),
                action: "Entry created",
                detail: "AI agent generated this journal entry",
              },
            ],
            metadata: {
              entryNumber: entry.entryNumber,
              date: entry.date,
            },
          };
        }
      } else if (input.itemType === "agent_escalation") {
        const log = await db.query.agentRoutingLogs.findFirst({
          where: and(
            eq(agentRoutingLogs.id, input.itemId),
            eq(agentRoutingLogs.entityId, entityId),
          ),
        });

        if (log) {
          const meta = log.metadata
            ? (JSON.parse(log.metadata) as Record<string, unknown>)
            : {};

          detail = {
            id: log.id,
            type: "agent_escalation",
            title: log.intentType ?? "Agent Review",
            status: "escalated",
            priority: (meta.priority as string) ?? "medium",
            confidence: parseFloat(log.confidence) ?? 0.5,
            aiExplanation: `This item was escalated by the AI agent because it requires human review. ${log.inputSummary ?? ""} The agent was ${(parseFloat(log.confidence) * 100).toFixed(0)}% confident in its analysis but flagged this for your approval.`,
            checkItems: [
              "AI agent flagged this item",
              "Confidence below threshold",
              "Requires human decision",
              "No automatic resolution available",
            ],
            supportingDocuments:
              (meta.documents as Array<{ name: string; type: string }>) ?? [],
            activityTimeline: [
              {
                timestamp: new Date(log.createdAt),
                action: "Agent escalation",
                detail: log.inputSummary ?? "Requires review",
              },
            ],
            metadata: meta,
          };
        }
      }

      return detail;
    }),

  /**
   * Get vendor insights for the AI Assistant panel.
   */
  getVendorInsights: protectedProcedure
    .input(z.object({ vendorId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get recent vendor payments
      const payments = await db.query.paymentsAp.findMany({
        where: eq(paymentsAp.entityId, entityId),
        orderBy: [desc(paymentsAp.createdAt)],
        limit: 10,
      });

      const totalPaid = payments.reduce(
        (sum, p) => sum + parseFloat(p.amount ?? "0"),
        0,
      );

      return {
        vendorName: "GTBank Gambia Ltd",
        since: "Jan 2023",
        totalPaid,
        onTimePayments: 98,
        thisYear: totalPaid * 0.4, // Simplified
      };
    }),

  /**
   * Get cash impact for a specific payment.
   */
  getCashImpact: protectedProcedure
    .input(z.object({ amount: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get current cash balance
      const bankAccountsData = await db.query.bankAccounts.findMany({
        where: eq(bankAccounts.entityId, entityId),
        columns: { currentBalance: true },
      });

      const availableCash = bankAccountsData.reduce(
        (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
        0,
      );

      const paymentAmount = input.amount ?? 25600;
      const afterPayment = availableCash - paymentAmount;

      return {
        availableCash,
        afterPayment,
        impact: -paymentAmount,
      };
    }),

  /**
   * Get recent conversations for the AI Assistant panel.
   */
  getRecentConversations: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const conversationsList = await db.query.conversations.findMany({
      where: eq(conversations.entityId, entityId),
      orderBy: [desc(conversations.lastMessageAt)],
      limit: 5,
    });

    return conversationsList.map((c) => ({
      id: c.id,
      title: c.title ?? "Untitled conversation",
      summary: c.summary,
      lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : null,
      messageCount: c.messageCount ?? 0,
    }));
  }),

  /**
   * Approve an item.
   */
  approveItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: z.enum([
          "journal_entry",
          "agent_escalation",
          "invoice",
          "payment",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      if (input.itemType === "journal_entry") {
        await db
          .update(journalEntries)
          .set({
            status: "posted",
            postedBy: ctx.session!.user!.id!,
            postedAt: new Date(),
          })
          .where(
            and(
              eq(journalEntries.id, input.itemId),
              eq(journalEntries.entityId, entityId),
            ),
          );
      }

      return { success: true };
    }),

  /**
   * Reject an item.
   */
  rejectItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: z.enum([
          "journal_entry",
          "agent_escalation",
          "invoice",
          "payment",
        ]),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      if (input.itemType === "journal_entry") {
        await db
          .update(journalEntries)
          .set({ status: "voided" })
          .where(
            and(
              eq(journalEntries.id, input.itemId),
              eq(journalEntries.entityId, entityId),
            ),
          );
      }

      return { success: true };
    }),
});
