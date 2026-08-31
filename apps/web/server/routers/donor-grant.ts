import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  donorProjects,
  donorReportSnapshots,
} from "@xenboox/db/schema/donor-grant";
import { customers } from "@xenboox/db/schema/ap-ar";
import { auditLog } from "@xenboox/db/schema";

import {
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requirePermission,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Donor & Grant Reporting Router ─────────────────────────────────────────
//
// Handles donor-funded project tracking, budget vs actual comparison,
// automated report generation, and donor portal read-only access.
//
// PRD §4.16 — Donor and Grant Reporting:
//   - Budget vs actual by project/donor
//   - Donor portal (read-only, project-scoped)
//   - Automated reports in donor formats (USAID, EU, World Bank, AfDB)

export const donorGrantRouter = router({
  // ── Projects ──────────────────────────────────────────────────────────

  /** List all donor projects for the entity */
  listProjects: rlsProtectedProcedure
    .input(
      z.object({
        status: z
          .enum(["active", "completed", "suspended", "closed"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(({ ctx, input }) => {
      return db.query.donorProjects.findMany({
        where: and(
          eq(donorProjects.entityId, ctx.entityId!),
          input.status
            ? eq(donorProjects.status, input.status)
            : undefined,
        ),
        with: { donor: true },
        orderBy: [desc(donorProjects.createdAt)],
        limit: input.limit,
      });
    }),

  /** Get a single donor project with full details */
  getProject: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.donorProjects.findFirst({
        where: and(
          eq(donorProjects.id, input.id),
          eq(donorProjects.entityId, ctx.entityId!),
        ),
        with: {
          donor: true,
          reportSnapshots: {
            orderBy: [desc(donorReportSnapshots.period)],
            limit: 12,
          },
        },
      });
    }),

  /** Create a new donor project */
  createProject: rlsMutateProcedure
    .use(requirePermission("donor_grant", "create"))
    .input(
      z.object({
        donorCustomerId: z.string().uuid(),
        projectName: z.string().min(1),
        projectCode: z.string().optional(),
        grantAmount: z.number().positive(),
        currency: z.string().length(3).default("USD"),
        reportingFormat: z
          .enum(["usaid", "eu", "world_bank", "afdb", "custom"])
          .default("custom"),
        reportingCadence: z
          .enum(["monthly", "quarterly", "semi_annual", "annual"])
          .default("quarterly"),
        startDate: z.string().min(1),
        endDate: z.string().optional(),
        description: z.string().optional(),
        budgetAllocation: z
          .record(z.number())
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .insert(donorProjects)
        .values({
          entityId: ctx.entityId!,
          ...input,
          grantAmount: input.grantAmount.toString(),
          amountDisbursed: "0",
          amountRemaining: input.grantAmount.toString(),
          budgetAllocation: input.budgetAllocation ?? {},
        })
        .returning();

      await db.insert(auditLog).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        action: "donor_grant.createProject",
        entityType: "donor_project",
        entityIdRef: project.id,
        newValues: {
          projectName: input.projectName,
          grantAmount: input.grantAmount,
          donorCustomerId: input.donorCustomerId,
        },
      });

      return project;
    }),

  /** Update a donor project */
  updateProject: rlsMutateProcedure
    .use(requirePermission("donor_grant", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        projectName: z.string().min(1).optional(),
        grantAmount: z.number().positive().optional(),
        status: z
          .enum(["active", "completed", "suspended", "closed"])
          .optional(),
        description: z.string().optional(),
        budgetAllocation: z.record(z.number()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const [updated] = await db
        .update(donorProjects)
        .set({
          ...updates,
          grantAmount: updates.grantAmount?.toString(),
          budgetAllocation: updates.budgetAllocation,
        })
        .where(
          and(
            eq(donorProjects.id, id),
            eq(donorProjects.entityId, ctx.entityId!),
          ),
        )
        .returning();
      return updated;
    }),

  // ── Budget vs Actual ──────────────────────────────────────────────────

  /** Get budget vs actual for a specific project */
  getBudgetVsActual: rlsProtectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        period: z.string().optional(), // e.g. "2026-Q2" or "2026-07"
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await db.query.donorProjects.findFirst({
        where: and(
          eq(donorProjects.id, input.projectId),
          eq(donorProjects.entityId, ctx.entityId!),
        ),
      });

      if (!project) return null;

      // Get the latest report snapshot or generate budget vs actual
      const snapshot = await db.query.donorReportSnapshots.findFirst({
        where: and(
          eq(donorReportSnapshots.donorProjectId, input.projectId),
          input.period
            ? eq(donorReportSnapshots.period, input.period)
            : undefined,
        ),
        orderBy: [desc(donorReportSnapshots.generatedAt)],
      });

      // Calculate budget vs actual from project's budget allocation
      const budgetAllocation = (project.budgetAllocation as Record<string, number>) ?? {};
      const categories = Object.entries(budgetAllocation).map(
        ([category, budgeted]) => ({
          category,
          budgeted,
          actual: 0, // Will be calculated from journal entries
          variance: -budgeted,
          variancePct: -100,
        }),
      );

      // If we have a snapshot, use its data
      if (snapshot?.budgetVsActual) {
        return {
          project,
          snapshot,
          budgetVsActual: snapshot.budgetVsActual,
        };
      }

      const totalBudgeted = Object.values(budgetAllocation).reduce(
        (sum, v) => sum + v,
        0,
      );

      return {
        project,
        snapshot: null,
        budgetVsActual: {
          categories,
          totalBudgeted,
          totalActual: 0,
          totalVariance: -totalBudgeted,
          totalVariancePct: totalBudgeted > 0 ? -100 : 0,
        },
      };
    }),

  // ── Report Snapshots ──────────────────────────────────────────────────

  /** List report snapshots for a project */
  listReportSnapshots: rlsProtectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(12),
      }),
    )
    .query(({ ctx, input }) => {
      return db.query.donorReportSnapshots.findMany({
        where: and(
          eq(donorReportSnapshots.donorProjectId, input.projectId),
          eq(donorReportSnapshots.entityId, ctx.entityId!),
        ),
        orderBy: [desc(donorReportSnapshots.period)],
        limit: input.limit,
      });
    }),

  /** Generate a new report snapshot for a project period */
  generateReport: rlsMutateProcedure
    .use(requirePermission("donor_grant", "create"))
    .input(
      z.object({
        projectId: z.string().uuid(),
        period: z.string().min(1), // e.g. "2026-Q2"
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await db.query.donorProjects.findFirst({
        where: and(
          eq(donorProjects.id, input.projectId),
          eq(donorProjects.entityId, ctx.entityId!),
        ),
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const budgetAllocation =
        (project.budgetAllocation as Record<string, number>) ?? {};

      // TODO: Calculate actuals from journal entries scoped to this project
      // For now, create the snapshot with budget data
      const categories = Object.entries(budgetAllocation).map(
        ([category, budgeted]) => ({
          category,
          budgeted,
          actual: 0,
          variance: -budgeted,
          variancePct: -100,
        }),
      );

      const totalBudgeted = Object.values(budgetAllocation).reduce(
        (sum, v) => sum + v,
        0,
      );

      const [snapshot] = await db
        .insert(donorReportSnapshots)
        .values({
          entityId: ctx.entityId!,
          donorProjectId: input.projectId,
          period: input.period,
          budgetVsActual: {
            categories,
            totalBudgeted,
            totalActual: 0,
            totalVariance: -totalBudgeted,
            totalVariancePct: totalBudgeted > 0 ? -100 : 0,
          },
          status: "draft",
          generatedBy: ctx.session!.user!.id!,
        })
        .returning();

      await db.insert(auditLog).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        action: "donor_grant.generateReport",
        entityType: "donor_report_snapshot",
        entityIdRef: snapshot.id,
        newValues: {
          period: input.period,
          projectId: input.projectId,
        },
      });

      return snapshot;
    }),

  /** Submit a report to the donor */
  submitReport: rlsMutateProcedure
    .use(requirePermission("donor_grant", "edit"))
    .input(z.object({ reportId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(donorReportSnapshots)
        .set({
          status: "submitted",
          submittedAt: new Date(),
        })
        .where(
          and(
            eq(donorReportSnapshots.id, input.reportId),
            eq(donorReportSnapshots.entityId, ctx.entityId!),
          ),
        )
        .returning();
      return updated;
    }),

  // ── Donor Portal (Read-Only) ──────────────────────────────────────────

  /** Donor portal: list projects this donor has funded */
  donorPortalProjects: rlsProtectedProcedure
    .input(z.object({ donorCustomerId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.donorProjects.findMany({
        where: and(
          eq(donorProjects.entityId, ctx.entityId!),
          eq(donorProjects.donorCustomerId, input.donorCustomerId),
        ),
        with: {
          reportSnapshots: {
            orderBy: [desc(donorReportSnapshots.period)],
            limit: 6,
          },
        },
        orderBy: [desc(donorProjects.createdAt)],
      });
    }),

  /** Donor portal: get project detail with budget vs actual */
  donorPortalProjectDetail: rlsProtectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await db.query.donorProjects.findFirst({
        where: and(
          eq(donorProjects.id, input.projectId),
          eq(donorProjects.entityId, ctx.entityId!),
        ),
        with: {
          donor: true,
          reportSnapshots: {
            orderBy: [desc(donorReportSnapshots.period)],
            limit: 12,
          },
        },
      });

      if (!project) return null;

      const budgetAllocation =
        (project.budgetAllocation as Record<string, number>) ?? {};
      const totalBudgeted = Object.values(budgetAllocation).reduce(
        (sum, v) => sum + v,
        0,
      );

      return {
        ...project,
        budgetSummary: {
          totalBudgeted,
          amountDisbursed: parseFloat(project.amountDisbursed),
          amountRemaining: parseFloat(project.amountRemaining),
          percentDisbursed:
            totalBudgeted > 0
              ? (parseFloat(project.amountDisbursed) / totalBudgeted) * 100
              : 0,
        },
      };
    }),

  // ── Summary Stats ─────────────────────────────────────────────────────

  /** Get summary stats for all donor projects */
  getStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const projects = await db.query.donorProjects.findMany({
      where: eq(donorProjects.entityId, ctx.entityId!),
    });

    const active = projects.filter((p) => p.status === "active").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const totalGrantAmount = projects.reduce(
      (sum, p) => sum + parseFloat(p.grantAmount),
      0,
    );
    const totalDisbursed = projects.reduce(
      (sum, p) => sum + parseFloat(p.amountDisbursed),
      0,
    );
    const totalRemaining = projects.reduce(
      (sum, p) => sum + parseFloat(p.amountRemaining),
      0,
    );

    return {
      totalProjects: projects.length,
      active,
      completed,
      totalGrantAmount,
      totalDisbursed,
      totalRemaining,
      percentDisbursed:
        totalGrantAmount > 0 ? (totalDisbursed / totalGrantAmount) * 100 : 0,
    };
  }),
});
