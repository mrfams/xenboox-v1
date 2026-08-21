import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  autoApproveRules,
  autoApproveLog,
  approvals,
} from "@xenboox/db/schema";

import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Auto-Approve Router ───────────────────────────────────────────────────
//
// Smart approval automation. The AI learns from approval patterns and
// suggests rules. Rules have conditions, spending limits, and confidence
// thresholds. Every auto-approval is logged for audit trail.

export const autoApproveRouter = router({
  /**
   * Get all auto-approve rules for the entity.
   */
  getRules: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const rules = await db
      .select()
      .from(autoApproveRules)
      .where(eq(autoApproveRules.entityId, entityId))
      .orderBy(desc(autoApproveRules.triggerCount));

    return rules;
  }),

  /**
   * Get auto-approve log (audit trail).
   */
  getLog: rlsProtectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const logs = await db
        .select()
        .from(autoApproveLog)
        .where(eq(autoApproveLog.entityId, entityId))
        .orderBy(desc(autoApproveLog.approvedAt))
        .limit(input.limit)
        .offset(input.offset);

      const totalCount = await db
        .select({ count: count() })
        .from(autoApproveLog)
        .where(eq(autoApproveLog.entityId, entityId));

      return {
        logs,
        total: totalCount[0]?.count ?? 0,
      };
    }),

  /**
   * Get stats for the auto-approve dashboard.
   */
  getStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const totalRules = await db
      .select({ count: count() })
      .from(autoApproveRules)
      .where(eq(autoApproveRules.entityId, entityId));

    const activeRules = await db
      .select({ count: count() })
      .from(autoApproveRules)
      .where(
        and(
          eq(autoApproveRules.entityId, entityId),
          eq(autoApproveRules.isActive, true),
        ),
      );

    const totalAutoApproved = await db
      .select({ count: count() })
      .from(autoApproveLog)
      .where(
        and(
          eq(autoApproveLog.entityId, entityId),
          sql`${autoApproveLog.action} = 'auto_approved'`,
        ),
      );

    const totalEscalated = await db
      .select({ count: count() })
      .from(autoApproveLog)
      .where(
        and(
          eq(autoApproveLog.entityId, entityId),
          sql`${autoApproveLog.action} = 'escalated'`,
        ),
      );

    const pendingApprovals = await db
      .select({ count: count() })
      .from(approvals)
      .where(
        and(eq(approvals.entityId, entityId), eq(approvals.status, "pending")),
      );

    return {
      totalRules: totalRules[0]?.count ?? 0,
      activeRules: activeRules[0]?.count ?? 0,
      totalAutoApproved: totalAutoApproved[0]?.count ?? 0,
      totalEscalated: totalEscalated[0]?.count ?? 0,
      pendingApprovals: pendingApprovals[0]?.count ?? 0,
    };
  }),

  /**
   * Create a new auto-approve rule.
   */
  createRule: rlsMutateProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        conditions: z.object({
          approvalType: z.string().optional(),
          minAmount: z.number().optional(),
          maxAmount: z.number().optional(),
          targetRecordType: z.string().optional(),
          agentName: z.string().optional(),
          accountCodes: z.array(z.string()).optional(),
          vendors: z.array(z.string()).optional(),
          keywords: z.array(z.string()).optional(),
        }),
        action: z
          .enum(["auto_approve", "auto_approve_with_limit", "escalate"])
          .default("auto_approve"),
        maxAmount: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const [rule] = await db
        .insert(autoApproveRules)
        .values({
          entityId,
          name: input.name,
          description: input.description,
          conditions: input.conditions,
          action: input.action,
          maxAmount: input.maxAmount?.toString(),
          createdBy: "user",
          confidence: "1.0",
        })
        .returning();

      return rule;
    }),

  /**
   * AI-suggest rules based on approval history.
   */
  suggestRules: rlsMutateProcedure.mutation(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Analyze approval history
    const recentApprovals = await db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.entityId, entityId),
          sql`${approvals.status} IN ('approved', 'pending')`,
        ),
      )
      .orderBy(desc(approvals.createdAt))
      .limit(100);

    // Group by type and analyze patterns
    const typeGroups: Record<
      string,
      { count: number; total: number; alwaysApproved: boolean }
    > = {};

    for (const approval of recentApprovals) {
      const type = approval.approvalType;
      if (!typeGroups[type]) {
        typeGroups[type] = { count: 0, total: 0, alwaysApproved: true };
      }
      typeGroups[type].count++;
      if (approval.status === "pending") {
        typeGroups[type].alwaysApproved = false;
      }
    }

    // Generate suggestions for types that are always approved
    const suggestions: Array<{
      name: string;
      description: string;
      conditions: Record<string, unknown>;
      confidence: number;
    }> = [];

    for (const [type, data] of Object.entries(typeGroups)) {
      if (data.alwaysApproved && data.count >= 3) {
        suggestions.push({
          name: `Auto-approve ${type.replace(/_/g, " ")}`,
          description: `Auto-approve ${type} transactions based on ${data.count} historical approvals`,
          conditions: { approvalType: type },
          confidence: Math.min(0.9, 0.5 + data.count * 0.05),
        });
      }
    }

    // Create suggested rules
    const createdRules = [];
    for (const suggestion of suggestions) {
      // Check if rule already exists
      const existing = await db
        .select()
        .from(autoApproveRules)
        .where(
          and(
            eq(autoApproveRules.entityId, entityId),
            sql`${autoApproveRules.conditions}->>'approvalType' = ${suggestion.conditions.approvalType as string}`,
          ),
        );

      if (existing.length === 0) {
        const [rule] = await db
          .insert(autoApproveRules)
          .values({
            entityId,
            name: suggestion.name,
            description: suggestion.description,
            conditions: suggestion.conditions,
            action: "auto_approve",
            createdBy: "ai",
            confidence: suggestion.confidence.toString(),
            learnedFrom: suggestion.conditions.approvalType
              ? (typeGroups[suggestion.conditions.approvalType as string]
                  ?.count ?? 0)
              : 0,
          })
          .returning();

        createdRules.push(rule);
      }
    }

    return {
      suggestions,
      created: createdRules.length,
      rules: createdRules,
    };
  }),

  /**
   * Toggle a rule's active status.
   */
  toggleRule: rlsMutateProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const rule = await db
        .select()
        .from(autoApproveRules)
        .where(
          and(
            eq(autoApproveRules.id, input.ruleId),
            eq(autoApproveRules.entityId, entityId),
          ),
        );

      if (rule.length === 0) {
        throw new Error("Rule not found");
      }

      const [updated] = await db
        .update(autoApproveRules)
        .set({ isActive: !rule[0].isActive })
        .where(eq(autoApproveRules.id, input.ruleId))
        .returning();

      return updated;
    }),

  /**
   * Delete a rule.
   */
  deleteRule: rlsMutateProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      await db
        .delete(autoApproveRules)
        .where(
          and(
            eq(autoApproveRules.id, input.ruleId),
            eq(autoApproveRules.entityId, entityId),
          ),
        );

      return { success: true };
    }),

  /**
   * Check if an approval should be auto-approved.
   * Called by the approval pipeline before showing to user.
   */
  checkAutoApprove: rlsProtectedProcedure
    .input(
      z.object({
        approvalType: z.string(),
        targetRecordType: z.string(),
        amount: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get active rules
      const rules = await db
        .select()
        .from(autoApproveRules)
        .where(
          and(
            eq(autoApproveRules.entityId, entityId),
            eq(autoApproveRules.isActive, true),
          ),
        );

      // Check each rule
      for (const rule of rules) {
        const conditions = rule.conditions as Record<string, unknown>;

        // Check approval type match
        if (
          conditions.approvalType &&
          conditions.approvalType !== input.approvalType
        ) {
          continue;
        }

        // Check target record type match
        if (
          conditions.targetRecordType &&
          conditions.targetRecordType !== input.targetRecordType
        ) {
          continue;
        }

        // Check amount limits
        if (input.amount !== undefined) {
          if (
            conditions.minAmount &&
            input.amount < (conditions.minAmount as number)
          ) {
            continue;
          }
          if (
            conditions.maxAmount &&
            input.amount > (conditions.maxAmount as number)
          ) {
            continue;
          }
          if (rule.maxAmount && input.amount > parseFloat(rule.maxAmount)) {
            continue;
          }
        }

        // Rule matched!
        return {
          shouldAutoApprove: true,
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          confidence: parseFloat(rule.confidence ?? "0.5"),
        };
      }

      return {
        shouldAutoApprove: false,
        ruleId: null,
        ruleName: null,
        action: null,
        confidence: 0,
      };
    }),
});
