import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";
import { entities } from "@xenboox/db/schema/organization";
import { trialBalanceSnapshots } from "@xenboox/db/schema/accounting";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { auditLog } from "@xenboox/db/schema/documents";
import {
  executeClosePipeline,
  getCloseStatus,
} from "@xenboox/agents/core/close-pipeline";

import { tenantJobOptions, triggerClient } from "@/lib/trigger";
import { cachedDomain } from "@/lib/cache/tenant-cache";
import { db } from "@/lib/db";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  requireRole,
} from "@/lib/trpc/server";

// Fiscal periods change rarely (created annually); a 60s entity-scoped cache
// makes the calendar widget's repeated reads free while never going stale
// beyond a single tick. getCurrent is deliberately NOT cached (time-bound).
const fiscalCache = cachedDomain("fiscal", 60_000);

export const fiscalRouter = router({
  list: rlsProtectedProcedure
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const cacheKey = JSON.stringify(input ?? {});
      const cached = await fiscalCache.get<
        (typeof fiscalPeriods.$inferSelect)[]
      >(entityId, cacheKey);
      if (cached) return cached;

      const periods = await db.query.fiscalPeriods.findMany({
        where: input.year
          ? and(
              eq(fiscalPeriods.entityId, entityId),
              eq(fiscalPeriods.year, input.year),
            )
          : eq(fiscalPeriods.entityId, entityId),
        orderBy: [desc(fiscalPeriods.year), asc(fiscalPeriods.month)],
      });
      await fiscalCache.set(entityId, cacheKey, periods);
      return periods;
    }),

  getCurrent: rlsProtectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return db.query.fiscalPeriods.findFirst({
      where: and(
        eq(fiscalPeriods.entityId, ctx.entityId!),
        eq(fiscalPeriods.year, currentYear),
        eq(fiscalPeriods.month, currentMonth),
      ),
    });
  }),

  create: rlsProtectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.fiscalPeriods.findFirst({
          where: and(
            eq(fiscalPeriods.entityId, ctx.entityId!),
            eq(fiscalPeriods.year, input.year),
            eq(fiscalPeriods.month, input.month),
          ),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Period ${input.year}-${input.month} already exists`,
          });
        }

        const startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
        const lastDay = new Date(input.year, input.month, 0).getDate();
        const endDate = `${input.year}-${String(input.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const [period] = await db
          .insert(fiscalPeriods)
          .values({
            entityId: ctx.entityId!,
            year: input.year,
            month: input.month,
            startDate,
            endDate,
          })
          .returning();

        // Periods are cached for 60s — drop the entity's fiscal entries so
        // the calendar reflects the new period immediately.
        await fiscalCache.invalidate(ctx.entityId!);

        return period;
      } catch (error) {
        handleMutationError(error, "Failed to create fiscal period");
      }
    }),

  closePeriod: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ periodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const period = await db.query.fiscalPeriods.findFirst({
          where: and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.entityId, ctx.entityId!),
          ),
        });
        if (!period)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Period not found",
          });
        if (period.status === "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Period already closed",
          });
        }
        if (period.status === "locked") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Period is locked",
          });
        }

        const entryIds = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.entityId, ctx.entityId!),
              eq(journalEntries.periodId, input.periodId),
              eq(journalEntries.status, "posted"),
            ),
          );
        const ids = entryIds.map((e) => e.id);

        const lines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];

        const accountTotals = new Map<
          string,
          { debit: number; credit: number }
        >();

        for (const line of lines) {
          const existing = accountTotals.get(line.accountId) || {
            debit: 0,
            credit: 0,
          };
          existing.debit += Number(line.debit);
          existing.credit += Number(line.credit);
          accountTotals.set(line.accountId, existing);
        }

        // Batch insert all trial balance snapshots in a single query (N+1 fix)
        const snapshotValues = Array.from(accountTotals.entries()).map(
          ([accountId, totals]) => ({
            entityId: ctx.entityId!,
            periodId: input.periodId,
            accountId,
            debitTotal: String(totals.debit),
            creditTotal: String(totals.credit),
            balance: String(totals.debit - totals.credit),
            generatedBy: "system" as const,
          }),
        );

        if (snapshotValues.length > 0) {
          await db.insert(trialBalanceSnapshots).values(snapshotValues);
        }

        const [updated] = await db
          .update(fiscalPeriods)
          .set({
            status: "closed",
            closedBy: ctx.session!.user!.id!,
            closedAt: new Date(),
          })
          .where(
            and(
              eq(fiscalPeriods.id, input.periodId),
              eq(fiscalPeriods.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "fiscal.closePeriod",
            entityType: "fiscal_period",
            entityIdRef: updated.id,
            newValues: { status: "closed" },
          });
        }

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to close period");
      }
    }),

  lockPeriod: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ periodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const period = await db.query.fiscalPeriods.findFirst({
          where: and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.entityId, ctx.entityId!),
          ),
        });
        if (!period)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Period not found",
          });
        if (period.status !== "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Must be closed before locking",
          });
        }

        const [updated] = await db
          .update(fiscalPeriods)
          .set({ status: "locked" })
          .where(
            and(
              eq(fiscalPeriods.id, input.periodId),
              eq(fiscalPeriods.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "fiscal.lockPeriod",
            entityType: "fiscal_period",
            entityIdRef: updated.id,
            newValues: { status: "locked" },
          });
        }

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to lock period");
      }
    }),

  closePeriodAsync: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ periodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const period = await db.query.fiscalPeriods.findFirst({
          where: and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.entityId, ctx.entityId!),
          ),
        });
        if (!period)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Period not found",
          });
        if (period.status === "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Period already closed",
          });
        }
        if (period.status === "locked") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Period is locked",
          });
        }

        const job = await triggerClient.tasks.trigger(
          "process-month-end-close",
          {
            entityId: ctx.entityId!,
            month: period.month,
            year: period.year,
            userId: ctx.session!.user!.id!,
          },
          // One close per tenant per period — double-trigger collapses.
          tenantJobOptions(
            ctx.entityId!,
            `process-month-end-close:${period.year}-${period.month}`,
          ),
        );

        return { jobId: job.id, status: "triggered" };
      } catch (error) {
        handleMutationError(error, "Failed to trigger period close");
      }
    }),

  delete: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const period = await db.query.fiscalPeriods.findFirst({
          where: and(
            eq(fiscalPeriods.id, input.id),
            eq(fiscalPeriods.entityId, ctx.entityId!),
          ),
        });
        if (!period)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fiscal period not found",
          });
        if (period.status !== "open") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a closed or locked fiscal period",
          });
        }

        const referencedEntries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.periodId, input.id),
            eq(journalEntries.entityId, ctx.entityId!),
          ),
        });
        if (referencedEntries.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a period with journal entries",
          });
        }

        await db
          .delete(fiscalPeriods)
          .where(
            and(
              eq(fiscalPeriods.id, input.id),
              eq(fiscalPeriods.entityId, ctx.entityId!),
            ),
          );

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "fiscal.delete",
          entityType: "fiscal_period",
          entityIdRef: input.id,
          newValues: { deleted: true },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete fiscal period");
      }
    }),

  /**
   * Get the real-time close status for the current period.
   * Returns step-by-step status for all 7 close steps.
   */
  getCloseStatus: rlsProtectedProcedure
    .input(
      z
        .object({
          periodId: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getCloseStatus(ctx.entityId!, input?.periodId);
    }),

  /**
   * Initiate the autonomous close pipeline.
   * Runs all 7 close steps with validation, department fan-out,
   * automated adjustments, and period close.
   */
  initiateClose: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        periodId: z.string().uuid(),
        triggerSource: z
          .enum(["manual", "scheduled", "agent"])
          .default("manual"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch entity context
        const entity = await db.query.entities.findFirst({
          where: eq(entities.id, ctx.entityId!),
        });

        const { closeState } = await executeClosePipeline({
          entityId: ctx.entityId!,
          entityName: entity?.name ?? "Organization",
          currency: entity?.currency ?? "GMD",
          periodId: input.periodId,
          userId: ctx.session!.user!.id!,
          triggerSource: input.triggerSource,
        });

        // Log audit
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "close.initiateClose",
          entityType: "fiscal_period",
          entityIdRef: input.periodId,
          newValues: {
            triggerSource: input.triggerSource,
            status: closeState.status,
            stepsCompleted: closeState.steps.filter(
              (s) => s.status === "completed",
            ).length,
            errors: closeState.errors,
          },
        });

        return {
          status: closeState.status,
          steps: closeState.steps,
          errors: closeState.errors,
          warnings: closeState.warnings,
          overallConfidence: closeState.overallConfidence,
        };
      } catch (error) {
        handleMutationError(error, "Failed to initiate close pipeline");
      }
    }),

  createFullYear: rlsProtectedProcedure
    .input(z.object({ year: z.number().int().min(2000).max(2100) }))
    .mutation(async ({ ctx, input }) => {
      // Fetch all existing periods for this year upfront (N+1 fix)
      const existingPeriods = await db.query.fiscalPeriods.findMany({
        where: and(
          eq(fiscalPeriods.entityId, ctx.entityId!),
          eq(fiscalPeriods.year, input.year),
        ),
        columns: { month: true },
      });
      const existingMonths = new Set(existingPeriods.map((p) => p.month));

      const months = [];
      for (let month = 1; month <= 12; month++) {
        if (existingMonths.has(month)) continue;

        const startDate = `${input.year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(input.year, month, 0).getDate();
        const endDate = `${input.year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const [period] = await db
          .insert(fiscalPeriods)
          .values({
            entityId: ctx.entityId!,
            year: input.year,
            month,
            startDate,
            endDate,
          })
          .returning();
        months.push(period);
      }

      await db.insert(auditLog).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        action: "fiscal.createFullYear",
        entityType: "fiscal_period",
        newValues: { year: input.year, periodsCreated: months.length },
      });

      return { created: months.length, periods: months };
    }),
});
