import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import {
  consolidationRuns,
  eliminationEntries,
  minorityInterestRecords,
  entityRelationships,
  intercompanyTags,
} from "@xenboox/db/schema";
import { entities } from "@xenboox/db/schema/organization";
import {
  runConsolidationPipeline,
  getConsolidationStatus,
  approveConsolidationRun,
  createEntityRelationship,
  listEntityRelationships,
} from "@xenboox/agents";
import {
  handleMutationError,
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "@/lib/trpc/server";

export const consolidationRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityCtx = await db.query.entities.findFirst({
        where: eq(entities.id, ctx.entityId!),
      });

      if (!entityCtx) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entity not found",
        });
      }

      try {
        const result = await runConsolidationPipeline({
          entityId: ctx.entityId!,
          organizationId: entityCtx.organizationId,
          period: input.period,
          userId: ctx.session!.user!.id!,
        });

        return {
          success: result.success,
          period: result.period,
          subsidiaries: result.subsidiaries,
          icTransactions: result.icTransactions.length,
          eliminations: result.eliminations.length,
          translations: result.translations.length,
          minorityInterests: result.minorityInterests.length,
          consolidatedTotals: result.consolidatedTotals,
          integrityCheckPassed: result.integrityCheckPassed,
          stepsCompleted: result.steps.filter((s) =>
            ["completed", "skipped"].includes(s.status),
          ).length,
          totalSteps: result.steps.length,
          stepDetails: result.steps.map((s) => ({
            id: s.id,
            label: s.label,
            status: s.status,
            agent: s.agent,
          })),
          errors: result.errors,
          warnings: result.warnings,
        };
      } catch (error) {
        handleMutationError(error, "Consolidation pipeline failed");
      }
    }),

  // ── Controller Sign-off ─────────────────────────────────────────────

  approveRun: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        runId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the run is in reviewing status before approving
      const run = await db.query.consolidationRuns.findFirst({
        where: and(
          eq(consolidationRuns.id, input.runId),
          eq(consolidationRuns.parentEntityId, ctx.entityId!),
        ),
      });

      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Consolidation run not found",
        });
      }

      if (run.status !== "reviewing") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            run.status === "completed"
              ? "This consolidation run has already been approved"
              : `Cannot approve run with status "${run.status}". Run must be in "reviewing" status.`,
        });
      }

      try {
        await approveConsolidationRun({
          runId: input.runId,
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to approve consolidation run");
      }
    }),

  // ── Pipeline Status ─────────────────────────────────────────────────

  getStatus: protectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getConsolidationStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── Pipeline Runs History ───────────────────────────────────────────

  listRuns: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).default(10) }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.consolidationRuns.findMany({
        where: eq(consolidationRuns.parentEntityId, ctx.entityId!),
        orderBy: [desc(consolidationRuns.createdAt)],
        limit: input?.limit ?? 10,
      });
    }),

  // ── Entity Relationships ────────────────────────────────────────────

  listRelationships: protectedProcedure.query(async ({ ctx }) => {
    return listEntityRelationships({ entityId: ctx.entityId! });
  }),

  createRelationship: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        subsidiaryEntityId: z.string().uuid(),
        ownershipPct: z.number().min(0.01).max(100),
        currency: z.string().length(3).default("GMD"),
        consolidationMethod: z
          .enum(["full", "equity", "proportional"])
          .default("full"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await createEntityRelationship({
          parentEntityId: ctx.entityId!,
          subsidiaryEntityId: input.subsidiaryEntityId,
          ownershipPct: input.ownershipPct,
          currency: input.currency,
          consolidationMethod: input.consolidationMethod,
          notes: input.notes,
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to create entity relationship");
      }
    }),

  // ── Available Subsidiaries (entities within same org not yet linked) ─

  listAvailableSubsidiaries: protectedProcedure.query(async ({ ctx }) => {
    const entityCtx = await db.query.entities.findFirst({
      where: eq(entities.id, ctx.entityId!),
    });
    if (!entityCtx) return [];

    // Get all entities in the same org
    const allEntities = await db.query.entities.findMany({
      where: and(
        eq(entities.organizationId, entityCtx.organizationId),
        eq(entities.isActive, true),
      ),
    });

    // Get already-linked subsidiaries
    const existingRels = await db.query.entityRelationships.findMany({
      where: eq(entityRelationships.parentEntityId, ctx.entityId!),
    });
    const linkedIds = new Set(existingRels.map((r) => r.subsidiaryEntityId));
    linkedIds.add(ctx.entityId!); // Exclude self

    return allEntities.filter((e) => !linkedIds.has(e.id));
  }),

  // ── Elimination Entries ─────────────────────────────────────────────

  listEliminations: protectedProcedure
    .input(
      z
        .object({
          runId: z.string().uuid().optional(),
          type: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = input?.runId
        ? [eq(eliminationEntries.consolidationRunId, input.runId)]
        : [eq(eliminationEntries.entityId, ctx.entityId!)];

      if (input?.type) {
        where.push(eq(eliminationEntries.eliminationType, input.type));
      }

      return db.query.eliminationEntries.findMany({
        where: and(...where),
        orderBy: [desc(eliminationEntries.createdAt)],
        limit: input?.limit ?? 50,
        with: { entity: true, counterparty: true },
      });
    }),

  // ── Minority Interest Records ───────────────────────────────────────

  listMinorityInterests: protectedProcedure
    .input(
      z
        .object({
          runId: z.string().uuid(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = input?.runId
        ? [eq(minorityInterestRecords.consolidationRunId, input.runId)]
        : [eq(minorityInterestRecords.subsidiaryEntityId, ctx.entityId!)];

      return db.query.minorityInterestRecords.findMany({
        where: and(...where),
        orderBy: [desc(minorityInterestRecords.period)],
        with: {
          subsidiary: { columns: { id: true, name: true, currency: true } },
        },
      });
    }),

  // ── Inter-Company Tags ──────────────────────────────────────────────

  listICTags: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.intercompanyTags.findMany({
        where: and(
          eq(intercompanyTags.entityId, ctx.entityId!),
          isNull(intercompanyTags.reversedAt),
        ),
        orderBy: [desc(intercompanyTags.taggedAt)],
        limit: input?.limit ?? 20,
        with: { counterparty: { columns: { id: true, name: true } } },
      });
    }),
});
