import { z } from "zod"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq, desc } from "drizzle-orm"
import { userSettings, type UserSettings } from "@xenboox/db/schema/user-settings"
import { settingsAuditLog } from "@xenboox/db/schema/settings-audit"
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

        // Log the change
        await logSettingsChange(
          userId,
          "update",
          "settings",
          existing.settings as Record<string, unknown>,
          merged
        )

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

        // Log the creation
        await logSettingsChange(userId, "create", "settings", null, merged)

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

        // Log the replace
        await logSettingsChange(
          userId,
          "replace",
          "settings",
          existing.settings as Record<string, unknown>,
          input.settings as Record<string, unknown>
        )

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

        // Log the creation
        await logSettingsChange(userId, "create", "settings", null, input.settings as Record<string, unknown>)

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

    // Get current settings for audit log
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    })

    await db.delete(userSettings).where(eq(userSettings.userId, userId))

    // Log the deletion
    await db.insert(settingsAuditLog).values({
      userId,
      action: "reset_all",
      category: "all",
      previousValue: existing?.settings || {},
      newValue: {},
    })

    return { success: true }
  }),

  // ─── GET AUDIT LOG ─────────────────────────────────

  getAuditLog: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      const logs = await db.query.settingsAuditLog.findMany({
        where: eq(settingsAuditLog.userId, userId),
        orderBy: [desc(settingsAuditLog.createdAt)],
        limit: input.limit,
        offset: input.offset,
      })

      return logs.map((log) => ({
        ...log,
        createdAt: log.createdAt?.toISOString() || null,
      }))
    }),
})

// ─── Helper: Log settings change ─────────────────────────────────────────────

async function logSettingsChange(
  userId: string,
  action: string,
  category: string,
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
) {
  try {
    await db.insert(settingsAuditLog).values({
      userId,
      action,
      category,
      previousValue,
      newValue,
    })
  } catch {
    // Audit log failures should not block settings updates
  }
}
