import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, and, gt, desc, asc, sql, type SQL } from "drizzle-orm";
import {
  router,
  publicProcedure,
  adminProtectedProcedure,
  adminPermissionProcedure,
  type AdminContext,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { adminUsers, adminSessions, adminAuditLog } from "@xenboox/db/schema";
import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import { createMfaChallenge } from "@/lib/admin/mfa-challenge";
import { generateMfaSecret, verifyTOTP } from "@/lib/auth/totp";
import { encryptSecret, decryptSecret } from "@/lib/admin/totp";
import { buildAuditEntry, writeAdminAudit } from "@/lib/admin/audit";
import { canManageAdminUsers, canRevokeAnySession } from "@/lib/admin/roles";
import {
  LOCKOUT_DURATION_MS,
  shouldLockAccount,
  lockoutRemainingMs,
} from "@/lib/admin/session";
import type { Context } from "@/lib/trpc/server";

const adminRoleSchema = z.enum([
  "super_admin",
  "ops_admin",
  "finance_admin",
  "support_agent",
  "read_only_auditor",
]);

const getCtx = (ctx: Context) => ctx as Context & AdminContext;

function getIp(ctx: Context): string | null {
  const fwd = ctx.headers?.["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return ctx.headers?.["x-real-ip"] ?? null;
}

function getUserAgent(ctx: Context): string | null {
  return ctx.headers?.["user-agent"] ?? null;
}

export const adminAccessRouter = router({
  // ─── PUBLIC: password step of 2FA sign-in ───
  auth: router({
    mfaChallenge: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.toLowerCase().trim();
        const user = await db.query.adminUsers.findFirst({
          where: eq(adminUsers.email, email),
        });

        // Same message for missing/invalid so we don't leak account existence.
        const invalid = () =>
          new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });

        if (!user) throw invalid();
        if (!user.isActive) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This admin account has been disabled",
          });
        }

        const now = new Date();
        if (user.lockoutUntil && user.lockoutUntil > now) {
          const minutes = Math.max(
            1,
            Math.ceil(lockoutRemainingMs(user.lockoutUntil, now) / 60000),
          );
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Account locked after repeated failures. Try again in ${minutes} minute(s).`,
          });
        }

        // Optional per-account IP allowlist.
        const ip = getIp(ctx);
        if (
          user.ipAllowlist &&
          user.ipAllowlist.length > 0 &&
          ip &&
          !user.ipAllowlist.includes(ip)
        ) {
          logger.warn(
            { adminUserId: user.id, ip },
            "Admin login blocked — IP not on allowlist",
          );
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your IP address is not permitted to sign in",
          });
        }

        const passwordValid = await bcrypt.compare(
          input.password,
          user.passwordHash,
        );

        if (!passwordValid) {
          const attempts = (user.failedLoginAttempts ?? 0) + 1;
          const updates: Record<string, unknown> = {
            failedLoginAttempts: attempts,
          };
          if (shouldLockAccount(attempts)) {
            updates.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            logger.warn(
              { adminUserId: user.id, attempts },
              "Admin account locked after repeated failed logins",
            );
          }
          await db
            .update(adminUsers)
            .set(updates)
            .where(eq(adminUsers.id, user.id));
          throw invalid();
        }

        if ((user.failedLoginAttempts ?? 0) > 0 || user.lockoutUntil) {
          await db
            .update(adminUsers)
            .set({ failedLoginAttempts: 0, lockoutUntil: null })
            .where(eq(adminUsers.id, user.id));
        }

        const challengeToken = await createMfaChallenge(user.id);
        return { challengeToken };
      }),

    // ─── AUTHENTICATED: self-service MFA enrollment ───
    setupMfa: adminProtectedProcedure.mutation(async ({ ctx }) => {
      const a = getCtx(ctx);
      const mfa = await generateMfaSecret(a.adminUser.email);

      // Store the new secret encrypted but keep totpEnrolled=false until verified.
      await db
        .update(adminUsers)
        .set({
          totpSecretEncrypted: encryptSecret(mfa.secret),
          totpEnrolled: false,
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, a.adminUser.id));

      await writeAdminAudit(
        db,
        buildAuditEntry({
          actorAdminUserId: a.adminUser.id,
          actorRoleAtTimeOfAction: a.adminRole,
          actionType: "admin_mfa.setup_initiated",
          targetEntityType: "admin_user",
          targetEntityId: a.adminUser.id,
          ipAddress: getIp(ctx),
          userAgent: getUserAgent(ctx),
        }),
      );

      return {
        secret: mfa.secret,
        qrCodeUri: mfa.qrCodeUri,
        qrCodeDataUrl: mfa.qrCodeDataUrl,
        backupCodes: mfa.backupCodes,
      };
    }),

    verifyMfaSetup: adminProtectedProcedure
      .input(z.object({ totpCode: z.string().min(6).max(8) }))
      .mutation(async ({ ctx, input }) => {
        const a = getCtx(ctx);

        // Reload to get the pending secret
        const user = await db.query.adminUsers.findFirst({
          where: eq(adminUsers.id, a.adminUser.id),
        });
        if (!user || !user.totpSecretEncrypted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No pending MFA setup. Start setup first.",
          });
        }

        const secret = decryptSecret(user.totpSecretEncrypted);
        if (!secret || !verifyTOTP(input.totpCode, secret)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid verification code. Check your authenticator app.",
          });
        }

        // Code valid — finalize enrollment
        await db
          .update(adminUsers)
          .set({
            totpEnrolled: true,
            updatedAt: new Date(),
          })
          .where(eq(adminUsers.id, a.adminUser.id));

        await writeAdminAudit(
          db,
          buildAuditEntry({
            actorAdminUserId: a.adminUser.id,
            actorRoleAtTimeOfAction: a.adminRole,
            actionType: "admin_mfa.setup_completed",
            targetEntityType: "admin_user",
            targetEntityId: a.adminUser.id,
            ipAddress: getIp(ctx),
            userAgent: getUserAgent(ctx),
          }),
        );

        return { ok: true };
      }),
  }),

  // ─── AUTHENTICATED: current session ───
  session: router({
    me: adminProtectedProcedure.query(({ ctx }) => {
      const a = getCtx(ctx);
      return {
        id: a.adminUser.id,
        email: a.adminUser.email,
        name: a.adminUser.name,
        role: a.adminRole,
        totpEnrolled: a.adminUser.totpEnrolled,
      };
    }),

    listSessions: adminProtectedProcedure.query(async ({ ctx }) => {
      const a = getCtx(ctx);
      return db.query.adminSessions.findMany({
        where: eq(adminSessions.adminUserId, a.adminUser.id),
        orderBy: desc(adminSessions.createdAt),
        columns: {
          id: true,
          ipAddress: true,
          userAgent: true,
          issuedAt: true,
          lastActiveAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
      });
    }),

    revokeSession: adminProtectedProcedure
      .input(
        z.object({
          sessionId: z.string().uuid(),
          reason: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const a = getCtx(ctx);
        const target = await db.query.adminSessions.findFirst({
          where: eq(adminSessions.id, input.sessionId),
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        if (
          target.adminUserId !== a.adminUser.id &&
          !canRevokeAnySession(a.adminRole)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only a super admin can revoke another admin's sessions",
          });
        }
        if (target.id === a.adminSid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot revoke your current session from here",
          });
        }
        await db.transaction(async (tx) => {
          await tx
            .update(adminSessions)
            .set({ revokedAt: new Date() })
            .where(eq(adminSessions.id, input.sessionId));
          await writeAdminAudit(
            tx,
            buildAuditEntry({
              actorAdminUserId: a.adminUser.id,
              actorRoleAtTimeOfAction: a.adminRole,
              actionType: "admin_sessions.revoke",
              targetEntityType: "admin_session",
              targetEntityId: input.sessionId,
              reason: input.reason,
              ipAddress: getIp(ctx),
              userAgent: getUserAgent(ctx),
            }),
          );
        });
        return { ok: true };
      }),

    revokeAllOtherSessions: adminProtectedProcedure
      .input(z.object({ reason: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        const a = getCtx(ctx);
        await db.transaction(async (tx) => {
          await tx
            .update(adminSessions)
            .set({ revokedAt: new Date() })
            .where(
              and(
                eq(adminSessions.adminUserId, a.adminUser.id),
                sql`${adminSessions.id} <> ${a.adminSid}`,
                sql`${adminSessions.revokedAt} IS NULL`,
              ),
            );
          await writeAdminAudit(
            tx,
            buildAuditEntry({
              actorAdminUserId: a.adminUser.id,
              actorRoleAtTimeOfAction: a.adminRole,
              actionType: "admin_sessions.revoke_all_others",
              targetEntityType: "admin_session",
              reason: input.reason,
              ipAddress: getIp(ctx),
              userAgent: getUserAgent(ctx),
            }),
          );
        });
        return { ok: true };
      }),
  }),

  // ─── SUPER ADMIN ONLY: user management ───
  users: router({
    list: adminPermissionProcedure("admin_users", "read").query(async () => {
      return db.query.adminUsers.findMany({
        orderBy: asc(adminUsers.createdAt),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          totpEnrolled: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          ipAllowlist: true,
        },
      });
    }),

    create: adminPermissionProcedure("admin_users", "write")
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().min(1).max(120),
          password: z.string().min(12).max(200),
          role: adminRoleSchema,
          ipAllowlist: z.array(z.string().ip()).max(20).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const a = getCtx(ctx);
        if (!canManageAdminUsers(a.adminRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the super admin can create admin accounts",
          });
        }
        const email = input.email.toLowerCase().trim();
        const existing = await db.query.adminUsers.findFirst({
          where: eq(adminUsers.email, email),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An admin user with this email already exists",
          });
        }

        // Generate the mandatory TOTP secret at creation. The provisioning
        // data is returned exactly once so the creator can hand it to the
        // new admin. It is never returned again.
        const mfa = await generateMfaSecret(email);
        const passwordHash = await bcrypt.hash(input.password, 12);

        const created = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(adminUsers)
            .values({
              email,
              name: input.name,
              passwordHash,
              role: input.role,
              totpSecretEncrypted: encryptSecret(mfa.secret),
              totpEnrolled: true,
              ipAllowlist: input.ipAllowlist?.length ? input.ipAllowlist : null,
              createdByAdminUserId: a.adminUser.id,
              isActive: true,
            })
            .returning();

          await writeAdminAudit(
            tx,
            buildAuditEntry({
              actorAdminUserId: a.adminUser.id,
              actorRoleAtTimeOfAction: a.adminRole,
              actionType: "admin_users.create",
              targetEntityType: "admin_user",
              targetEntityId: row.id,
              afterValue: { email, name: input.name, role: input.role },
              ipAddress: getIp(ctx),
              userAgent: getUserAgent(ctx),
            }),
          );
          return row;
        });

        return {
          id: created.id,
          email: created.email,
          name: created.name,
          role: created.role,
          totpProvisioning: {
            secret: mfa.secret,
            qrCodeUri: mfa.qrCodeUri,
            qrCodeDataUrl: mfa.qrCodeDataUrl,
          },
        };
      }),

    updateRole: adminPermissionProcedure("admin_users", "write")
      .input(z.object({ userId: z.string().uuid(), role: adminRoleSchema }))
      .mutation(async ({ ctx, input }) => {
        const a = getCtx(ctx);
        if (!canManageAdminUsers(a.adminRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the super admin can change admin roles",
          });
        }
        const target = await db.query.adminUsers.findFirst({
          where: eq(adminUsers.id, input.userId),
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin user not found",
          });
        }
        if (target.id === a.adminUser.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot change your own role",
          });
        }
        await db.transaction(async (tx) => {
          await tx
            .update(adminUsers)
            .set({ role: input.role })
            .where(eq(adminUsers.id, input.userId));
          await writeAdminAudit(
            tx,
            buildAuditEntry({
              actorAdminUserId: a.adminUser.id,
              actorRoleAtTimeOfAction: a.adminRole,
              actionType: "admin_users.update_role",
              targetEntityType: "admin_user",
              targetEntityId: input.userId,
              beforeValue: { role: target.role },
              afterValue: { role: input.role },
              ipAddress: getIp(ctx),
              userAgent: getUserAgent(ctx),
            }),
          );
        });
        return { ok: true };
      }),

    setActive: adminPermissionProcedure("admin_users", "write")
      .input(
        z.object({
          userId: z.string().uuid(),
          isActive: z.boolean(),
          reason: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const a = getCtx(ctx);
        if (!canManageAdminUsers(a.adminRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only the super admin can enable or disable admin accounts",
          });
        }
        const target = await db.query.adminUsers.findFirst({
          where: eq(adminUsers.id, input.userId),
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin user not found",
          });
        }
        if (target.id === a.adminUser.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot disable your own account",
          });
        }

        // Never allow disabling the last active super admin.
        if (target.role === "super_admin" && !input.isActive) {
          const activeSupers = await db.query.adminUsers.findMany({
            where: eq(adminUsers.role, "super_admin"),
            columns: { id: true, isActive: true },
          });
          const activeCount = activeSupers.filter((s) => s.isActive).length;
          if (activeCount <= 1) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Cannot disable the last active super admin",
            });
          }
        }

        await db.transaction(async (tx) => {
          await tx
            .update(adminUsers)
            .set({ isActive: input.isActive })
            .where(eq(adminUsers.id, input.userId));
          // Disabling revokes all sessions immediately.
          if (!input.isActive) {
            await tx
              .update(adminSessions)
              .set({ revokedAt: new Date() })
              .where(
                and(
                  eq(adminSessions.adminUserId, input.userId),
                  sql`${adminSessions.revokedAt} IS NULL`,
                ),
              );
          }
          await writeAdminAudit(
            tx,
            buildAuditEntry({
              actorAdminUserId: a.adminUser.id,
              actorRoleAtTimeOfAction: a.adminRole,
              actionType: input.isActive
                ? "admin_users.enable"
                : "admin_users.disable",
              targetEntityType: "admin_user",
              targetEntityId: input.userId,
              beforeValue: { isActive: target.isActive },
              afterValue: { isActive: input.isActive },
              reason: input.reason,
              ipAddress: getIp(ctx),
              userAgent: getUserAgent(ctx),
            }),
          );
        });
        return { ok: true };
      }),

    setIpAllowlist: adminPermissionProcedure("admin_users", "write")
      .input(
        z.object({
          userId: z.string().uuid(),
          ipAllowlist: z.array(z.string().ip()).max(20),
          totpCode: z.string().min(6).max(8),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const a = getCtx(ctx);
        if (!canManageAdminUsers(a.adminRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the super admin can manage IP allowlists",
          });
        }
        // High-privilege action requires fresh TOTP confirmation.
        const secret = a.adminUser.totpSecretEncrypted
          ? decryptSecret(a.adminUser.totpSecretEncrypted)
          : null;
        if (!secret || !verifyTOTP(input.totpCode, secret)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Invalid two-factor code — please confirm with your authenticator",
          });
        }
        const target = await db.query.adminUsers.findFirst({
          where: eq(adminUsers.id, input.userId),
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin user not found",
          });
        }
        await db.transaction(async (tx) => {
          await tx
            .update(adminUsers)
            .set({
              ipAllowlist: input.ipAllowlist.length ? input.ipAllowlist : null,
            })
            .where(eq(adminUsers.id, input.userId));
          await writeAdminAudit(
            tx,
            buildAuditEntry({
              actorAdminUserId: a.adminUser.id,
              actorRoleAtTimeOfAction: a.adminRole,
              actionType: "admin_users.set_ip_allowlist",
              targetEntityType: "admin_user",
              targetEntityId: input.userId,
              beforeValue: { ipAllowlist: target.ipAllowlist },
              afterValue: { ipAllowlist: input.ipAllowlist },
              ipAddress: getIp(ctx),
              userAgent: getUserAgent(ctx),
            }),
          );
        });
        return { ok: true };
      }),
  }),

  // ─── AUDIT LOG ───
  audit: router({
    list: adminPermissionProcedure("audit_log", "read")
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(25),
          offset: z.number().int().min(0).default(0),
          actionType: z.string().optional(),
          adminUserId: z.string().uuid().optional(),
          since: z.string().datetime().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const a = getCtx(ctx);

        const conditions: SQL[] = [];
        // Non-super, non-auditor roles only see their own history.
        const scoped =
          a.adminRole !== "super_admin" && a.adminRole !== "read_only_auditor";
        if (scoped) {
          conditions.push(eq(adminAuditLog.actorAdminUserId, a.adminUser.id));
        }
        if (input.actionType) {
          conditions.push(eq(adminAuditLog.actionType, input.actionType));
        }
        if (input.adminUserId) {
          conditions.push(
            eq(adminAuditLog.actorAdminUserId, input.adminUserId),
          );
        }
        if (input.since) {
          conditions.push(gt(adminAuditLog.createdAt, new Date(input.since)));
        }
        const where = conditions.length ? and(...conditions) : undefined;

        const rows = await db.query.adminAuditLog.findMany({
          where,
          orderBy: desc(adminAuditLog.createdAt),
          limit: input.limit,
          offset: input.offset,
        });
        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(adminAuditLog)
          .where(where ?? sql`true`);
        return { rows, total: countResult[0]?.count ?? 0 };
      }),

    stats: adminPermissionProcedure("audit_log", "read").query(async () => {
      const rows = await db
        .select({
          actionType: adminAuditLog.actionType,
          count: sql<number>`count(*)::int`,
        })
        .from(adminAuditLog)
        .groupBy(adminAuditLog.actionType)
        .orderBy(desc(sql`count(*)`));
      return rows;
    }),
  }),
});
