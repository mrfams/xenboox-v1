import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  budgets,
  budgetLines,
  budgetVersions,
  varianceRecords,
  budgetAlertThresholds,
} from "@xenboox/db/schema";
import {
  runBudgetPipeline,
  getBudgetStatus,
  checkBudgetImpact,
} from "@xenboox/agents";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import { entities } from "@xenboox/db/schema/organization";
import { chartOfAccounts } from "@xenboox/db/schema/accounting";

// ─── Budget Pipeline Router ─────────────────────────────────────────────────

export const budgetRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        fiscalYear: z.number().int().min(2020).max(2100),
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
        const result = await runBudgetPipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.name ?? "Entity",
          currency: entityCtx.currency ?? "GMD",
          fiscalYear: input.fiscalYear,
          period: input.period,
          userId: ctx.session!.user!.id!,
        });

        return {
          success: result.success,
          period: result.period,
          fiscalYear: result.fiscalYear,
          budgetSummary: result.budgetSummary,
          varianceLines: result.varianceLines,
          alerts: result.alerts,
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
        handleMutationError(error, "Budget pipeline failed");
      }
    }),

  // ── Pipeline Status ─────────────────────────────────────────────────

  getStatus: rlsProtectedProcedure
    .input(
      z
        .object({
          fiscalYear: z.number().int().min(2020).max(2100).optional(),
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getBudgetStatus({
        entityId: ctx.entityId!,
        fiscalYear: input?.fiscalYear,
        period: input?.period,
      });
    }),

  // ── Budget CRUD ─────────────────────────────────────────────────────

  listBudgets: rlsProtectedProcedure
    .input(
      z
        .object({
          fiscalYear: z.number().int().min(2020).max(2100).optional(),
          limit: z.number().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(budgets.entityId, ctx.entityId!)];
      if (input?.fiscalYear)
        where.push(eq(budgets.fiscalYear, input.fiscalYear));

      return db.query.budgets.findMany({
        where: and(...where),
        orderBy: [desc(budgets.fiscalYear)],
        limit: input?.limit ?? 10,
      });
    }),

  createBudget: rlsMutateProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        fiscalYear: z.number().int().min(2020).max(2100),
        currency: z.string().default("GMD"),
        multiYear: z.boolean().default(false),
        multiYearEnd: z.number().int().min(2020).max(2100).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [budget] = await db
          .insert(budgets)
          .values({
            entityId: ctx.entityId!,
            name: input.name,
            fiscalYear: input.fiscalYear,
            status: "draft",
            currency: input.currency,
            multiYear: input.multiYear,
            multiYearEnd: input.multiYearEnd,
            notes: input.notes,
            createdById: ctx.session!.user!.id!,
          })
          .returning();

        return budget;
      } catch (error) {
        handleMutationError(error, "Failed to create budget");
      }
    }),

  approveBudget: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ budgetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [budget] = await db
          .update(budgets)
          .set({
            status: "active",
            approvedById: ctx.session!.user!.id!,
            approvedAt: new Date(),
          })
          .where(
            and(
              eq(budgets.id, input.budgetId),
              eq(budgets.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (!budget) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Budget not found",
          });
        }

        return budget;
      } catch (error) {
        handleMutationError(error, "Failed to approve budget");
      }
    }),

  // ── Budget Lines ────────────────────────────────────────────────────

  listBudgetLines: rlsProtectedProcedure
    .input(
      z.object({
        budgetId: z.string().uuid(),
        dimensionType: z.string().optional(),
        dimensionId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [
        eq(budgetLines.budgetId, input.budgetId),
        eq(budgetLines.entityId, ctx.entityId!),
        eq(budgetLines.isActive, true),
      ];
      if (input.dimensionType)
        where.push(eq(budgetLines.dimensionType, input.dimensionType));
      if (input.dimensionId)
        where.push(eq(budgetLines.dimensionId, input.dimensionId));

      return db.query.budgetLines.findMany({
        where: and(...where),
        with: { account: true, variances: true },
        orderBy: [budgetLines.lineDescription],
      });
    }),

  upsertBudgetLine: rlsMutateProcedure
    .input(
      z.object({
        budgetId: z.string().uuid(),
        accountId: z.string().uuid(),
        lineDescription: z.string().min(1).max(300),
        dimensionType: z.string().optional(),
        dimensionId: z.string().optional(),
        annualAmount: z.string(),
        monthlyAmounts: z
          .object({
            jan: z.string().optional(),
            feb: z.string().optional(),
            mar: z.string().optional(),
            apr: z.string().optional(),
            may: z.string().optional(),
            jun: z.string().optional(),
            jul: z.string().optional(),
            aug: z.string().optional(),
            sep: z.string().optional(),
            oct: z.string().optional(),
            nov: z.string().optional(),
            dec: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const lineId = input.monthlyAmounts ? undefined : undefined; // Will always create new line

        const [line] = await db
          .insert(budgetLines)
          .values({
            entityId: ctx.entityId!,
            budgetId: input.budgetId,
            accountId: input.accountId,
            lineDescription: input.lineDescription,
            dimensionType: input.dimensionType,
            dimensionId: input.dimensionId,
            annualAmount: input.annualAmount,
            jan: input.monthlyAmounts?.jan ?? "0",
            feb: input.monthlyAmounts?.feb ?? "0",
            mar: input.monthlyAmounts?.mar ?? "0",
            apr: input.monthlyAmounts?.apr ?? "0",
            may: input.monthlyAmounts?.may ?? "0",
            jun: input.monthlyAmounts?.jun ?? "0",
            jul: input.monthlyAmounts?.jul ?? "0",
            aug: input.monthlyAmounts?.aug ?? "0",
            sep: input.monthlyAmounts?.sep ?? "0",
            oct: input.monthlyAmounts?.oct ?? "0",
            nov: input.monthlyAmounts?.nov ?? "0",
            dec: input.monthlyAmounts?.dec ?? "0",
          })
          .returning();

        return line;
      } catch (error) {
        handleMutationError(error, "Failed to create budget line");
      }
    }),

  // ── Thresholds ──────────────────────────────────────────────────────

  listThresholds: rlsProtectedProcedure
    .input(z.object({ budgetLineId: z.string().uuid() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.budgetLineId) {
        return db.query.budgetAlertThresholds.findMany({
          where: and(
            eq(budgetAlertThresholds.budgetLineId, input.budgetLineId),
            eq(budgetAlertThresholds.entityId, ctx.entityId!),
          ),
        });
      }
      return db.query.budgetAlertThresholds.findMany({
        where: eq(budgetAlertThresholds.entityId, ctx.entityId!),
      });
    }),

  upsertThreshold: rlsMutateProcedure
    .input(
      z.object({
        budgetLineId: z.string().uuid(),
        approachingPct: z.string(),
        exceededPct: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.budgetAlertThresholds.findFirst({
          where: and(
            eq(budgetAlertThresholds.budgetLineId, input.budgetLineId),
            eq(budgetAlertThresholds.entityId, ctx.entityId!),
          ),
        });

        if (existing) {
          const [updated] = await db
            .update(budgetAlertThresholds)
            .set({
              approachingPct: input.approachingPct,
              exceededPct: input.exceededPct,
            })
            .where(eq(budgetAlertThresholds.id, existing.id))
            .returning();
          return updated;
        }

        const [created] = await db
          .insert(budgetAlertThresholds)
          .values({
            entityId: ctx.entityId!,
            budgetLineId: input.budgetLineId,
            approachingPct: input.approachingPct,
            exceededPct: input.exceededPct,
          })
          .returning();
        return created;
      } catch (error) {
        handleMutationError(error, "Failed to upsert threshold");
      }
    }),

  // ── Variances ───────────────────────────────────────────────────────

  listVariances: rlsProtectedProcedure
    .input(
      z
        .object({
          budgetLineId: z.string().uuid().optional(),
          significant: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(varianceRecords.entityId, ctx.entityId!)];
      if (input?.budgetLineId)
        where.push(eq(varianceRecords.budgetLineId, input.budgetLineId));
      if (input?.significant !== undefined)
        where.push(eq(varianceRecords.isSignificant, input.significant));

      return db.query.varianceRecords.findMany({
        where: and(...where),
        orderBy: [desc(varianceRecords.period)],
        limit: input?.limit ?? 20,
        with: { budgetLine: { with: { account: true } } },
      });
    }),

  // ── Budget Impact Check ─────────────────────────────────────────────

  checkBudgetImpact: rlsProtectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        dimensionType: z.string().optional(),
        dimensionId: z.string().optional(),
        requestedAmount: z.number(),
        period: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      return checkBudgetImpact(ctx.entityId!, input);
    }),

  // ── Versions ────────────────────────────────────────────────────────

  listVersions: rlsProtectedProcedure
    .input(z.object({ budgetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.budgetVersions.findMany({
        where: and(
          eq(budgetVersions.budgetId, input.budgetId),
          eq(budgetVersions.entityId, ctx.entityId!),
        ),
        orderBy: [desc(budgetVersions.versionNumber)],
      });
    }),
});
