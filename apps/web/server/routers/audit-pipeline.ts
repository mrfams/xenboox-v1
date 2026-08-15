import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import {
  auditSamples,
  goldenDatasetScenarios,
  driftScores,
  auditPackages,
  auditorPortalSessions,
  auditorQueries,
} from "@xenboox/db/schema/audit-pipeline";
import { runAuditPipeline, getAuditStatus } from "@xenboox/agents";
import { entities } from "@xenboox/db/schema/organization";

import { router, rlsProtectedProcedure, requireRole } from "@/lib/trpc/server";

// ─── Audit Pipeline Router ──────────────────────────────────────────────

export const auditPipelineRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        triggerSource: z
          .enum(["continuous", "manual", "scheduled"])
          .default("manual"),
        sampleSize: z.number().min(5).max(200).default(25),
        agentsToCheck: z.array(z.string()).optional(),
        onDemandPackage: z.boolean().default(false),
        packagePeriod: z.string().optional(),
        generatePortalSessions: z.boolean().default(false),
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
        const result = await runAuditPipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.name ?? "Entity",
          period: input.period,
          userId: ctx.session!.user!.id!,
          triggerSource: input.triggerSource,
          sampleSize: input.sampleSize,
          agentsToCheck: input.agentsToCheck,
          onDemandPackage: input.onDemandPackage,
          packagePeriod: input.packagePeriod,
          generatePortalSessions: input.generatePortalSessions,
        });

        return {
          success: result.errors.length === 0,
          continuous: result.continuous,
          period: result.period,
          overallConfidence: result.overallConfidence,
          escalated: result.escalated,
          escalationReason: result.escalationReason,
          samplesCollected: result.samplesCollected,
          samplesWithDiscrepancies: result.samplesWithDiscrepancies,
          anomaliesDetected: result.anomaliesDetected.length,
          anomaliesEscalated: result.anomaliesEscalated,
          agentsChecked: result.agentsChecked,
          driftScores: result.driftScores,
          auditPackagesCreated: result.auditPackagesCreated,
          goldenDatasetSize: result.goldenDatasetSize,
          activeSessions: result.activeSessions,
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
          message: `Audit pipeline failed: ${msg}`,
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
      return getAuditStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── Audit Samples ──────────────────────────────────────────────────

  listSamples: rlsProtectedProcedure
    .input(
      z
        .object({
          agentChecked: z.string().optional(),
          status: z
            .enum(["sampled", "verified", "discrepancy", "investigating"])
            .optional(),
          limit: z.number().min(1).max(100).default(25),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(auditSamples.entityId, ctx.entityId!)];
      if (input?.agentChecked)
        where.push(eq(auditSamples.agentChecked, input.agentChecked));
      if (input?.status) where.push(eq(auditSamples.status, input.status));

      return db.query.auditSamples.findMany({
        where: and(...where),
        orderBy: [desc(auditSamples.sampledAt)],
        limit: input?.limit ?? 25,
      });
    }),

  // ── Drift Scores ───────────────────────────────────────────────────

  listDriftScores: rlsProtectedProcedure
    .input(
      z
        .object({
          agentId: z.string().optional(),
          period: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(driftScores.entityId, ctx.entityId!)];
      if (input?.agentId) where.push(eq(driftScores.agentId, input.agentId));
      if (input?.period) where.push(eq(driftScores.period, input.period));

      return db.query.driftScores.findMany({
        where: and(...where),
        orderBy: [desc(driftScores.computedAt)],
        limit: 50,
      });
    }),

  // ── Golden Dataset ─────────────────────────────────────────────────

  listGoldenScenarios: rlsProtectedProcedure
    .input(
      z
        .object({
          scenarioType: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(goldenDatasetScenarios.entityId, ctx.entityId!)];
      if (input?.scenarioType)
        where.push(eq(goldenDatasetScenarios.scenarioType, input.scenarioType));

      return db.query.goldenDatasetScenarios.findMany({
        where: and(...where),
        orderBy: [desc(goldenDatasetScenarios.addedAt)],
      });
    }),

  // ── Audit Packages ─────────────────────────────────────────────────

  listPackages: rlsProtectedProcedure
    .input(
      z
        .object({
          period: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(auditPackages.entityId, ctx.entityId!)];
      if (input?.period) where.push(eq(auditPackages.period, input.period));

      return db.query.auditPackages.findMany({
        where: and(...where),
        orderBy: [desc(auditPackages.generatedAt)],
      });
    }),

  // ── Portal Sessions ────────────────────────────────────────────────

  listPortalSessions: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .query(async ({ ctx }) => {
      return db.query.auditorPortalSessions.findMany({
        where: and(
          eq(auditorPortalSessions.entityId, ctx.entityId!),
          eq(auditorPortalSessions.readOnly, true), // Always filter for read-only
        ),
        orderBy: [desc(auditorPortalSessions.grantedAt)],
      });
    }),

  // ── Auditor Queries ────────────────────────────────────────────────

  listQueries: rlsProtectedProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "answered", "closed"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(auditorPortalSessions.entityId, ctx.entityId!)];
      // Join with sessions to filter by entity
      if (input?.status) where.push(eq(auditorQueries.status, input.status));

      return db.query.auditorQueries.findMany({
        where: input?.status
          ? eq(auditorQueries.status, input.status)
          : undefined,
        orderBy: [desc(auditorQueries.createdAt)],
        limit: 50,
      });
    }),
});
