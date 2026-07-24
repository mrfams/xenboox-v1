import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import {
  analyticsSnapshots,
  detectedTrends,
  anomalyFlags,
  healthScores,
  forecastModels,
  benchmarkCohorts,
} from "@xenboox/db/schema/analytics";
import { runAnalyticsPipeline, getAnalyticsStatus } from "@xenboox/agents";
import { router, protectedProcedure, requireRole } from "../../lib/trpc/server";
import { entities } from "@xenboox/db/schema/organization";

// ─── Analytics Router ───────────────────────────────────────────────────────

export const analyticsRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: protectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        triggerSource: z
          .enum(["manual", "scheduled", "agent"])
          .default("manual"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityCtx = await db.query.entities.findFirst({
        where: eq(entities.id, ctx.entityId!),
      });

      if (!entityCtx) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
      }

      try {
        const result = await runAnalyticsPipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.name ?? "Entity",
          currency: entityCtx.currency ?? "GMD",
          period: input.period,
          userId: ctx.session!.user!.id!,
          triggerSource: input.triggerSource,
        });

        return {
          success: result.success,
          continuous: result.continuous,
          period: result.period,
          trendsDetected: result.trends.length,
          anomaliesDetected: result.anomalies.length,
          healthScore: result.healthScore?.overallScore ?? 0,
          healthTrend: result.healthScore?.trend ?? "stable",
          runwayMonths: result.forecast?.runwayMonths ?? 0,
          alertsGenerated: result.alerts.length,
          alertsRoutedToCfo: result.alerts.filter(
            (a) => a.routedTo === "cfo_agent",
          ).length,
          benchmarkSkipped: !result.benchmarkAvailable,
          yoYComparisons: result.yoYComparisons.length,
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
        const msg = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Analytics pipeline failed: ${msg}`,
        });
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
      return getAnalyticsStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── Snapshots ───────────────────────────────────────────────────────

  listSnapshots: protectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
          limit: z.number().min(1).max(100).default(12),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(analyticsSnapshots.entityId, ctx.entityId!)];
      if (input?.period)
        where.push(eq(analyticsSnapshots.period, input.period));

      return db.query.analyticsSnapshots.findMany({
        where: and(...where),
        orderBy: [desc(analyticsSnapshots.generatedAt)],
        limit: input?.limit ?? 12,
      });
    }),

  // ── Trends ──────────────────────────────────────────────────────────

  listTrends: protectedProcedure
    .input(
      z
        .object({
          dimension: z.string().optional(),
          trendType: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(detectedTrends.entityId, ctx.entityId!)];
      if (input?.dimension)
        where.push(eq(detectedTrends.dimension, input.dimension));
      if (input?.trendType)
        where.push(eq(detectedTrends.trendType, input.trendType));

      return db.query.detectedTrends.findMany({
        where: and(...where),
        orderBy: [desc(detectedTrends.detectedAt)],
        limit: input?.limit ?? 20,
      });
    }),

  // ── Anomaly Flags ───────────────────────────────────────────────────

  listAnomalies: protectedProcedure
    .input(
      z
        .object({
          severity: z.enum(["low", "medium", "high", "critical"]).optional(),
          anomalyType: z.string().optional(),
          acknowledged: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(anomalyFlags.entityId, ctx.entityId!)];
      if (input?.severity)
        where.push(eq(anomalyFlags.severity, input.severity));
      if (input?.anomalyType)
        where.push(eq(anomalyFlags.anomalyType, input.anomalyType));
      if (input?.acknowledged !== undefined)
        where.push(eq(anomalyFlags.acknowledged, input.acknowledged));

      return db.query.anomalyFlags.findMany({
        where: and(...where),
        orderBy: [desc(anomalyFlags.createdAt)],
        limit: input?.limit ?? 20,
      });
    }),

  acknowledgeAnomaly: protectedProcedure
    .input(
      z.object({
        anomalyId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(anomalyFlags)
        .set({
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: ctx.session!.user!.id!,
          notes: input.notes,
        })
        .where(
          and(
            eq(anomalyFlags.id, input.anomalyId),
            eq(anomalyFlags.entityId, ctx.entityId!),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Anomaly not found",
        });
      }

      return updated;
    }),

  // ── Health Scores ───────────────────────────────────────────────────

  listHealthScores: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(12),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.healthScores.findMany({
        where: eq(healthScores.entityId, ctx.entityId!),
        orderBy: [desc(healthScores.generatedAt)],
        limit: input?.limit ?? 12,
      });
    }),

  // ── Forecast Models ─────────────────────────────────────────────────

  listForecasts: protectedProcedure
    .input(
      z
        .object({
          active: z.boolean().optional(),
          limit: z.number().min(1).max(50).default(12),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(forecastModels.entityId, ctx.entityId!)];
      if (input?.active !== undefined)
        where.push(eq(forecastModels.isActive, input.active));

      return db.query.forecastModels.findMany({
        where: and(...where),
        orderBy: [desc(forecastModels.generatedAt)],
        limit: input?.limit ?? 12,
      });
    }),

  // ── Benchmark Cohorts (read-only) ───────────────────────────────────
  //
  // ⚠️ CRITICAL RULE: Benchmarking requires verified anonymization and consent.
  // The listCohorts endpoint only returns cohorts where anonymization is verified.

  listCohorts: protectedProcedure.query(async ({ ctx }) => {
    return db.query.benchmarkCohorts.findMany({
      where: and(
        eq(benchmarkCohorts.entityId, ctx.entityId!),
        eq(benchmarkCohorts.anonymizationVerified, true),
      ),
      orderBy: [desc(benchmarkCohorts.generatedAt)],
      limit: 20,
    });
  }),
});
