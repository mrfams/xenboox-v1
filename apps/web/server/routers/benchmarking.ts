// ─── Benchmarking & Consent Architecture Router (Phase 3) ──────────────
//
// Consent management, cohort viewing, and aggregate benchmark data access.
// All endpoints gated by the core rules:
//   1. Default excluded — opt-in only
//   2. Minimum cohort size enforced
//   3. Individual org data never exposed

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc, count } from "drizzle-orm";
import {
  benchmarkConsentRecords,
  benchmarkCohortMembers,
  benchmarkAggregates,
  benchmarkCohorts,
} from "@xenboox/db/schema";
import { entities, organizations } from "@xenboox/db/schema/organization";
import {
  runBenchmarkingPipeline,
  getBenchmarkingAvailability,
  recordConsent,
  MIN_COHORT_SIZE,
  RECOMMENDED_COHORT_SIZE,
} from "@xenboox/agents";

import {
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
  handleMutationError,
} from "@/lib/trpc/server";

// ─── Router ──────────────────────────────────────────────────────────────

export const benchmarkingRouter = router({
  // ── Consent Status ─────────────────────────────────────────────────
  // Returns the current consent status for this organization.
  // Default is excluded/opted-out.

  getConsentStatus: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, ctx.entityId!),
      columns: { organizationId: true },
    });

    if (!entity) return { hasConsented: false, consentedAt: null };

    const [latest] = await db.query.benchmarkConsentRecords.findMany({
      where: eq(benchmarkConsentRecords.organizationId, entity.organizationId),
      orderBy: [desc(benchmarkConsentRecords.createdAt)],
      limit: 1,
    });

    if (!latest) {
      return { hasConsented: false, consentedAt: null };
    }

    return {
      hasConsented: latest.consented,
      consentedAt: latest.consentedAt?.toISOString() ?? null,
      revokedAt: latest.revokedAt?.toISOString() ?? null,
      recordId: latest.id,
    };
  }),

  // ── Grant Consent ─────────────────────────────────────────────────
  // Explicit opt-IN. Organization owner/admin must actively consent.
  // Default is excluded — this is the explicit action to opt in.

  grantConsent: rlsMutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        agreeToAnonymizedBenchmarking: z.literal(true, {
          errorMap: () => ({
            message:
              "You must explicitly agree to anonymized data sharing for benchmarking",
          }),
        }),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entity = await db.query.entities.findFirst({
          where: eq(entities.id, ctx.entityId!),
          columns: { organizationId: true },
        });

        if (!entity) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Entity not found",
          });
        }

        await recordConsent(
          entity.organizationId,
          ctx.entityId!,
          true,
          ctx.session!.user!.id!,
          undefined,
          undefined,
          input.notes,
        );

        return {
          success: true,
          message:
            "You have opted into anonymized benchmarking. Your data will be included in future cohort computations.",
        };
      } catch (error) {
        handleMutationError(error, "Failed to grant benchmarking consent");
      }
    }),

  // ── Revoke Consent ────────────────────────────────────────────────
  // Organization can revoke consent at any time.
  // Removed from future cohorts, historical aggregates preserved.

  revokeConsent: rlsMutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        confirmRevocation: z.literal(true, {
          errorMap: () => ({
            message:
              "You must confirm that you want to revoke benchmarking consent",
          }),
        }),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entity = await db.query.entities.findFirst({
          where: eq(entities.id, ctx.entityId!),
          columns: { organizationId: true },
        });

        if (!entity) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Entity not found",
          });
        }

        await recordConsent(
          entity.organizationId,
          ctx.entityId!,
          false,
          ctx.session!.user!.id!,
          undefined,
          undefined,
          input.reason,
        );

        return {
          success: true,
          message:
            "Consent revoked. Your data will be removed from future cohort computations.",
        };
      } catch (error) {
        handleMutationError(error, "Failed to revoke benchmarking consent");
      }
    }),

  // ── Available Cohorts ─────────────────────────────────────────────
  // Lists cohorts that this entity can benchmark against.
  // Only shows cohorts where anonymization is verified.

  listAvailableCohorts: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, ctx.entityId!),
      columns: { organizationId: true, country: true },
    });

    const organizationId = entity?.organizationId;

    // Get consent status
    let hasConsented = false;
    if (organizationId) {
      const [latest] = await db.query.benchmarkConsentRecords.findMany({
        where: eq(benchmarkConsentRecords.organizationId, organizationId),
        orderBy: [desc(benchmarkConsentRecords.createdAt)],
        limit: 1,
      });
      hasConsented = latest?.consented ?? false;
    }

    // Map ISO country code to market name for cohort matching
    const marketMap: Record<string, string> = {
      GM: "gambia",
      NG: "nigeria",
      GH: "ghana",
      KE: "kenya",
      SL: "sierra_leone",
      LR: "liberia",
      CI: "cote_divoire",
    };
    const market = marketMap[entity?.country ?? ""] ?? "unknown";

    // Find cohorts matching this entity's market
    const cohorts = await db.query.benchmarkCohorts.findMany({
      where: and(
        eq(benchmarkCohorts.anonymizationVerified, true),
        eq(benchmarkCohorts.market, market),
      ),
      orderBy: [desc(benchmarkCohorts.generatedAt)],
      limit: 20,
    });

    // Get member counts for each cohort
    const cohortDetails = await Promise.all(
      cohorts.map(async (c) => {
        const [memberCount] = await db
          .select({ count: count() })
          .from(benchmarkCohortMembers)
          .where(
            and(
              eq(benchmarkCohortMembers.cohortId, c.id),
              eq(benchmarkCohortMembers.active, true),
            ),
          );

        const memberCountNum = Number(memberCount?.count ?? 0);

        return {
          id: c.id,
          market: c.market,
          segment: c.segment,
          memberCount: memberCountNum,
          meetsMinimum: memberCountNum >= MIN_COHORT_SIZE,
          recommendedMinimum: RECOMMENDED_COHORT_SIZE,
          hasAggregates: c.aggregateData !== null,
          lastComputed: c.generatedAt?.toISOString() ?? null,
        };
      }),
    );

    return {
      hasConsented,
      cohorts: cohortDetails,
      canComputeBenchmark:
        hasConsented &&
        cohortDetails.some((c) => c.memberCount >= MIN_COHORT_SIZE),
    };
  }),

  // ── Run Benchmarking Pipeline ────────────────────────────────────
  // Executes the full 8-step benchmarking pipeline.

  runBenchmarking: rlsMutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        market: z.string().optional(),
        segment: z.string().optional(),
        sizeBand: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, ctx.entityId!),
        columns: { organizationId: true, country: true },
      });

      if (!entity) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
      }

      // Map ISO country code to market name
      const marketMap: Record<string, string> = {
        GM: "gambia",
        NG: "nigeria",
        GH: "ghana",
        KE: "kenya",
        SL: "sierra_leone",
        LR: "liberia",
        CI: "cote_divoire",
      };
      const resolvedMarket =
        input.market ?? marketMap[entity.country] ?? "unknown";

      const result = await runBenchmarkingPipeline({
        entityId: ctx.entityId!,
        organizationId: entity.organizationId,
        period: input.period,
        userId: ctx.session!.user!.id!,
        market: resolvedMarket,
        segment: input.segment,
        sizeBand: input.sizeBand,
        triggerSource: "manual",
      });

      return {
        success: result.success,
        consentStatus: result.consentStatus,
        cohortSizeVerified: result.cohortSizeVerified,
        memberCount: result.memberCount,
        aggregatesComputed: result.computedAggregates.length,
        aggregates: result.computedAggregates,
        availableCohorts: result.availableCohorts,
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
    }),

  // ── Get Benchmarking Availability ─────────────────────────────────
  // Returns whether benchmarking data is available (used by Analytics Pipeline)

  getAvailability: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, ctx.entityId!),
      columns: { organizationId: true, country: true },
    });

    if (!entity) {
      return {
        benchmarkAvailable: false,
        consentArchitectureExists: false,
        anonymizationArchitectureExists: false,
        consentStatus: null,
        availableCohorts: [],
      };
    }

    // Map ISO country code to market name
    const marketMap: Record<string, string> = {
      GM: "gambia",
      NG: "nigeria",
      GH: "ghana",
      KE: "kenya",
      SL: "sierra_leone",
      LR: "liberia",
      CI: "cote_divoire",
    };
    const market = marketMap[entity.country] ?? "unknown";

    return getBenchmarkingAvailability({
      entityId: ctx.entityId!,
      organizationId: entity.organizationId,
      market,
    });
  }),

  // ── Get Cohort Aggregates ─────────────────────────────────────────
  // Returns aggregate benchmark data for a specific cohort.
  // Only returns median, quartiles — never individual org data.

  getCohortAggregates: rlsProtectedProcedure
    .input(
      z.object({
        cohortId: z.string(),
        metric: z.string().optional(),
        period: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(benchmarkAggregates.cohortId, input.cohortId)];
      if (input.metric)
        where.push(eq(benchmarkAggregates.metric, input.metric));
      if (input.period)
        where.push(eq(benchmarkAggregates.period, input.period));

      const aggregates = await db.query.benchmarkAggregates.findMany({
        where: and(...where),
        orderBy: [desc(benchmarkAggregates.computedAt)],
        limit: 50,
      });

      // Ensure only aggregate data is returned — no individual org identifiers
      return aggregates.map((a) => ({
        metric: a.metric,
        period: a.period,
        memberCount: a.memberCount,
        median: a.median,
        quartileLow: a.quartileLow,
        quartileHigh: a.quartileHigh,
        mean: a.mean,
        computedAt: a.computedAt?.toISOString() ?? null,
      }));
    }),
});
