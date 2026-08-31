import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  inventoryPipelineRuns,
  goodsReceivedNotes,
  stockCountSessions,
  stockCountRecords,
} from "@xenboox/db/schema";
import { inventoryItems, warehouses } from "@xenboox/db/schema/inventory";
import {
  runInventoryPipeline,
  getInventoryPipelineStatus,
} from "@xenboox/agents";
import { entities } from "@xenboox/db/schema/organization";

import {
  handleMutationError,
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

export const inventoryPipelineRouter = router({
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
        const result = await runInventoryPipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.name ?? "Entity",
          currency: entityCtx.currency ?? "USD",
          period: input.period,
          userId: ctx.session!.user!.id!,
        });

        return {
          success: result.success,
          period: result.period,
          summary: result.summary,
          lowStockAlerts: result.lowStockAlerts.length,
          discrepancies: result.discrepancies.length,
          cogsEntries: result.cogsEntries.length,
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
        handleMutationError(error, "Inventory pipeline failed");
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
      return getInventoryPipelineStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── Pipeline Runs ───────────────────────────────────────────────────

  listPipelineRuns: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(10) }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.inventoryPipelineRuns.findMany({
        where: eq(inventoryPipelineRuns.entityId, ctx.entityId!),
        orderBy: [desc(inventoryPipelineRuns.createdAt)],
        limit: input?.limit ?? 10,
      });
    }),

  // ── GRN ─────────────────────────────────────────────────────────────

  listGRNs: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(goodsReceivedNotes.entityId, ctx.entityId!)];
      if (input?.status)
        where.push(eq(goodsReceivedNotes.status, input.status));

      return db.query.goodsReceivedNotes.findMany({
        where: and(...where),
        orderBy: [desc(goodsReceivedNotes.receivedDate)],
        limit: input?.limit ?? 20,
        with: { purchaseOrder: true },
      });
    }),

  // ── Stock Count Sessions ────────────────────────────────────────────

  listStockCountSessions: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          warehouseId: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(stockCountSessions.entityId, ctx.entityId!)];
      if (input?.status)
        where.push(eq(stockCountSessions.status, input.status));
      if (input?.warehouseId)
        where.push(eq(stockCountSessions.warehouseId, input.warehouseId));

      return db.query.stockCountSessions.findMany({
        where: and(...where),
        orderBy: [desc(stockCountSessions.sessionDate)],
        limit: input?.limit ?? 20,
        with: { warehouse: true },
      });
    }),

  // ── Stock Count Records (Discrepancies) ─────────────────────────────

  listDiscrepancies: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [
        eq(stockCountRecords.entityId, ctx.entityId!),
        sql`${stockCountRecords.variance} != 0`,
      ];
      if (input?.status) where.push(eq(stockCountRecords.status, input.status));

      return db.query.stockCountRecords.findMany({
        where: and(...where),
        orderBy: [desc(stockCountRecords.createdAt)],
        limit: input?.limit ?? 50,
        with: { inventoryItem: true, warehouse: true },
      });
    }),

  resolveDiscrepancy: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        recordId: z.string().uuid(),
        reason: z
          .string()
          .min(1, "Reason is required for resolving discrepancies"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [updated] = await db
          .update(stockCountRecords)
          .set({
            status: "resolved",
            reason: input.reason,
            resolvedById: ctx.session!.user!.name ?? ctx.session!.user!.email!,
            resolvedAt: new Date(),
            notes: input.notes,
          })
          .where(
            and(
              eq(stockCountRecords.id, input.recordId),
              eq(stockCountRecords.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Stock count record not found",
          });
        }

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to resolve discrepancy");
      }
    }),
});
