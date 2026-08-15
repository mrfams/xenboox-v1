import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import {
  fixedAssets,
  depreciationSchedule,
  auditLog,
} from "@xenboox/db/schema";
import { userEntityAccess } from "@xenboox/db/schema/organization";
import { users } from "@xenboox/db/schema/auth";

import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requirePermission,
} from "@/lib/trpc/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { sendAssetCreatedEmail } from "@/lib/email";
import { getEnrichedEntityContext } from "@/lib/entity-context-enrichment";

// ─── Fixed Assets Router ───────────────────────────────────────────────────

export const fixedAssetsRouter = router({
  listAssets: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.fixedAssets.findMany({
      where: eq(fixedAssets.entityId, ctx.entityId!),
      orderBy: [desc(fixedAssets.createdAt)],
      limit: 500,
    });
  }),

  getAssetById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const asset = await db.query.fixedAssets.findFirst({
        where: and(
          eq(fixedAssets.id, input.id),
          eq(fixedAssets.entityId, ctx.entityId!),
        ),
      });
      if (!asset) return null;

      const schedule = await db.query.depreciationSchedule.findMany({
        where: and(
          eq(depreciationSchedule.fixedAssetId, asset.id),
          eq(depreciationSchedule.entityId, ctx.entityId!),
        ),
        orderBy: [desc(depreciationSchedule.createdAt)],
      });

      return { ...asset, depreciationSchedule: schedule };
    }),

  createAsset: rlsMutateProcedure
    .use(requirePermission("fixed_assets", "create"))
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        assetClass: z.string().min(1),
        location: z.string().optional(),
        purchaseDate: z.string(),
        cost: z.string(),
        salvageValue: z.string().default("0"),
        usefulLifeMonths: z.number().int().positive(),
        depreciationMethod: z
          .enum(["straight_line", "reducing_balance", "units_of_production"])
          .default("straight_line"),
        responsiblePerson: z.string().optional(),
        glAccountId: z.string().uuid().optional(),
        accumulatedDepreciationAccountId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const cost = parseFloat(input.cost);
        const salvage = parseFloat(input.salvageValue);
        const nbv = cost - salvage;

        const [asset] = await db
          .insert(fixedAssets)
          .values({
            ...input,
            entityId: ctx.entityId!,
            cost: input.cost,
            salvageValue: input.salvageValue,
            accumulatedDepreciation: "0",
            netBookValue: nbv.toFixed(2),
            status: "active",
          })
          .returning();

        if (!asset) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create asset",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "fixedAssets.createAsset",
          entityType: "fixed_asset",
          entityIdRef: asset.id,
          newValues: {
            name: input.name,
            assetClass: input.assetClass,
            cost: input.cost,
            salvageValue: input.salvageValue,
            usefulLifeMonths: input.usefulLifeMonths,
            depreciationMethod: input.depreciationMethod,
          },
        });

        // Send email notification (non-blocking)
        const ownerAccess = await db.query.userEntityAccess.findFirst({
          where: and(
            eq(userEntityAccess.entityId, ctx.entityId!),
            eq(userEntityAccess.role, "owner"),
          ),
          with: { user: true },
        });
        const recipientEmail =
          (ownerAccess?.user as { email?: string } | undefined)?.email ??
          ctx.session!.user!.email!;

        getEnrichedEntityContext(ctx.entityId!)
          .then((entityCtx) => {
            sendAssetCreatedEmail(recipientEmail, {
              assetName: input.name,
              assetClass: input.assetClass,
              cost: input.cost,
              currency: entityCtx.currency,
              usefulLifeMonths: input.usefulLifeMonths,
              depreciationMethod: input.depreciationMethod,
              entityName: entityCtx.entityName,
            }).catch((e) =>
              logger.error({ err: e }, "Failed to send asset email"),
            );
          })
          .catch((e) =>
            logger.error({ err: e }, "Failed to send asset notification"),
          );

        return asset;
      } catch (error) {
        handleMutationError(error, "Failed to create asset");
      }
    }),

  updateAsset: rlsMutateProcedure
    .use(requirePermission("fixed_assets", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        location: z.string().optional(),
        status: z
          .enum([
            "active",
            "disposed",
            "fully_depreciated",
            "under_maintenance",
          ])
          .optional(),
        condition: z.string().optional(),
        responsiblePerson: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(fixedAssets)
          .set(data)
          .where(
            and(
              eq(fixedAssets.id, id),
              eq(fixedAssets.entityId, ctx.entityId!),
            ),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update asset");
      }
    }),

  disposeAsset: rlsMutateProcedure
    .use(requirePermission("fixed_assets", "delete"))
    .input(
      z.object({
        id: z.string().uuid(),
        disposalDate: z.string(),
        disposalMethod: z.enum(["sold", "scrapped", "donated", "written_off"]),
        disposalProceeds: z.string().default("0"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(fixedAssets)
          .set({
            status: "disposed",
            disposalDate: data.disposalDate,
            disposalMethod: data.disposalMethod,
            disposalProceeds: data.disposalProceeds,
          })
          .where(
            and(
              eq(fixedAssets.id, id),
              eq(fixedAssets.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Asset not found",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "fixedAssets.disposeAsset",
          entityType: "fixed_asset",
          entityIdRef: id,
          oldValues: { status: "active" },
          newValues: {
            status: "disposed",
            disposalDate: data.disposalDate,
            disposalMethod: data.disposalMethod,
            disposalProceeds: data.disposalProceeds,
          },
        });

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to dispose asset");
      }
    }),

  getDepreciationSchedule: rlsProtectedProcedure
    .input(z.object({ assetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.depreciationSchedule.findMany({
        where: and(
          eq(depreciationSchedule.fixedAssetId, input.assetId),
          eq(depreciationSchedule.entityId, ctx.entityId!),
        ),
        orderBy: [desc(depreciationSchedule.createdAt)],
      });
    }),

  deleteAsset: rlsMutateProcedure
    .use(requirePermission("fixed_assets", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const asset = await db.query.fixedAssets.findFirst({
          where: and(
            eq(fixedAssets.id, input.id),
            eq(fixedAssets.entityId, ctx.entityId!),
          ),
        });
        if (!asset)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Asset not found",
          });
        if (asset.status === "disposed")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a disposed asset",
          });
        // Delete depreciation schedule first
        await db
          .delete(depreciationSchedule)
          .where(eq(depreciationSchedule.fixedAssetId, input.id));
        await db.delete(fixedAssets).where(eq(fixedAssets.id, input.id));
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "fixedAssets.deleteAsset",
          entityType: "fixed_asset",
          entityIdRef: input.id,
          newValues: { name: asset.name },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete asset");
      }
    }),

  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const assets = await db.query.fixedAssets.findMany({
      where: eq(fixedAssets.entityId, entityId),
    });

    const totalAssets = assets.reduce(
      (sum, a) => sum + parseFloat(a.cost ?? "0"),
      0,
    );
    const totalDepreciation = assets.reduce(
      (sum, a) => sum + parseFloat(a.accumulatedDepreciation ?? "0"),
      0,
    );
    const netBookValue = assets.reduce(
      (sum, a) => sum + parseFloat(a.netBookValue ?? "0"),
      0,
    );
    const activeAssets = assets.filter((a) => a.status === "active").length;
    const disposedThisMonth = assets.filter(
      (a) => a.status === "disposed",
    ).length;

    return {
      summary: {
        totalAssets,
        totalAssetsChange: 0,
        totalDepreciation,
        netBookValue,
        activeAssets,
        disposedThisMonth,
        assetsCount: assets.length,
      },
    };
  }),

  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const assets = await db.query.fixedAssets.findMany({
      where: eq(fixedAssets.entityId, entityId),
    });

    const insights = [
      {
        id: "1",
        type: "info" as const,
        title: "Asset Portfolio Health",
        description: `${assets.length} assets tracked with total NBV of GMD ${assets.reduce((sum, a) => sum + parseFloat(a.netBookValue ?? "0"), 0).toLocaleString()}`,
        actionLabel: "View Details",
      },
      {
        id: "2",
        type: "warning" as const,
        title: "Depreciation Due",
        description: `${assets.filter((a) => a.status === "active").length} active assets require depreciation scheduling`,
        actionLabel: "Schedule Now",
      },
    ];

    return insights;
  }),
});
