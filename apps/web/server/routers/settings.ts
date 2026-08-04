import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { entitySettings } from "@xenboox/db/schema/entity-settings";
import { users } from "@xenboox/db/schema/auth";
import { userPreferences } from "@xenboox/db/schema/user-preferences";
import { apiKeys } from "@xenboox/db/schema/api-keys";
import { auditLog } from "@xenboox/db/schema/documents";
import { handleMutationError } from "@/lib/trpc/server";
import { createHash, randomBytes } from "crypto";

export const settingsRouter = router({
  // ─── Entity Settings ──────────────────────────────────────────────────────

  getEntitySettings: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.entityId) return null;
    const settings = await db.query.entitySettings.findFirst({
      where: eq(entitySettings.entityId, ctx.entityId),
    });
    return settings ?? null;
  }),

  updateEntitySettings: protectedProcedure
    .input(
      z.object({
        approvalThresholdMinor: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount")
          .optional(),
        approvalThresholdCurrency: z.string().length(3).optional(),
        alwaysRequireApproval: z.array(z.string()).optional(),
        fiscalLocaleOverrides: z
          .object({
            currencyFormat: z.string().optional(),
            dateFormat: z.string().optional(),
            decimalSeparator: z.string().optional(),
            thousandsSeparator: z.string().optional(),
            locale: z.string().optional(),
          })
          .optional(),
        fiscalYearStartMonth: z.number().min(1).max(12).optional(),
        allowAutoApprove: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.entityId) {
          throw new Error("No entity selected");
        }

        // Check if settings exist
        const existing = await db.query.entitySettings.findFirst({
          where: eq(entitySettings.entityId, ctx.entityId),
        });

        if (existing) {
          // Update
          const [updated] = await db
            .update(entitySettings)
            .set({
              ...(input.approvalThresholdMinor !== undefined && {
                approvalThresholdMinor: input.approvalThresholdMinor,
              }),
              ...(input.approvalThresholdCurrency !== undefined && {
                approvalThresholdCurrency: input.approvalThresholdCurrency,
              }),
              ...(input.alwaysRequireApproval !== undefined && {
                alwaysRequireApproval: input.alwaysRequireApproval,
              }),
              ...(input.fiscalLocaleOverrides !== undefined && {
                fiscalLocaleOverrides: input.fiscalLocaleOverrides,
              }),
              ...(input.fiscalYearStartMonth !== undefined && {
                fiscalYearStartMonth: input.fiscalYearStartMonth,
              }),
              ...(input.allowAutoApprove !== undefined && {
                allowAutoApprove: input.allowAutoApprove,
              }),
            })
            .where(eq(entitySettings.entityId, ctx.entityId))
            .returning();
          return updated;
        } else {
          // Insert
          const [created] = await db
            .insert(entitySettings)
            .values({
              entityId: ctx.entityId,
              ...(input.approvalThresholdMinor !== undefined && {
                approvalThresholdMinor: input.approvalThresholdMinor,
              }),
              ...(input.approvalThresholdCurrency !== undefined && {
                approvalThresholdCurrency: input.approvalThresholdCurrency,
              }),
              ...(input.alwaysRequireApproval !== undefined && {
                alwaysRequireApproval: input.alwaysRequireApproval,
              }),
              ...(input.fiscalLocaleOverrides !== undefined && {
                fiscalLocaleOverrides: input.fiscalLocaleOverrides,
              }),
              ...(input.fiscalYearStartMonth !== undefined && {
                fiscalYearStartMonth: input.fiscalYearStartMonth,
              }),
              ...(input.allowAutoApprove !== undefined && {
                allowAutoApprove: input.allowAutoApprove,
              }),
            })
            .returning();
          return created;
        }
      } catch (error) {
        handleMutationError(error, "Failed to update entity settings");
      }
    }),

  // ─── Notification Preferences ─────────────────────────────────────────────

  getNotificationPrefs: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;
    const userId = ctx.session.user.id!;

    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return (
      prefs?.notifications ?? {
        emailInvoices: true,
        emailReports: true,
        emailAlerts: true,
        emailReminders: true,
        pushPayments: true,
        pushApprovals: true,
        pushDeadlines: true,
        weeklyDigest: true,
      }
    );
  }),

  updateNotificationPrefs: protectedProcedure
    .input(
      z.object({
        emailInvoices: z.boolean(),
        emailReports: z.boolean(),
        emailAlerts: z.boolean(),
        emailReminders: z.boolean(),
        pushPayments: z.boolean(),
        pushApprovals: z.boolean(),
        pushDeadlines: z.boolean(),
        weeklyDigest: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.entityId) {
          throw new Error("No entity selected");
        }

        const userId = ctx.session!.user!.id!;

        // Upsert user preferences
        const existing = await db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });

        if (existing) {
          await db
            .update(userPreferences)
            .set({ notifications: input, updatedAt: new Date() })
            .where(eq(userPreferences.userId, userId));
        } else {
          await db.insert(userPreferences).values({
            userId,
            notifications: input,
          });
        }

        // Log to audit trail
        await db.insert(auditLog).values({
          entityId: ctx.entityId,
          userId,
          action: "settings.updateNotificationPrefs",
          entityType: "user",
          entityIdRef: userId,
          newValues: { ...input },
        });

        return { success: true, message: "Notification preferences saved" };
      } catch (error) {
        handleMutationError(error, "Failed to update notification preferences");
      }
    }),

  // ─── Appearance Preferences ──────────────────────────────────────────────

  getAppearancePrefs: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;
    const userId = ctx.session.user.id!;

    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return {
      theme: prefs?.theme ?? "system",
      language: prefs?.language ?? "en",
      timezone: prefs?.timezone ?? "UTC",
      dateFormat: prefs?.dateFormat ?? "YYYY-MM-DD",
    };
  }),

  updateAppearancePrefs: protectedProcedure
    .input(
      z.object({
        theme: z.enum(["light", "dark", "system"]).optional(),
        language: z.string().optional(),
        timezone: z.string().optional(),
        dateFormat: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.entityId) {
          throw new Error("No entity selected");
        }

        const userId = ctx.session!.user!.id!;

        const existing = await db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });

        if (existing) {
          await db
            .update(userPreferences)
            .set({
              ...(input.theme !== undefined && { theme: input.theme }),
              ...(input.language !== undefined && { language: input.language }),
              ...(input.timezone !== undefined && { timezone: input.timezone }),
              ...(input.dateFormat !== undefined && {
                dateFormat: input.dateFormat,
              }),
              updatedAt: new Date(),
            })
            .where(eq(userPreferences.userId, userId));
        } else {
          await db.insert(userPreferences).values({
            userId,
            theme: input.theme,
            language: input.language,
            timezone: input.timezone,
            dateFormat: input.dateFormat,
          });
        }

        return { success: true, message: "Appearance preferences saved" };
      } catch (error) {
        handleMutationError(error, "Failed to update appearance preferences");
      }
    }),

  // ─── Security Preferences ────────────────────────────────────────────────

  getSecurityPrefs: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;
    const userId = ctx.session.user.id!;

    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return (
      prefs?.security ?? {
        requirePasswordChange: false,
        sessionTimeout: 60,
        loginNotifications: true,
      }
    );
  }),

  updateSecurityPrefs: protectedProcedure
    .input(
      z.object({
        requirePasswordChange: z.boolean().optional(),
        sessionTimeout: z.number().min(5).max(1440).optional(),
        loginNotifications: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.entityId) {
          throw new Error("No entity selected");
        }

        const userId = ctx.session!.user!.id!;

        const existing = await db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });

        if (existing) {
          await db
            .update(userPreferences)
            .set({
              security: input,
              updatedAt: new Date(),
            })
            .where(eq(userPreferences.userId, userId));
        } else {
          await db.insert(userPreferences).values({
            userId,
            security: input,
          });
        }

        return { success: true, message: "Security preferences saved" };
      } catch (error) {
        handleMutationError(error, "Failed to update security preferences");
      }
    }),

  // ─── API Keys ─────────────────────────────────────────────────────────────

  getApiKeys: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.entityId) return [];

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.entityId, ctx.entityId),
      orderBy: [desc(apiKeys.createdAt)],
    });

    // Don't return the actual key, only metadata
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      provider: key.provider,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }),

  createApiKey: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        provider: z.string().min(1),
        scopes: z.array(z.string()).optional(),
        expiresInDays: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.entityId) {
          throw new Error("No entity selected");
        }

        const userId = ctx.session!.user!.id!;

        // Generate API key
        const keyPrefix = `xb_${input.provider}_`;
        const rawKey = randomBytes(32).toString("hex");
        const fullKey = `${keyPrefix}${rawKey}`;
        const keyHash = createHash("sha256").update(fullKey).digest("hex");

        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : null;

        const [created] = await db
          .insert(apiKeys)
          .values({
            entityId: ctx.entityId,
            userId,
            name: input.name,
            provider: input.provider,
            keyPrefix: fullKey.substring(0, 16),
            keyHash,
            scopes: input.scopes ?? [],
            expiresAt,
          })
          .returning();

        // Log to audit trail
        await db.insert(auditLog).values({
          entityId: ctx.entityId,
          userId,
          action: "settings.createApiKey",
          entityType: "api_key",
          entityIdRef: created.id,
          newValues: { name: input.name, provider: input.provider },
        });

        return {
          id: created.id,
          key: fullKey, // Only returned once!
          name: created.name,
          provider: created.provider,
          expiresAt: created.expiresAt,
        };
      } catch (error) {
        handleMutationError(error, "Failed to create API key");
      }
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.entityId) {
          throw new Error("No entity selected");
        }

        const userId = ctx.session!.user!.id!;

        await db
          .update(apiKeys)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(eq(apiKeys.id, input.id), eq(apiKeys.entityId, ctx.entityId)),
          );

        // Log to audit trail
        await db.insert(auditLog).values({
          entityId: ctx.entityId,
          userId,
          action: "settings.revokeApiKey",
          entityType: "api_key",
          entityIdRef: input.id,
          oldValues: { isActive: true },
          newValues: { isActive: false },
        });

        return { success: true, message: "API key revoked" };
      } catch (error) {
        handleMutationError(error, "Failed to revoke API key");
      }
    }),

  // ─── Audit Log ────────────────────────────────────────────────────────────

  getAuditLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.entityId) return { logs: [], total: 0 };

      const logs = await db.query.auditLog.findMany({
        where: eq(auditLog.entityId, ctx.entityId),
        orderBy: [desc(auditLog.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return { logs, total: logs.length };
    }),

  // ─── Data Export ──────────────────────────────────────────────────────────

  exportUserData: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.entityId) {
        throw new Error("No entity selected");
      }

      const userId = ctx.session!.user!.id!;

      // Get user preferences
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      // Get user data
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      // Log the export
      await db.insert(auditLog).values({
        entityId: ctx.entityId,
        userId,
        action: "settings.exportUserData",
        entityType: "user",
        entityIdRef: userId,
      });

      return {
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              createdAt: user.createdAt,
            }
          : null,
        preferences: prefs,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      handleMutationError(error, "Failed to export user data");
    }
  }),

  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmation: z.literal("DELETE"),
      }),
    )
    .mutation(async ({ ctx }) => {
      try {
        if (!ctx.entityId) {
          throw new Error("No entity selected");
        }

        const userId = ctx.session!.user!.id!;

        // Log the deletion request
        await db.insert(auditLog).values({
          entityId: ctx.entityId,
          userId,
          action: "settings.deleteAccountRequest",
          entityType: "user",
          entityIdRef: userId,
        });

        // In production, this would:
        // 1. Queue the account for deletion
        // 2. Send confirmation email
        // 3. Schedule actual deletion after grace period

        return {
          success: true,
          message:
            "Account deletion request received. You will receive an email to confirm.",
        };
      } catch (error) {
        handleMutationError(error, "Failed to process account deletion");
      }
    }),
});
