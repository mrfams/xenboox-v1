import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc } from "drizzle-orm"
import { router, protectedProcedure, mutateProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import {
  fixedAssets,
  depreciationSchedule,
  auditLog,
} from "@xenboox/db/schema"
import { userEntityAccess } from "@xenboox/db/schema/organization"
import { users } from "@xenboox/db/schema/auth"
import { sendAssetCreatedEmail } from "@/lib/email"
import { getEnrichedEntityContext } from "@/lib/entity-context-enrichment"

// ─── Fixed Assets Router ───────────────────────────────────────────────────

export const fixedAssetsRouter = router({
  listAssets: protectedProcedure.query(({ ctx }) => {
    return db.query.fixedAssets.findMany({
      where: eq(fixedAssets.entityId, ctx.entityId!),
      orderBy: [desc(fixedAssets.createdAt)],
    })
  }),

  getAssetById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const asset = await db.query.fixedAssets.findFirst({
        where: and(eq(fixedAssets.id, input.id), eq(fixedAssets.entityId, ctx.entityId!)),
      })
      if (!asset) return null

      const schedule = await db.query.depreciationSchedule.findMany({
        where: and(eq(depreciationSchedule.fixedAssetId, asset.id), eq(depreciationSchedule.entityId, ctx.entityId!)),
        orderBy: [desc(depreciationSchedule.createdAt)],
      })

      return { ...asset, depreciationSchedule: schedule }
    }),

  createAsset: mutateProcedure
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
        depreciationMethod: z.enum(["straight_line", "reducing_balance", "units_of_production"]).default("straight_line"),
        responsiblePerson: z.string().optional(),
        glAccountId: z.string().uuid().optional(),
        accumulatedDepreciationAccountId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const cost = parseFloat(input.cost)
        const salvage = parseFloat(input.salvageValue)
        const nbv = cost - salvage

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
          .returning()

        if (!asset) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create asset" })
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "fixedAssets.createAsset",
          entityType: "fixed_asset",
          entityIdRef: asset.id,
          newValues: { name: input.name, assetClass: input.assetClass, cost: input.cost, salvageValue: input.salvageValue, usefulLifeMonths: input.usefulLifeMonths, depreciationMethod: input.depreciationMethod },
        })

        // Send email notification (non-blocking)
        const ownerAccess = await db.query.userEntityAccess.findFirst({
          where: and(
            eq(userEntityAccess.entityId, ctx.entityId!),
            eq(userEntityAccess.role, "owner")
          ),
          with: { user: true }
        })
        const recipientEmail = ownerAccess?.user?.email ?? ctx.session!.user!.email!

        getEnrichedEntityContext(ctx.entityId!).then((entityCtx) => {
          sendAssetCreatedEmail(recipientEmail, {
            assetName: input.name,
            assetClass: input.assetClass,
            cost: input.cost,
            currency: entityCtx.currency,
            usefulLifeMonths: input.usefulLifeMonths,
            depreciationMethod: input.depreciationMethod,
            entityName: entityCtx.entityName,
          }).catch(console.error)
        }).catch(console.error)

        return asset
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create asset" })
      }
    }),

  updateAsset: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        location: z.string().optional(),
        status: z.enum(["active", "disposed", "fully_depreciated", "under_maintenance"]).optional(),
        condition: z.string().optional(),
        responsiblePerson: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [updated] = await db
        .update(fixedAssets)
        .set(data)
        .where(and(eq(fixedAssets.id, id), eq(fixedAssets.entityId, ctx.entityId!)))
        .returning()
      return updated
    }),

  disposeAsset: mutateProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        disposalDate: z.string(),
        disposalMethod: z.enum(["sold", "scrapped", "donated", "written_off"]),
        disposalProceeds: z.string().default("0"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input
        const [updated] = await db
          .update(fixedAssets)
          .set({
            status: "disposed",
            disposalDate: data.disposalDate,
            disposalMethod: data.disposalMethod,
            disposalProceeds: data.disposalProceeds,
          })
          .where(and(eq(fixedAssets.id, id), eq(fixedAssets.entityId, ctx.entityId!)))
          .returning()

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" })
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "fixedAssets.disposeAsset",
          entityType: "fixed_asset",
          entityIdRef: id,
          oldValues: { status: "active" },
          newValues: { status: "disposed", disposalDate: data.disposalDate, disposalMethod: data.disposalMethod, disposalProceeds: data.disposalProceeds },
        })

        return updated
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to dispose asset" })
      }
    }),

  getDepreciationSchedule: protectedProcedure
    .input(z.object({ assetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.depreciationSchedule.findMany({
        where: and(eq(depreciationSchedule.fixedAssetId, input.assetId), eq(depreciationSchedule.entityId, ctx.entityId!)),
        orderBy: [desc(depreciationSchedule.createdAt)],
      })
    }),
})
