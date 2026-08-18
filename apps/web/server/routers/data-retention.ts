// ─── Data Retention Router ─────────────────────────────────────────────────
//
// Manages per-entity data retention policies: list, create, update, delete,
// and manual trigger of the purge job. All procedures are entity-scoped.

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  retentionPolicies,
  retentionPurgeLogs,
} from "@xenboox/db/schema/data-retention";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─── Input Schemas ────────────────────────────────────────────────────────

const createPolicySchema = z.object({
  tableName: z.string().min(1).max(255),
  retentionDays: z.number().int().min(1).max(3650).default(90),
  legalHold: z.boolean().default(false),
  enabled: z.boolean().default(true),
  retentionColumn: z.string().max(100).optional(),
  exclusionWhere: z.string().optional(),
  description: z.string().optional(),
});

const updatePolicySchema = z.object({
  id: z.string().uuid(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
  legalHold: z.boolean().optional(),
  enabled: z.boolean().optional(),
  retentionColumn: z.string().max(100).optional(),
  exclusionWhere: z.string().optional(),
  description: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const dataRetentionRouter = router({
  /**
   * List all retention policies for the current entity.
   */
  listPolicies: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const policies = await db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.entityId, entityId))
      .orderBy(desc(retentionPolicies.createdAt));

    return policies;
  }),

  /**
   * Get a single retention policy by ID.
   */
  getPolicy: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const policy = await db
        .select()
        .from(retentionPolicies)
        .where(
          and(
            eq(retentionPolicies.id, input.id),
            eq(retentionPolicies.entityId, entityId),
          ),
        )
        .limit(1);

      if (policy.length === 0) {
        throw new Error("Policy not found");
      }

      return policy[0];
    }),

  /**
   * Create a new retention policy for the current entity.
   */
  createPolicy: rlsProtectedProcedure
    .input(createPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const [policy] = await db
        .insert(retentionPolicies)
        .values({
          entityId,
          tableName: input.tableName,
          retentionDays: input.retentionDays,
          legalHold: input.legalHold,
          enabled: input.enabled,
          retentionColumn: input.retentionColumn ?? null,
          exclusionWhere: input.exclusionWhere ?? null,
          description: input.description ?? null,
          createdBy: ctx.userId ?? null,
        })
        .returning();

      logger.info(
        { entityId, policyId: policy.id, table: input.tableName },
        "data-retention: policy created",
      );

      return policy;
    }),

  /**
   * Update an existing retention policy.
   */
  updatePolicy: rlsProtectedProcedure
    .input(updatePolicySchema)
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const existing = await db
        .select({ id: retentionPolicies.id })
        .from(retentionPolicies)
        .where(
          and(
            eq(retentionPolicies.id, input.id),
            eq(retentionPolicies.entityId, entityId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Policy not found");
      }

      const updates: Record<string, unknown> = {};
      if (input.retentionDays !== undefined)
        updates.retentionDays = input.retentionDays;
      if (input.legalHold !== undefined) updates.legalHold = input.legalHold;
      if (input.enabled !== undefined) updates.enabled = input.enabled;
      if (input.retentionColumn !== undefined)
        updates.retentionColumn = input.retentionColumn;
      if (input.exclusionWhere !== undefined)
        updates.exclusionWhere = input.exclusionWhere;
      if (input.description !== undefined)
        updates.description = input.description;

      if (Object.keys(updates).length === 0) {
        throw new Error("No fields to update");
      }

      const [policy] = await db
        .update(retentionPolicies)
        .set(updates)
        .where(
          and(
            eq(retentionPolicies.id, input.id),
            eq(retentionPolicies.entityId, entityId),
          ),
        )
        .returning();

      logger.info(
        { entityId, policyId: policy.id, updates: Object.keys(updates) },
        "data-retention: policy updated",
      );

      return policy;
    }),

  /**
   * Delete a retention policy. Only allowed when legal hold is off.
   */
  deletePolicy: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const existing = await db
        .select({
          id: retentionPolicies.id,
          legalHold: retentionPolicies.legalHold,
        })
        .from(retentionPolicies)
        .where(
          and(
            eq(retentionPolicies.id, input.id),
            eq(retentionPolicies.entityId, entityId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Policy not found");
      }

      if (existing[0].legalHold) {
        throw new Error("Cannot delete a policy under legal hold");
      }

      await db
        .delete(retentionPolicies)
        .where(
          and(
            eq(retentionPolicies.id, input.id),
            eq(retentionPolicies.entityId, entityId),
          ),
        );

      logger.info(
        { entityId, policyId: input.id },
        "data-retention: policy deleted",
      );

      return { success: true };
    }),

  /**
   * List purge log entries for the current entity.
   */
  listPurgeLogs: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const logs = await db
        .select()
        .from(retentionPurgeLogs)
        .where(eq(retentionPurgeLogs.entityId, entityId))
        .orderBy(desc(retentionPurgeLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return logs;
    }),

  /**
   * Get purge statistics for the current entity.
   */
  getPurgeStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const policies = await db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.entityId, entityId));

    const recentLogs = await db
      .select()
      .from(retentionPurgeLogs)
      .where(eq(retentionPurgeLogs.entityId, entityId))
      .orderBy(desc(retentionPurgeLogs.createdAt))
      .limit(10);

    const totalPolicies = policies.length;
    const activePolicies = policies.filter((p) => p.enabled).length;
    const legalHoldPolicies = policies.filter((p) => p.legalHold).length;

    return {
      totalPolicies,
      activePolicies,
      legalHoldPolicies,
      recentLogs,
    };
  }),
});
