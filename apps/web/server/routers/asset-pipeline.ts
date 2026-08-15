import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import {
  assetPipelineRuns,
  assetVerifications,
  assetDisposalRecords,
  fixedAssets,
  depreciationSchedule,
} from "@xenboox/db/schema";
import { runAssetPipeline, getAssetPipelineStatus } from "@xenboox/agents";
import { entities } from "@xenboox/db/schema/organization";

import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Asset Pipeline Router ─────────────────────────────────────────────────

export const assetPipelineRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        triggerSource: z
          .enum(["manual", "scheduled", "close_pipeline", "agent"])
          .default("manual"),
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
        const result = await runAssetPipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.name ?? "Entity",
          currency: entityCtx.currency ?? "GMD",
          period: input.period,
          userId: ctx.session!.user!.id!,
          triggerSource: input.triggerSource,
        });

        return {
          success: result.success,
          period: result.period,
          assetsScanned: result.assetsScanned,
          depreciationCount: result.depreciationCount,
          depreciationTotal: result.depreciationTotal,
          verificationDueCount: result.verificationDueCount,
          disposalFlags: result.disposalFlags.length,
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
        handleMutationError(error, "Asset pipeline failed");
      }
    }),

  // ── Pipeline Status ─────────────────────────────────────────────────

  getStatus: rlsProtectedProcedure
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
      return getAssetPipelineStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── Pipeline Runs ───────────────────────────────────────────────────

  listPipelineRuns: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.assetPipelineRuns.findMany({
        where: eq(assetPipelineRuns.entityId, ctx.entityId!),
        orderBy: [desc(assetPipelineRuns.createdAt)],
        limit: input?.limit ?? 10,
      });
    }),

  // ── Verifications ───────────────────────────────────────────────────

  listVerifications: rlsProtectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(assetVerifications.entityId, ctx.entityId!)];
      if (input?.status)
        where.push(eq(assetVerifications.status, input.status));

      return db.query.assetVerifications.findMany({
        where: and(...where),
        orderBy: [desc(assetVerifications.scheduledDate)],
        limit: input?.limit ?? 20,
        with: { fixedAsset: true },
      });
    }),

  completeVerification: rlsMutateProcedure
    .input(
      z.object({
        verificationId: z.string().uuid(),
        conditionConfirmed: z.string().optional(),
        locationConfirmed: z.string().optional(),
        responsiblePersonConfirmed: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [updated] = await db
          .update(assetVerifications)
          .set({
            status: "verified",
            verifiedDate: new Date(),
            verifiedBy: ctx.session!.user!.name ?? ctx.session!.user!.email!,
            conditionConfirmed: input.conditionConfirmed,
            locationConfirmed: input.locationConfirmed,
            responsiblePersonConfirmed: input.responsiblePersonConfirmed,
            notes: input.notes,
          })
          .where(
            and(
              eq(assetVerifications.id, input.verificationId),
              eq(assetVerifications.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Verification record not found",
          });
        }

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to complete verification");
      }
    }),

  // ── Disposal Records ────────────────────────────────────────────────

  listDisposalRecords: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.assetDisposalRecords.findMany({
        where: eq(assetDisposalRecords.entityId, ctx.entityId!),
        orderBy: [desc(assetDisposalRecords.createdAt)],
        limit: input?.limit ?? 20,
        with: { fixedAsset: true },
      });
    }),

  createDisposalRecord: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        fixedAssetId: z.string().uuid(),
        disposalDate: z.string(),
        disposalMethod: z.enum(["sold", "scrapped", "donated", "written_off"]),
        disposalProceeds: z.string().default("0"),
        reason: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the current asset to calculate gain/loss
        const asset = await db.query.fixedAssets.findFirst({
          where: and(
            eq(fixedAssets.id, input.fixedAssetId),
            eq(fixedAssets.entityId, ctx.entityId!),
          ),
        });

        if (!asset) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Asset not found",
          });
        }

        const nbv = Number(asset.netBookValue);
        const proceeds = Number(input.disposalProceeds);
        const gainOrLoss = proceeds - nbv;

        const [record] = await db
          .insert(assetDisposalRecords)
          .values({
            entityId: ctx.entityId!,
            fixedAssetId: input.fixedAssetId,
            disposalDate: input.disposalDate,
            disposalMethod: input.disposalMethod,
            disposalProceeds: input.disposalProceeds,
            netBookValueAtDisposal: nbv.toFixed(2),
            gainOrLoss: gainOrLoss.toFixed(2),
            approvedBy: ctx.session!.user!.name ?? ctx.session!.user!.email!,
            approvedAt: new Date(),
            reason: input.reason,
            notes: input.notes,
          })
          .returning();

        // Update asset status to disposed
        await db
          .update(fixedAssets)
          .set({
            status: "disposed",
            disposalDate: input.disposalDate,
            disposalMethod: input.disposalMethod,
            disposalProceeds: input.disposalProceeds,
          })
          .where(
            and(
              eq(fixedAssets.id, input.fixedAssetId),
              eq(fixedAssets.entityId, ctx.entityId!),
            ),
          );

        return record;
      } catch (error) {
        handleMutationError(error, "Failed to create disposal record");
      }
    }),

  // ── Depreciation Schedule ───────────────────────────────────────────

  listDepreciationSchedule: rlsProtectedProcedure
    .input(
      z
        .object({
          assetId: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(depreciationSchedule.entityId, ctx.entityId!)];
      if (input?.assetId)
        where.push(eq(depreciationSchedule.fixedAssetId, input.assetId));

      return db.query.depreciationSchedule.findMany({
        where: and(...where),
        orderBy: [desc(depreciationSchedule.createdAt)],
        limit: input?.limit ?? 50,
        with: { fixedAsset: true },
      });
    }),
});
