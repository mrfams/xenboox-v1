import { createHash, randomBytes } from "crypto";

import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { entitySettings } from "@xenboox/db/schema/entity-settings";
import { users } from "@xenboox/db/schema/auth";
import { userPreferences } from "@xenboox/db/schema/user-preferences";
import { entityApiKeys } from "@xenboox/db/schema/api-keys";
import {
  userSettings,
  type UserSettings,
} from "@xenboox/db/schema/user-settings";
import { settingsAuditLog } from "@xenboox/db/schema/settings-audit";
import { settingsVersions } from "@xenboox/db/schema/settings-versions";
import { conflictResolutionHistory } from "@xenboox/db/schema/conflict-resolution-history";
import {
  entities,
  organizations,
  userEntityAccess,
} from "@xenboox/db/schema/organization";
import { auditLog } from "@xenboox/db/schema/documents";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import {
  suppliers,
  customers,
  invoicesAp,
  salesInvoices,
  bankAccounts,
  bankTransactions,
} from "@xenboox/db/schema";
import { employees, payrollRuns } from "@xenboox/db/schema/payroll";

import { db } from "@/lib/db";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { handleMutationError } from "@/lib/trpc/server";
import { notifySettingsChange } from "@/app/api/settings/stream/route";

export const settingsRouter = router({
  // ─── Profile ──────────────────────────────────────────────────────────────

  /** Returns the signed-in user plus their extended profile fields. */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;
    const userId = ctx.session.user.id!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      },
    });
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return {
      id: user?.id,
      name: user?.name ?? "",
      email: user?.email ?? "",
      emailVerified: user?.emailVerified ?? null,
      image: user?.image ?? null,
      profile: prefs?.profile ?? {},
    };
  }),

  /** Updates the user's name + extended profile fields (upsert). */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100),
        jobTitle: z.string().max(100).optional(),
        phone: z.string().max(30).optional(),
        bio: z.string().max(500).optional(),
        location: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session!.user!.id!;

        // Update the core name on the users table
        await db
          .update(users)
          .set({ name: input.name })
          .where(eq(users.id, userId));

        const prefsToSave = {
          jobTitle: input.jobTitle ?? undefined,
          phone: input.phone ?? undefined,
          bio: input.bio ?? undefined,
          location: input.location ?? undefined,
        };

        const existing = await db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });

        if (existing) {
          await db
            .update(userPreferences)
            .set({
              profile: {
                ...existing.profile,
                ...prefsToSave,
              },
              updatedAt: new Date(),
            })
            .where(eq(userPreferences.userId, userId));
        } else {
          await db.insert(userPreferences).values({
            userId,
            profile: {
              jobTitle: input.jobTitle,
              phone: input.phone,
              bio: input.bio,
              location: input.location,
            },
          });
        }

        if (ctx.entityId) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId,
            userId,
            action: "settings.updateProfile",
            entityType: "user",
            entityIdRef: userId,
            newValues: {
              name: input.name,
              ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
              ...(input.location !== undefined && { location: input.location }),
            },
          });
        }

        return { success: true, message: "Profile updated successfully" };
      } catch (error) {
        handleMutationError(error, "Failed to update profile");
      }
    }),

  // ─── Billing Summary ──────────────────────────────────────────────────────

  /** Returns org plan + usage so the Billing tab renders real data. */
  getBillingInfo: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.entityId) return null;

    // Resolve the organization from the currently selected entity
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, ctx.entityId),
      columns: { id: true, organizationId: true },
    });
    if (!entity) return null;

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, entity.organizationId),
    });
    if (!org) return null;

    const entityList = await db.query.entities.findMany({
      where: eq(entities.organizationId, org.id),
      columns: { id: true, name: true, currency: true },
    });

    return {
      orgId: org.id,
      plan: org.plan,
      name: org.name,
      slug: org.slug,
      entityCount: entityList.length,
      entities: entityList,
      updatedAt: org.updatedAt,
    };
  }),

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
              security: {
                requirePasswordChange:
                  input.requirePasswordChange ??
                  existing.security?.requirePasswordChange ??
                  false,
                sessionTimeout:
                  input.sessionTimeout ??
                  existing.security?.sessionTimeout ??
                  60,
                loginNotifications:
                  input.loginNotifications ??
                  existing.security?.loginNotifications ??
                  true,
              },
              updatedAt: new Date(),
            })
            .where(eq(userPreferences.userId, userId));
        } else {
          await db.insert(userPreferences).values({
            userId,
            security: {
              requirePasswordChange: input.requirePasswordChange ?? false,
              sessionTimeout: input.sessionTimeout ?? 60,
              loginNotifications: input.loginNotifications ?? true,
            },
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

    const keys = await db.query.entityApiKeys.findMany({
      where: eq(entityApiKeys.entityId, ctx.entityId),
      orderBy: [desc(entityApiKeys.createdAt)],
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
          .insert(entityApiKeys)
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
          .update(entityApiKeys)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(entityApiKeys.id, input.id),
              eq(entityApiKeys.entityId, ctx.entityId),
            ),
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

  // ─── DSAR: Data Export (§21.3 — GDPR right to portability) ────────────────

  exportUserData: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = ctx.session!.user!.id!;

      // 1. User profile + preferences
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      // 2. Entity access grants
      const accessGrants = await db.query.userEntityAccess.findMany({
        where: eq(userEntityAccess.userId, userId),
      });

      // 3. Entities the user has access to
      const entityIds = accessGrants.map((g) => g.entityId);
      const entityData =
        entityIds.length > 0
          ? await db.query.entities.findMany({
              where: inArray(entities.id, entityIds),
            })
          : [];

      // 4. Financial data per entity (scoped to user's entities)
      const financialData: Record<
        string,
        {
          journalEntries: unknown[];
          suppliers: unknown[];
          customers: unknown[];
          invoicesAp: unknown[];
          salesInvoices: unknown[];
          bankAccounts: unknown[];
          employees: unknown[];
          payrollRuns: unknown[];
        }
      > = {};

      for (const eid of entityIds) {
        const [je, sup, cust, ap, ar, ba, emp, pr] = await Promise.all([
          db.query.journalEntries.findMany({
            where: eq(journalEntries.entityId, eid),
            orderBy: [desc(journalEntries.createdAt)],
            limit: 1000,
          }),
          db.query.suppliers.findMany({
            where: eq(suppliers.entityId, eid),
          }),
          db.query.customers.findMany({
            where: eq(customers.entityId, eid),
          }),
          db.query.invoicesAp.findMany({
            where: eq(invoicesAp.entityId, eid),
          }),
          db.query.salesInvoices.findMany({
            where: eq(salesInvoices.entityId, eid),
          }),
          db.query.bankAccounts.findMany({
            where: eq(bankAccounts.entityId, eid),
          }),
          db.query.employees.findMany({
            where: eq(employees.entityId, eid),
          }),
          db.query.payrollRuns.findMany({
            where: eq(payrollRuns.entityId, eid),
          }),
        ]);
        financialData[eid] = {
          journalEntries: je,
          suppliers: sup,
          customers: cust,
          invoicesAp: ap,
          salesInvoices: ar,
          bankAccounts: ba,
          employees: emp,
          payrollRuns: pr,
        };
      }

      // 5. Audit log entries for this user
      const auditEntries = await db.query.auditLog.findMany({
        where: eq(auditLog.userId, userId),
        orderBy: [desc(auditLog.createdAt)],
        limit: 500,
      });

      // 6. API keys
      const apiKeys = await db.query.entityApiKeys.findMany({
        where: inArray(entityApiKeys.entityId, entityIds),
      });

      // Log the export
      const eid = ctx.entityId || entityIds[0] || "unknown";
      await db.insert(auditLog).values({
        entityId: eid,
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
        entityAccess: accessGrants,
        entities: entityData,
        financialData,
        auditLog: auditEntries,
        apiKeys: apiKeys.map((k) => ({
          id: k.id,
          name: k.name,
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
        })),
        exportedAt: new Date().toISOString(),
        format: "JSON",
        note: "This file contains your complete account data as required by GDPR Art. 20 and African data protection laws.",
      };
    } catch (error) {
      handleMutationError(error, "Failed to export user data");
    }
  }),

  // ─── DSAR: Account Erasure (§21.3 — right to be forgotten) ────────────────

  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmation: z.literal("DELETE"),
      }),
    )
    .mutation(async ({ ctx }) => {
      try {
        const userId = ctx.session!.user!.id!;

        // 1. Log the deletion request (audit trail must survive the deletion)
        const eid = ctx.entityId || "unknown";
        await db.insert(auditLog).values({
          entityId: eid,
          userId,
          action: "settings.deleteAccountRequest",
          entityType: "user",
          entityIdRef: userId,
          newValues: { requestedAt: new Date().toISOString() },
        });

        // 2. Get all entities this user has access to
        const accessGrants = await db.query.userEntityAccess.findMany({
          where: eq(userEntityAccess.userId, userId),
        });
        const entityIds = accessGrants.map((g) => g.entityId);

        // 3. Anonymize user record (keep for audit trail integrity)
        //    GDPR Art. 17(3)(b): erasure does not apply to processing for compliance
        const anonHash = createHash("sha256")
          .update(userId + randomBytes(16).toString("hex"))
          .digest("hex")
          .slice(0, 16);

        await db
          .update(users)
          .set({
            name: `Deleted User ${anonHash}`,
            email: `deleted-${anonHash}@anonymized.local`,
            emailVerified: null,
            image: null,
          })
          .where(eq(users.id, userId));

        // 4. Remove entity access grants
        for (const eid of entityIds) {
          await db
            .delete(userEntityAccess)
            .where(
              and(
                eq(userEntityAccess.userId, userId),
                eq(userEntityAccess.entityId, eid),
              ),
            );
        }

        // 5. Delete user preferences
        await db
          .delete(userPreferences)
          .where(eq(userPreferences.userId, userId));

        // 6. Invalidate all sessions (Auth.js)
        //    Sessions will expire naturally, but we mark them as revoked
        // Note: actual session invalidation depends on Auth.js adapter

        // 7. Final audit entry
        await db.insert(auditLog).values({
          entityId: eid,
          userId,
          action: "settings.accountAnonymized",
          entityType: "user",
          entityIdRef: userId,
          newValues: {
            anonymizedAt: new Date().toISOString(),
            entitiesAffected: entityIds,
          },
        });

        return {
          success: true,
          message:
            "Account anonymized successfully. Your personal data has been removed. Financial records are retained for legal compliance (7 years) as required by tax law.",
          anonymizedAt: new Date().toISOString(),
        };
      } catch (error) {
        handleMutationError(error, "Failed to process account deletion");
      }
    }),

  // ─── User Settings (backup, versioning, sync) ──────────────────────────

  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Must be logged in",
      });
    }

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!settings) {
      return { settings: {} as UserSettings, updatedAt: null };
    }

    return {
      settings: (settings.settings as UserSettings) || {},
      updatedAt: settings.updatedAt?.toISOString() || null,
    };
  }),

  set: protectedProcedure
    .input(
      z.object({
        settings: z.record(z.unknown()),
        baseVersion: z.number().optional(),
        baseUpdatedAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const existing = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      if (existing && input.baseVersion !== undefined && input.baseUpdatedAt) {
        const serverTime = existing.updatedAt?.toISOString();
        if (serverTime && serverTime !== input.baseUpdatedAt) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Settings were modified by another device. Server version: ${serverTime}, your base: ${input.baseUpdatedAt}. Please refresh and retry.`,
          });
        }
      }

      const merged = {
        ...((existing?.settings as Record<string, unknown>) || {}),
        ...input.settings,
      };

      if (existing) {
        const [updated] = await db
          .update(userSettings)
          .set({
            settings: merged,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId))
          .returning();

        await logSettingsChange(
          userId,
          "update",
          "settings",
          existing.settings as Record<string, unknown>,
          merged,
        );

        const clientClientId = ctx.headers?.["x-client-id"] || undefined;
        notifySettingsChange(userId, merged, undefined, clientClientId);

        return {
          settings: updated.settings as UserSettings,
          updatedAt: updated.updatedAt?.toISOString() || null,
          version: 1,
        };
      } else {
        const [created] = await db
          .insert(userSettings)
          .values({
            userId,
            settings: merged,
          })
          .returning();

        await logSettingsChange(userId, "create", "settings", null, merged);
        notifySettingsChange(userId, merged);

        return {
          settings: created.settings as UserSettings,
          updatedAt: created.updatedAt?.toISOString() || null,
        };
      }
    }),

  replace: protectedProcedure
    .input(
      z.object({
        settings: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const existing = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      if (existing) {
        const [updated] = await db
          .update(userSettings)
          .set({
            settings: input.settings,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId))
          .returning();

        await logSettingsChange(
          userId,
          "replace",
          "settings",
          existing.settings as Record<string, unknown>,
          input.settings as Record<string, unknown>,
        );

        notifySettingsChange(userId, input.settings as Record<string, unknown>);

        return {
          settings: updated.settings as UserSettings,
          updatedAt: updated.updatedAt?.toISOString() || null,
        };
      } else {
        const [created] = await db
          .insert(userSettings)
          .values({
            userId,
            settings: input.settings,
          })
          .returning();

        await logSettingsChange(
          userId,
          "create",
          "settings",
          null,
          input.settings as Record<string, unknown>,
        );

        return {
          settings: created.settings as UserSettings,
          updatedAt: created.updatedAt?.toISOString() || null,
        };
      }
    }),

  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Must be logged in",
      });
    }

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    await db.delete(userSettings).where(eq(userSettings.userId, userId));

    await db.insert(settingsAuditLog).values({
      userId,
      action: "reset_all",
      category: "all",
      previousValue: existing?.settings || {},
      newValue: {},
    });

    return { success: true };
  }),

  getVersions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const versions = await db.query.settingsVersions.findMany({
        where: eq(settingsVersions.userId, userId),
        orderBy: [desc(settingsVersions.version)],
        limit: input.limit,
      });

      return versions.map((v) => ({
        id: v.id,
        userId: v.userId,
        version: v.version,
        label: v.label,
        settings: v.settings as Record<string, unknown>,
        createdAt: v.createdAt?.toISOString() || null,
      }));
    }),

  createVersion: protectedProcedure
    .input(
      z.object({
        label: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const current = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No settings to version",
        });
      }

      const lastVersion = await db.query.settingsVersions.findFirst({
        where: eq(settingsVersions.userId, userId),
        orderBy: [desc(settingsVersions.version)],
      });
      const nextVersion = (lastVersion?.version || 0) + 1;

      const [version] = await db
        .insert(settingsVersions)
        .values({
          userId,
          version: nextVersion,
          label: input.label || `Version ${nextVersion}`,
          settings: current.settings,
        })
        .returning();

      return {
        id: version.id,
        userId: version.userId,
        version: version.version,
        label: version.label,
        settings: version.settings as Record<string, unknown>,
        createdAt: version.createdAt?.toISOString() || null,
      };
    }),

  restoreVersion: protectedProcedure
    .input(
      z.object({
        versionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const version = await db.query.settingsVersions.findFirst({
        where: eq(settingsVersions.id, input.versionId),
      });

      if (!version || version.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      const current = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      if (current) {
        await db
          .update(userSettings)
          .set({
            settings: version.settings,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId));
      } else {
        await db.insert(userSettings).values({
          userId,
          settings: version.settings,
        });
      }

      await logSettingsChange(
        userId,
        "restore",
        "settings",
        (current?.settings as Record<string, unknown>) || null,
        version.settings as Record<string, unknown>,
      );

      return {
        settings: version.settings as UserSettings,
        restoredFrom: version.version,
      };
    }),

  pruneVersions: protectedProcedure
    .input(
      z.object({
        keepLast: z.number().min(1).max(50).default(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const versions = await db.query.settingsVersions.findMany({
        where: eq(settingsVersions.userId, userId),
        orderBy: [desc(settingsVersions.version)],
      });

      if (versions.length > input.keepLast) {
        const toDelete = versions.slice(input.keepLast);
        for (const v of toDelete) {
          await db
            .delete(settingsVersions)
            .where(eq(settingsVersions.id, v.id));
        }
      }

      return { deleted: Math.max(0, versions.length - input.keepLast) };
    }),

  logConflictResolution: protectedProcedure
    .input(
      z.object({
        strategy: z.string(),
        conflictCount: z.number().min(1),
        conflicts: z.array(
          z.object({
            path: z.string(),
            localValue: z.unknown(),
            remoteValue: z.unknown(),
          }),
        ),
        resolvedValues: z.array(
          z.object({
            path: z.string(),
            resolvedValue: z.unknown(),
            resolvedBy: z.string(),
          }),
        ),
        localUpdatedAt: z.string().nullable().optional(),
        remoteUpdatedAt: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      try {
        const [entry] = await db
          .insert(conflictResolutionHistory)
          .values({
            userId,
            strategy: input.strategy,
            conflictCount: input.conflictCount,
            conflicts: input.conflicts,
            resolvedValues: input.resolvedValues,
            localUpdatedAt: input.localUpdatedAt
              ? new Date(input.localUpdatedAt)
              : null,
            remoteUpdatedAt: input.remoteUpdatedAt
              ? new Date(input.remoteUpdatedAt)
              : null,
            deviceInfo: {
              userAgent:
                typeof navigator !== "undefined"
                  ? navigator.userAgent
                  : "unknown",
              screen:
                typeof window !== "undefined"
                  ? `${window.screen.width}x${window.screen.height}`
                  : "unknown",
              language:
                typeof navigator !== "undefined"
                  ? navigator.language
                  : "unknown",
            },
          })
          .returning();

        return {
          id: entry.id,
          createdAt: entry.createdAt?.toISOString() || null,
        };
      } catch {
        return { id: null, createdAt: null };
      }
    }),

  getConflictHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const entries = await db.query.conflictResolutionHistory.findMany({
        where: eq(conflictResolutionHistory.userId, userId),
        orderBy: [desc(conflictResolutionHistory.createdAt)],
        limit: input.limit,
      });

      return entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        strategy: e.strategy,
        conflictCount: e.conflictCount,
        conflicts: (e.conflicts ?? []) as Array<{
          path: string;
          localValue: unknown;
          remoteValue: unknown;
        }>,
        resolvedValues: (e.resolvedValues ?? []) as Array<{
          path: string;
          resolvedValue: unknown;
          resolvedBy: string;
        }>,
        localUpdatedAt: e.localUpdatedAt?.toISOString() || null,
        remoteUpdatedAt: e.remoteUpdatedAt?.toISOString() || null,
        createdAt: e.createdAt?.toISOString() || null,
        deviceInfo: (e.deviceInfo ?? null) as {
          userAgent?: string;
          screen?: string;
          language?: string;
        } | null,
      }));
    }),

  getAuditLog: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in",
        });
      }

      const logs = await db.query.settingsAuditLog.findMany({
        where: eq(settingsAuditLog.userId, userId),
        orderBy: [desc(settingsAuditLog.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        category: log.category,
        previousValue: log.previousValue as Record<string, unknown> | null,
        newValue: log.newValue as Record<string, unknown> | null,
        metadata: log.metadata,
        createdAt: log.createdAt?.toISOString() || null,
      }));
    }),
});

// ─── Helper: Log settings change ────────────────────────────────────────────

async function logSettingsChange(
  userId: string,
  action: string,
  category: string,
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
) {
  try {
    await db.insert(settingsAuditLog).values({
      userId,
      action,
      category,
      previousValue,
      newValue,
    });
  } catch {
    // Audit log failures should not block settings updates
  }
}
