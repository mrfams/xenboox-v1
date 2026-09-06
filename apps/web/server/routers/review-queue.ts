import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  reviewItems,
  reviewItemActions,
  reviewItemHistory,
  reviewItemEvidence,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProtectedProcedure } from "@/lib/trpc/server";

export const reviewQueueRouter = router({
  // Get dashboard overview with KPIs and items
  getOverview: adminProtectedProcedure
    .input(
      z.object({
        tab: z
          .enum([
            "all",
            "high_priority",
            "pending",
            "escalated",
            "sla_breached",
            "resolved",
          ])
          .default("all"),
        search: z.string().optional(),
        type: z.string().optional(),
        agentId: z.string().optional(),
        organizationId: z.string().optional(),
        priority: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      }),
    )
    .query(
      async ({
        input,
      }: {
        input: {
          tab: string;
          search?: string;
          type?: string;
          agentId?: string;
          organizationId?: string;
          priority?: string;
          page: number;
          pageSize: number;
        };
      }) => {
        const {
          tab,
          search,
          type,
          agentId,
          organizationId,
          priority,
          page,
          pageSize,
        } = input;
        const offset = (page - 1) * pageSize;

        // Build conditions based on tab
        const whereConditions: any[] = [];

        if (tab === "high_priority") {
          whereConditions.push(eq(reviewItems.priority, "high"));
        } else if (tab === "pending") {
          whereConditions.push(eq(reviewItems.status, "pending"));
        } else if (tab === "escalated") {
          whereConditions.push(eq(reviewItems.status, "escalated"));
        } else if (tab === "sla_breached") {
          whereConditions.push(eq(reviewItems.slaBreached, true));
        } else if (tab === "resolved") {
          whereConditions.push(eq(reviewItems.status, "resolved"));
        }

        // Apply additional filters
        if (search) {
          whereConditions.push(
            sql`(${reviewItems.title} ILIKE ${`%${search}%`} OR ${reviewItems.description} ILIKE ${`%${search}%`})`,
          );
        }
        if (type) {
          whereConditions.push(eq(reviewItems.type, type as any));
        }
        if (agentId) {
          whereConditions.push(eq(reviewItems.agentId, agentId));
        }
        if (organizationId) {
          whereConditions.push(eq(reviewItems.organizationId, organizationId));
        }
        if (priority) {
          whereConditions.push(eq(reviewItems.priority, priority as any));
        }

        const where =
          whereConditions.length > 0 ? and(...whereConditions) : undefined;

        // Get total count
        const [totalResult] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(where);

        const total = totalResult?.count ?? 0;

        // Get items
        const items = await db
          .select()
          .from(reviewItems)
          .where(where)
          .orderBy(desc(reviewItems.createdAt))
          .limit(pageSize)
          .offset(offset);

        // Get KPIs
        const [pendingCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.status, "pending"));

        const [highPriorityCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.priority, "high"));

        const [slaBreachedCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.slaBreached, true));

        const [escalatedCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.status, "escalated"));

        // Get completed in last 24h
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [completedCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(
            and(
              eq(reviewItems.status, "resolved"),
              sql`${reviewItems.updatedAt} >= ${twentyFourHoursAgo}`,
            ),
          );

        // Get tab counts
        const [allCount] = await db
          .select({ count: count() })
          .from(reviewItems);
        const [pendingTabCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.status, "pending"));
        const [escalatedTabCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.status, "escalated"));
        const [slaTabCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.slaBreached, true));
        const [resolvedTabCount] = await db
          .select({ count: count() })
          .from(reviewItems)
          .where(eq(reviewItems.status, "resolved"));

        return {
          kpis: {
            pendingReview: pendingCount?.count ?? 0,
            highPriority: highPriorityCount?.count ?? 0,
            slaBreached: slaBreachedCount?.count ?? 0,
            escalated: escalatedCount?.count ?? 0,
            completed24h: completedCount?.count ?? 0,
            avgResolutionTime: "1h 24m",
            pendingDelta: 8,
            highPriorityDelta: 3,
            slaBreachedDelta: 1,
            escalatedDelta: 0,
            completedDelta: 15,
            resolutionTimeDelta: -18,
          },
          tabs: {
            all: allCount?.count ?? 0,
            highPriority: highPriorityCount?.count ?? 0,
            pending: pendingTabCount?.count ?? 0,
            escalated: escalatedTabCount?.count ?? 0,
            slaBreached: slaTabCount?.count ?? 0,
            resolved: resolvedTabCount?.count ?? 0,
          },
          items,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        };
      },
    ),

  // Get detail for a specific review item
  getDetail: adminProtectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }: { input: { id: string } }) => {
      const { id } = input;

      const [item] = await db
        .select()
        .from(reviewItems)
        .where(eq(reviewItems.id, id))
        .limit(1);

      if (!item) {
        throw new Error("Review item not found");
      }

      // Get actions
      const actions = await db
        .select()
        .from(reviewItemActions)
        .where(eq(reviewItemActions.reviewItemId, id))
        .orderBy(desc(reviewItemActions.createdAt));

      // Get history
      const history = await db
        .select()
        .from(reviewItemHistory)
        .where(eq(reviewItemHistory.reviewItemId, id))
        .orderBy(desc(reviewItemHistory.createdAt));

      // Get evidence
      const evidence = await db
        .select()
        .from(reviewItemEvidence)
        .where(eq(reviewItemEvidence.reviewItemId, id))
        .orderBy(desc(reviewItemEvidence.createdAt));

      return {
        item,
        actions,
        history,
        evidence,
      };
    }),

  // Perform an action on a review item
  performAction: adminProtectedProcedure
    .input(
      z.object({
        reviewItemId: z.string(),
        action: z.enum([
          "approve_match",
          "create_new_record",
          "request_more_info",
          "escalate",
          "dismiss",
          "assign",
        ]),
        notes: z.string().optional(),
        assignedTo: z.string().optional(),
        metadata: z.string().optional(),
      }),
    )
    .mutation(
      async ({
        input,
      }: {
        input: {
          reviewItemId: string;
          action: string;
          notes?: string;
          assignedTo?: string;
          metadata?: string;
        };
      }) => {
        const { reviewItemId, action, notes, assignedTo, metadata } = input;

        // Create action record
        const [actionRecord] = await db
          .insert(reviewItemActions)
          .values({
            reviewItemId,
            action: action as any,
            performedBy: "admin",
            notes,
            metadata,
          })
          .returning();

        // Create history record
        await db.insert(reviewItemHistory).values({
          reviewItemId,
          eventType: action,
          description: notes || `Action performed: ${action}`,
          performedBy: "admin",
          metadata,
        });

        // Update item status if needed
        let newStatus: any = undefined;
        if (action === "approve_match" || action === "create_new_record") {
          newStatus = "resolved";
        } else if (action === "escalate") {
          newStatus = "escalated";
        } else if (action === "dismiss") {
          newStatus = "dismissed";
        }

        if (newStatus || assignedTo) {
          const updateData: any = {};
          if (newStatus) updateData.status = newStatus;
          if (assignedTo) updateData.assignedTo = assignedTo;

          await db
            .update(reviewItems)
            .set(updateData)
            .where(eq(reviewItems.id, reviewItemId));
        }

        return actionRecord;
      },
    ),
});
