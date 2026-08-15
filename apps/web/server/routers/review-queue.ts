import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  reviewItems,
  reviewItemActions,
  reviewItemHistory,
  reviewItemEvidence,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProcedure } from "@/lib/trpc/server";

export const reviewQueueRouter = router({
  // Get dashboard overview with KPIs and items
  getOverview: adminProcedure
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
  getDetail: adminProcedure
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
  performAction: adminProcedure
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

  // Seed demo data
  seedDemoData: adminProcedure.mutation(async () => {
    // Clear existing data
    await db.delete(reviewItemEvidence);
    await db.delete(reviewItemHistory);
    await db.delete(reviewItemActions);
    await db.delete(reviewItems);

    const demoItems = [
      {
        title: "Unmatched Bank Transaction",
        description:
          "A bank transaction for D150,000 on May 15, 2025 could not be matched to any existing record.",
        type: "data_validation" as const,
        priority: "high" as const,
        status: "pending" as const,
        agentId: "reconciliation-agent",
        runId: "RUN-3F8T7A",
        organizationId: "org-acme",
        slaBreached: true,
        aiRecommendation:
          'No exact match found. Possible match with reference "REF-INV-1234" dated May 14, 2025 (D145,000). Please confirm or create new record.',
        contextData: JSON.stringify({
          transactionAmount: 150000,
          transactionDate: "2025-05-15",
        }),
      },
      {
        title: "Vendor Name Ambiguous",
        description: "Multiple vendors match this name",
        type: "entity_resolution" as const,
        priority: "medium" as const,
        status: "pending" as const,
        agentId: "ap-agent",
        organizationId: "org-power",
        slaBreached: false,
        aiRecommendation:
          "Found 3 vendors with similar names. Please select the correct one.",
      },
      {
        title: "Invoice Total Mismatch",
        description: "Invoice total does not match extracted amount",
        type: "data_validation" as const,
        priority: "high" as const,
        status: "pending" as const,
        agentId: "invoice-agent",
        organizationId: "org-gtm",
        slaBreached: true,
        aiRecommendation:
          "Invoice total D25,000 does not match line items total D24,500. Difference of D500.",
      },
      {
        title: "Duplicate Payment Detected",
        description: "Possible duplicate payment found",
        type: "duplicate_detection" as const,
        priority: "medium" as const,
        status: "pending" as const,
        agentId: "payments-agent",
        organizationId: "org-bakau",
        slaBreached: false,
        aiRecommendation:
          'Payment of D50,000 to "ABC Supplies" on May 16 matches payment on May 10.',
      },
      {
        title: "Chart of Accounts Suggestion",
        description: "New account suggested by AI",
        type: "configuration" as const,
        priority: "low" as const,
        status: "pending" as const,
        agentId: "bookkeeping-agent",
        organizationId: "org-health",
        slaBreached: false,
        aiRecommendation:
          'Suggest adding account "6100 - Professional Fees" based on transaction patterns.',
      },
      {
        title: "Tax Code Uncertain",
        description: "Uncertain tax code classification",
        type: "compliance" as const,
        priority: "high" as const,
        status: "escalated" as const,
        agentId: "tax-agent",
        organizationId: "org-africell",
        slaBreached: true,
        aiRecommendation:
          "Unable to determine correct tax code for this transaction type.",
      },
      {
        title: "Missing Supporting Document",
        description: "Required document not found",
        type: "missing_data" as const,
        priority: "medium" as const,
        status: "pending" as const,
        agentId: "document-agent",
        organizationId: "org-delta",
        slaBreached: false,
        aiRecommendation: "Purchase order PO-4521 is missing attached invoice.",
      },
      {
        title: "Journal Entry Approval",
        description: "AI generated journal entry requires approval",
        type: "approval" as const,
        priority: "medium" as const,
        status: "pending" as const,
        agentId: "bookkeeping-agent",
        organizationId: "org-indigo",
        slaBreached: false,
        aiRecommendation:
          "Journal entry for depreciation of D12,500 requires approval.",
      },
      {
        title: "Payroll Anomaly Detected",
        description: "Unusual payroll amount detected",
        type: "anomaly" as const,
        priority: "high" as const,
        status: "pending" as const,
        agentId: "payroll-agent",
        organizationId: "org-omc",
        slaBreached: true,
        aiRecommendation:
          "Salary for employee EMP-1234 is 3x the average for their position.",
      },
      {
        title: "Currency Conversion Review",
        description: "High value currency conversion",
        type: "review" as const,
        priority: "low" as const,
        status: "pending" as const,
        agentId: "cash-agent",
        organizationId: "org-sunu",
        slaBreached: false,
        aiRecommendation:
          "USD to GMD conversion of $50,000 at rate 67.5. Rate differs from market rate.",
      },
    ];

    const insertedItems = await db
      .insert(reviewItems)
      .values(demoItems)
      .returning();

    // Add some actions
    if (insertedItems.length > 0) {
      await db.insert(reviewItemActions).values([
        {
          reviewItemId: insertedItems[0].id,
          action: "request_more_info",
          performedBy: "admin",
          notes: "Need to verify transaction details with bank.",
        },
      ]);
    }

    return { success: true, count: demoItems.length };
  }),
});
