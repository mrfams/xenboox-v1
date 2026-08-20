import { z } from "zod"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { userSettings, type UserSettings } from "@xenboox/db/schema/user-settings"
import { TRPCError } from "@trpc/server"

export const settingsRouter = router({
  // ─── GET USER SETTINGS ──────────────────────────────

  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
    }

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    })

    if (!settings) {
      // Return empty settings if none exist
      return { settings: {} as UserSettings, updatedAt: null }
    }

    return {
      settings: (settings.settings as UserSettings) || {},
      updatedAt: settings.updatedAt?.toISOString() || null,
    }
  }),

  // ─── SET/UPDATE USER SETTINGS (partial merge) ──────

  set: protectedProcedure
    .input(
      z.object({
        settings: z.record(z.unknown()), // Partial settings to merge
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      // Get existing settings
      const existing = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      })

      // Merge with existing settings
      const merged = {
        ...((existing?.settings as Record<string, unknown>) || {}),
        ...input.settings,
      }

      if (existing) {
        // Update existing record
        const [updated] = await db
          .update(userSettings)
          .set({
            settings: merged,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId))
          .returning()

        return {
          settings: updated.settings as UserSettings,
          updatedAt: updated.updatedAt?.toISOString() || null,
        }
      } else {
        // Create new record
        const [created] = await db
          .insert(userSettings)
          .values({
            userId,
            settings: merged,
          })
          .returning()

        return {
          settings: created.settings as UserSettings,
          updatedAt: created.updatedAt?.toISOString() || null,
        }
      }
    }),

  // ─── REPLACE USER SETTINGS (full overwrite) ────────

  replace: protectedProcedure
    .input(
      z.object({
        settings: z.record(z.unknown()), // Full settings to replace
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      const existing = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      })

      if (existing) {
        const [updated] = await db
          .update(userSettings)
          .set({
            settings: input.settings,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId))
          .returning()

        return {
          settings: updated.settings as UserSettings,
          updatedAt: updated.updatedAt?.toISOString() || null,
        }
      } else {
        const [created] = await db
          .insert(userSettings)
          .values({
            userId,
            settings: input.settings,
          })
          .returning()

        return {
          settings: created.settings as UserSettings,
          updatedAt: created.updatedAt?.toISOString() || null,
        }
      }
    }),

  // ─── DELETE USER SETTINGS ──────────────────────────

  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
    }

    await db.delete(userSettings).where(eq(userSettings.userId, userId))

    return { success: true }
  }),
})
