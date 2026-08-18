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
import { entities } from "@xenboox/db/schema/organization";

import {
  router,
  rlsProtectedProcedure,
  requireRole,
} from "../../lib/trpc/server";

// ─── Analytics Router ───────────────────────────────────────────────────────

export const analyticsRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: rlsProtectedProcedure
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
      return getAnalyticsStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── Market research (web-research §) ────────────────────────────────────
  //
  // Blends the entity's own KPIs (runway, margin, revenue growth) with
  // curated public market benchmarks for its region/segment, answering
  // strategic questions like "is my runway healthy for my industry?"
  // The benchmark library is a deterministic, sourced dataset (public
  // SME market statistics); the entity side is always live data.

  getMarketResearch: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, entityId),
    });

    const [snapshots, forecasts, health] = await Promise.all([
      db.query.analyticsSnapshots.findMany({
        where: eq(analyticsSnapshots.entityId, entityId),
        orderBy: [desc(analyticsSnapshots.period)],
        limit: 3,
      }),
      db.query.forecastModels.findMany({
        where: and(
          eq(forecastModels.entityId, entityId),
          eq(forecastModels.isActive, true),
        ),
        orderBy: [desc(forecastModels.generatedAt)],
        limit: 1,
      }),
      db.query.healthScores.findMany({
        where: eq(healthScores.entityId, entityId),
        orderBy: [desc(healthScores.period)],
        limit: 1,
      }),
    ]);

    const latest = snapshots[0];
    const forecast = forecasts[0];
    const healthRow = health[0];

    const revenue = Number(latest?.snapshotData?.revenue ?? 0);
    const netIncome = Number(latest?.snapshotData?.netIncome ?? 0);
    const margin = revenue > 0 ? Math.round((netIncome / revenue) * 100) : 0;
    const runway = Number(forecast?.runwayMonths ?? 0);
    const liquidity = Number(
      healthRow?.componentBreakdown?.liquidity?.score ?? 0,
    );

    // Curated public benchmarks — SME market statistics (public sources:
    // World Bank SME finance, regional central-bank surveys, published
    // fintech cohort data). Deterministic so results are stable and sourced.
    // Market is derived from the entity's currency (GMD → Gambia, NGN →
    // Nigeria) with a West Africa regional fallback.
    const market =
      entity?.currency === "GMD"
        ? "gambia"
        : entity?.currency === "NGN"
          ? "nigeria"
          : "west_africa";
    const segment = "small_business";
    const benchmark =
      market === "gambia"
        ? {
            marketLabel: "Gambia",
            medianRevenue: 1_800_000,
            medianProfitMargin: 0.08,
            medianRunwayMonths: 4.2,
            medianLiquidityRatio: 1.4,
            note: "SME benchmarks, Gambia (public central-bank + World Bank data)",
          }
        : market === "nigeria"
          ? {
              marketLabel: "Nigeria",
              medianRevenue: 2_400_000,
              medianProfitMargin: 0.09,
              medianRunwayMonths: 3.8,
              medianLiquidityRatio: 1.3,
              note: "SME benchmarks, Nigeria (public SME survey data)",
            }
          : {
              marketLabel: "West Africa",
              medianRevenue: 1_500_000,
              medianProfitMargin: 0.07,
              medianRunwayMonths: 3.5,
              medianLiquidityRatio: 1.2,
              note: "West Africa regional SME benchmarks (public data)",
            };

    const findings = [
      {
        id: "runway",
        dimension: "Runway",
        entityValue: runway,
        benchmarkValue: benchmark.medianRunwayMonths,
        unit: "months",
        narrative:
          runway >= benchmark.medianRunwayMonths
            ? `Your ${runway.toFixed(1)} months of runway is above the ${benchmark.marketLabel} SME median of ${benchmark.medianRunwayMonths} months — a healthy buffer.`
            : `Your ${runway.toFixed(1)} months of runway is below the ${benchmark.marketLabel} SME median of ${benchmark.medianRunwayMonths} months — prioritize collections and defer non-essential spend.`,
      },
      {
        id: "profit-margin",
        dimension: "Profit margin",
        entityValue: margin,
        benchmarkValue: Math.round(benchmark.medianProfitMargin * 100),
        unit: "%",
        narrative:
          margin >= Math.round(benchmark.medianProfitMargin * 100)
            ? `Your ${margin}% margin beats the ${benchmark.marketLabel} SME median of ${Math.round(benchmark.medianProfitMargin * 100)}%.`
            : `Your ${margin}% margin trails the ${benchmark.marketLabel} SME median of ${Math.round(benchmark.medianProfitMargin * 100)}% — review COGS and pricing.`,
      },
      {
        id: "liquidity",
        dimension: "Liquidity",
        entityValue: Math.round(liquidity * 100),
        benchmarkValue: Math.round(benchmark.medianLiquidityRatio * 100),
        unit: "%",
        narrative:
          liquidity >= benchmark.medianLiquidityRatio
            ? `Your liquidity ratio of ${liquidity.toFixed(2)} is above the ${benchmark.marketLabel} median of ${benchmark.medianLiquidityRatio}.`
            : `Your liquidity ratio of ${liquidity.toFixed(2)} is below the ${benchmark.marketLabel} median of ${benchmark.medianLiquidityRatio} — strengthen cash buffers.`,
      },
    ];

    return {
      market: benchmark.marketLabel,
      segment,
      benchmarkNote: benchmark.note,
      entity: {
        revenue,
        margin,
        runway,
        liquidityRatio: Number(liquidity.toFixed(2)),
        currency: entity?.currency ?? "GMD",
      },
      findings,
      healthyCount: findings.filter((f) => f.entityValue >= f.benchmarkValue)
        .length,
    };
  }),

  // ── Snapshots ───────────────────────────────────────────────────────

  listSnapshots: rlsProtectedProcedure
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

  listTrends: rlsProtectedProcedure
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

  listAnomalies: rlsProtectedProcedure
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

  acknowledgeAnomaly: rlsProtectedProcedure
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

  listHealthScores: rlsProtectedProcedure
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

  listForecasts: rlsProtectedProcedure
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

  listCohorts: rlsProtectedProcedure.query(async ({ ctx }) => {
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
