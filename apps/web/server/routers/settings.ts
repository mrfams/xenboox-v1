import { z } from "zod"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq, desc } from "drizzle-orm"
import { userSettings, type UserSettings } from "@xenboox/db/schema/user-settings"
import { settingsAuditLog } from "@xenboox/db/schema/settings-audit"
import { settingsVersions } from "@xenboox/db/schema/settings-versions"
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

  // ─── GET VERSION HISTORY ───────────────────────────

  getVersions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      const versions = await db.query.settingsVersions.findMany({
        where: eq(settingsVersions.userId, userId),
        orderBy: [desc(settingsVersions.version)],
        limit: input.limit,
      })

      return versions.map((v) => ({
        ...v,
        createdAt: v.createdAt?.toISOString() || null,
      }))
    }),

  // ─── CREATE VERSION SNAPSHOT ───────────────────────

  createVersion: protectedProcedure
    .input(
      z.object({
        label: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      // Get current settings
      const current = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      })

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No settings to version" })
      }

      // Get next version number
      const lastVersion = await db.query.settingsVersions.findFirst({
        where: eq(settingsVersions.userId, userId),
        orderBy: [desc(settingsVersions.version)],
      })
      const nextVersion = (lastVersion?.version || 0) + 1

      // Create version snapshot
      const [version] = await db
        .insert(settingsVersions)
        .values({
          userId,
          version: nextVersion,
          label: input.label || `Version ${nextVersion}`,
          settings: current.settings,
        })
        .returning()

      return {
        ...version,
        createdAt: version.createdAt?.toISOString() || null,
      }
    }),

  // ─── RESTORE FROM VERSION ──────────────────────────

  restoreVersion: protectedProcedure
    .input(
      z.object({
        versionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      // Get the version to restore
      const version = await db.query.settingsVersions.findFirst({
        where: eq(settingsVersions.id, input.versionId),
      })

      if (!version || version.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" })
      }

      // Get current settings for audit log
      const current = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      })

      // Restore settings
      if (current) {
        await db
          .update(userSettings)
          .set({
            settings: version.settings,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId))
      } else {
        await db.insert(userSettings).values({
          userId,
          settings: version.settings,
        })
      }

      // Log the restore
      await logSettingsChange(
        userId,
        "restore",
        "settings",
        current?.settings as Record<string, unknown> || null,
        version.settings as Record<string, unknown>
      )
n      return {
        settings: version.settings as UserSettings,
        restoredFrom: version.version,
      }
    }),

  // ─── DELETE OLD VERSIONS (keep last N) ────────────

  pruneVersions: protectedProcedure
    .input(
      z.object({
        keepLast: z.number().min(1).max(50).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      // Get all versions
      const versions = await db.query.settingsVersions.findMany({
        where: eq(settingsVersions.userId, userId),
        orderBy: [desc(settingsVersions.version)],
      })

      // Delete versions beyond the keep limit
      if (versions.length > input.keepLast) {
        const toDelete = versions.slice(input.keepLast)
        for (const v of toDelete) {
          await db.delete(settingsVersions).where(eq(settingsVersions.id, v.id))
        }
      }

      return { deleted: Math.max(0, versions.length - input.keepLast) }
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
