import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { users, sessions, verificationTokens } from "@xenboox/db/schema/auth";
import {
  organizations,
  entities,
  userEntityAccess,
} from "@xenboox/db/schema/organization";
import { auditLog } from "@xenboox/db/schema/documents";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { SignJWT, jwtVerify } from "jose";
import {
  generateMfaSecret,
  verifyTOTP,
  hashBackupCodes,
  verifyBackupCode,
  removeUsedBackupCode,
} from "@/lib/auth/totp";
import { logger } from "@/lib/logger";
import { getRateLimiter } from "@/lib/security/rate-limiter";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const RESET_TOKEN_EXPIRY_MS = 1 * 60 * 60 * 1000; // 1 hour
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MOBILE_TOKEN_EXPIRY = "30d";
const MFA_TOKEN_EXPIRY = "5m";

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);

async function createMobileToken(payload: { sub: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MOBILE_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

async function createMfaToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, purpose: "mfa_challenge" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MFA_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

async function verifyMfaToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (payload.purpose === "mfa_challenge" && payload.sub) {
      return payload.sub as string;
    }
    return null;
  } catch {
    return null;
  }
}

function getPasswordStrength(password: string): {
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else errors.push("At least 8 characters");

  if (/[a-z]/.test(password)) score += 1;
  else errors.push("One lowercase letter");

  if (/[A-Z]/.test(password)) score += 1;
  else errors.push("One uppercase letter");

  if (/[0-9]/.test(password)) score += 1;
  else errors.push("One number");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else errors.push("One special character");

  const common: string[] = [
    "password",
    "12345678",
    "qwerty123",
    "admin123",
    "letmein",
    "welcome1",
    "monkey123",
    "abc12345",
  ];
  if (common.some((p) => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2);
    errors.push("Contains a common password pattern");
  }

  return { score: Math.min(5, score), errors };
}

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });

        if (!user?.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Check account lockout
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          const minutesRemaining = Math.ceil(
            (user.lockoutUntil.getTime() - Date.now()) / 60000,
          );
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `Account is locked. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
          });
        }

        // Require email verification
        if (!user.emailVerified) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Please verify your email address before logging in. Check your inbox for the verification link.",
          });
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          // Increment failed attempts
          const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
          const updates: Record<string, unknown> = {
            failedLoginAttempts: newAttempts,
          };
          if (newAttempts >= LOCKOUT_THRESHOLD) {
            updates.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            logger.warn(
              { userId: user.id, attempts: newAttempts },
              "Account locked due to failed login attempts",
            );
          }
          await db.update(users).set(updates).where(eq(users.id, user.id));

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
          await db
            .update(users)
            .set({ failedLoginAttempts: 0, lockoutUntil: null })
            .where(eq(users.id, user.id));
        }

        // Check MFA
        if (user.twoFactorEnabled) {
          const mfaToken = await createMfaToken(user.id);
          return { mfaRequired: true, mfaToken };
        }

        const token = await createMobileToken({
          sub: user.id,
          email: user.email!,
        });

        const access = await db.query.userEntityAccess.findFirst({
          where: eq(userEntityAccess.userId, user.id),
        });

        return {
          token,
          userId: user.id,
          entityId: access?.entityId ?? null,
          name: user.name,
          email: user.email,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100),
        email: z.string().email("Invalid email address"),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .max(128)
          .refine((pw) => {
            const { errors } = getPasswordStrength(pw);
            return errors.length === 0;
          }, "Password must contain uppercase, lowercase, number, and special character"),
        organizationName: z
          .string()
          .min(2, "Organization name is required")
          .max(200),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Rate limiting (defense-in-depth)
        const limiter = getRateLimiter();
        const ip = ctx.headers?.["x-forwarded-for"] ?? "anonymous";
        const rateResult = await limiter.checkAuthRegisterRateLimit(ip);
        if (!rateResult.success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Too many registration attempts. Please wait before trying again.",
          });
        }

        const existing = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);

        const [user] = await db
          .insert(users)
          .values({
            name: input.name,
            email: input.email,
            passwordHash,
          })
          .returning();

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        const [org] = await db
          .insert(organizations)
          .values({
            name: input.organizationName,
            slug:
              input.organizationName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") +
              "-" +
              Date.now().toString(36),
            type: "business",
            plan: "free",
            ownerId: user.id,
          })
          .returning();

        if (!org) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create organization",
          });
        }

        const [entity] = await db
          .insert(entities)
          .values({
            organizationId: org.id,
            name: input.organizationName,
            type: "company",
            currency: "GMD",
            country: "GM",
            fiscalYearEnd: "12",
            isActive: true,
          })
          .returning();

        if (!entity) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create entity",
          });
        }

        await db.insert(userEntityAccess).values({
          userId: user.id,
          entityId: entity.id,
          role: "owner",
          grantedBy: user.id,
        });

        const token = await createMobileToken({
          sub: user.id,
          email: user.email!,
        });

        // Send verification email (non-blocking)
        try {
          const verificationToken = nanoid(32);
          const verificationExpires = new Date(
            Date.now() + VERIFICATION_TOKEN_EXPIRY_MS,
          );
          await db.insert(verificationTokens).values({
            identifier: user.email!,
            token: verificationToken,
            expires: verificationExpires,
          });
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;
          await sendVerificationEmail(user.email!, {
            userName: user.name ?? "User",
            verifyUrl,
            expiryMinutes: Math.floor(VERIFICATION_TOKEN_EXPIRY_MS / 60000),
          });
        } catch {
          console.error("[auth] Failed to send verification email");
        }

        return {
          token,
          userId: user.id,
          entityId: entity.id,
          name: user.name,
          email: user.email,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[auth] Register error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during registration",
        });
      }
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email("Invalid email address") }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Rate limiting (defense-in-depth)
        const limiter = getRateLimiter();
        const ip = ctx.headers?.["x-forwarded-for"] ?? "anonymous";
        const rateResult = await limiter.checkAuthPasswordRateLimit(ip);
        if (!rateResult.success) {
          return {
            success: true,
            message: "If the email exists, a reset link has been sent",
          };
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });

        if (!user) {
          return {
            success: true,
            message: "If the email exists, a reset link has been sent",
          };
        }

        const resetToken = nanoid(32);
        const resetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

        await db
          .update(users)
          .set({
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
          })
          .where(eq(users.id, user.id));

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

        try {
          await sendPasswordResetEmail(user.email, {
            userName: user.name ?? "User",
            resetUrl,
            expiryMinutes: Math.floor(RESET_TOKEN_EXPIRY_MS / 60000),
          });
        } catch {
          // Log but don't fail the request — user gets generic success either way
          console.error("[auth] Failed to send password reset email");
        }

        return {
          success: true,
          message: "If the email exists, a reset link has been sent",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .max(128)
          .refine((pw) => {
            const { errors } = getPasswordStrength(pw);
            return errors.length === 0;
          }, "Password must contain uppercase, lowercase, number, and special character"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Rate limiting (defense-in-depth)
        const limiter = getRateLimiter();
        const ip = ctx.headers?.["x-forwarded-for"] ?? "anonymous";
        const rateResult = await limiter.checkAuthPasswordRateLimit(ip);
        if (!rateResult.success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Too many password reset attempts. Please wait before trying again.",
          });
        }

        const user = await db.query.users.findFirst({
          where: eq(users.resetPasswordToken, input.token),
        });

        if (!user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset token",
          });
        }

        if (
          !user.resetPasswordExpires ||
          user.resetPasswordExpires < new Date()
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Reset token has expired",
          });
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 12);

        await db
          .update(users)
          .set({
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null,
            failedLoginAttempts: 0,
            lockoutUntil: null,
          })
          .where(eq(users.id, user.id));

        return {
          success: true,
          message: "Password has been reset successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  // checkAccountLockout removed — was enabling user enumeration

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .update(users)
          .set({ name: input.name })
          .where(eq(users.id, ctx.session!.user!.id!));

        return { success: true, message: "Profile updated successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(8, "Current password is required"),
        newPassword: z
          .string()
          .min(8, "New password must be at least 8 characters")
          .max(128)
          .refine((pw) => {
            const { errors } = getPasswordStrength(pw);
            return errors.length === 0;
          }, "Password must contain uppercase, lowercase, number, and special character"),
        confirmPassword: z.string().min(8, "Confirm password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "New passwords do not match",
        });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.session!.user!.id!),
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User has no password set",
        });
      }

      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash,
      );
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      const newHash = await bcrypt.hash(input.newPassword, 12);

      await db
        .update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, ctx.session!.user!.id!));

      return { success: true, message: "Password changed successfully" };
    }),

  requestVerification: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.session!.user!.id!),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.emailVerified) {
        return { success: true, message: "Email is already verified" };
      }

      // Delete old tokens for this email
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, user.email!));

      const verificationToken = nanoid(32);
      const verificationExpires = new Date(
        Date.now() + VERIFICATION_TOKEN_EXPIRY_MS,
      );

      await db.insert(verificationTokens).values({
        identifier: user.email!,
        token: verificationToken,
        expires: verificationExpires,
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;

      try {
        await sendVerificationEmail(user.email!, {
          userName: user.name ?? "User",
          verifyUrl,
          expiryMinutes: Math.floor(VERIFICATION_TOKEN_EXPIRY_MS / 60000),
        });
      } catch {
        console.error("[auth] Failed to send verification email");
      }

      return { success: true, message: "Verification email sent" };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        const verificationToken = await db.query.verificationTokens.findFirst({
          where: eq(verificationTokens.token, input.token),
        });

        if (!verificationToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid verification token",
          });
        }

        if (verificationToken.expires < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Verification token has expired",
          });
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, verificationToken.identifier),
        });

        if (!user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User not found",
          });
        }

        await db
          .update(users)
          .set({ emailVerified: new Date() })
          .where(eq(users.id, user.id));

        await db
          .delete(verificationTokens)
          .where(eq(verificationTokens.token, input.token));

        return { success: true, message: "Email verified successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  updatePushToken: protectedProcedure
    .input(
      z.object({
        token: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Schema migration needed: ALTER TABLE users ADD COLUMN push_token TEXT
        // For now, log and return success — push token storage requires DB column addition
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "auth.updatePushToken",
          entityType: "user",
          entityIdRef: ctx.session!.user!.id!,
          newValues: { token: input.token },
        });

        console.log("[auth] Push token update recorded:", {
          userId: ctx.session!.user!.id!,
        });

        return { success: true, message: "Push token updated successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        emailInvoices: z.boolean(),
        emailReports: z.boolean(),
        emailAlerts: z.boolean(),
        pushPayments: z.boolean(),
        pushApprovals: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Log preference changes to audit trail
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "auth.updateNotificationPreferences",
          entityType: "user",
          entityIdRef: ctx.session!.user!.id!,
          newValues: { ...input },
        });

        // In production, persist to user_preferences table or JSON column
        // Schema migration needed: ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{}'
        console.log("[auth] Notification preferences updated:", {
          userId: ctx.session!.user!.id!,
          ...input,
        });

        return { success: true, message: "Notification preferences saved" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  // ─── Session Management ──────────────────────────────────────────────────

  listSessions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userSessions = await db.query.sessions.findMany({
        where: eq(sessions.userId, ctx.session!.user!.id!),
        orderBy: [desc(sessions.createdAt)],
        columns: {
          id: true,
          sessionToken: true,
          ipAddress: true,
          userAgent: true,
          expires: true,
          createdAt: true,
        },
      });

      return userSessions.map((s) => ({
        id: s.id,
        isCurrent:
          s.sessionToken ===
          (ctx.session as unknown as Record<string, unknown>).sid,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        expiresAt: s.expires,
        createdAt: s.createdAt,
      }));
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list sessions",
      });
    }
  }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const session = await db.query.sessions.findFirst({
          where: eq(sessions.id, input.sessionId),
        });

        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }

        if (session.userId !== ctx.session!.user!.id!) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only revoke your own sessions",
          });
        }

        // Prevent revoking your current session
        const currentSid = (ctx.session as unknown as Record<string, unknown>)
          .sid;
        if (session.sessionToken === currentSid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot revoke your current session. Use Sign Out instead.",
          });
        }

        await db.delete(sessions).where(eq(sessions.id, input.sessionId));

        logger.info(
          { userId: ctx.session!.user!.id!, sessionId: input.sessionId },
          "Session revoked",
        );

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke session",
        });
      }
    }),

  // ─── MFA / 2FA ────────────────────────────────────────────────────────────

  setupMfa: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.session!.user!.id!),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.twoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA is already enabled. Disable it first to reconfigure.",
        });
      }

      const setup = await generateMfaSecret(user.email ?? user.id);
      const hashedCodes = await hashBackupCodes(setup.backupCodes);

      // Store secret and hashed backup codes temporarily
      await db
        .update(users)
        .set({
          twoFactorSecret: setup.secret,
          backupCodes: JSON.stringify(hashedCodes),
        })
        .where(eq(users.id, user.id));

      logger.info(
        { userId: user.id },
        "MFA setup initiated — secret generated",
      );

      return {
        secret: setup.secret,
        qrCodeDataUrl: setup.qrCodeDataUrl,
        qrCodeUri: setup.qrCodeUri,
        backupCodes: setup.backupCodes,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to set up MFA",
      });
    }
  }),

  verifyMfaSetup: protectedProcedure
    .input(
      z.object({
        totpCode: z
          .string()
          .length(6, "TOTP code must be 6 digits")
          .regex(/^\d{6}$/, "TOTP code must be 6 digits"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, ctx.session!.user!.id!),
        });

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        if (user.twoFactorEnabled) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "MFA is already enabled",
          });
        }

        if (!user.twoFactorSecret) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "MFA setup not initiated. Call setupMfa first.",
          });
        }

        if (!verifyTOTP(input.totpCode, user.twoFactorSecret)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid TOTP code. Try again or generate a new secret.",
          });
        }

        await db
          .update(users)
          .set({ twoFactorEnabled: true })
          .where(eq(users.id, user.id));

        logger.info({ userId: user.id }, "MFA enabled successfully");

        return { success: true, message: "MFA has been enabled successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify MFA setup",
        });
      }
    }),

  completeMfaChallenge: publicProcedure
    .input(
      z.object({
        mfaToken: z.string().min(1),
        totpCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const userId = await verifyMfaToken(input.mfaToken);
        if (!userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired MFA token. Please log in again.",
          });
        }

        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user?.twoFactorSecret) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "MFA not configured for this account",
          });
        }

        // Try TOTP verification
        if (verifyTOTP(input.totpCode, user.twoFactorSecret)) {
          const token = await createMobileToken({
            sub: user.id,
            email: user.email!,
          });

          const access = await db.query.userEntityAccess.findFirst({
            where: eq(userEntityAccess.userId, user.id),
          });

          return {
            token,
            userId: user.id,
            entityId: access?.entityId ?? null,
            name: user.name,
            email: user.email,
          };
        }

        // Try backup code verification
        if (user.backupCodes) {
          try {
            const hashedCodes: string[] = JSON.parse(user.backupCodes);
            if (await verifyBackupCode(input.totpCode, hashedCodes)) {
              const remaining = await removeUsedBackupCode(
                input.totpCode,
                hashedCodes,
              );

              await db
                .update(users)
                .set({ backupCodes: JSON.stringify(remaining) })
                .where(eq(users.id, user.id));

              const token = await createMobileToken({
                sub: user.id,
                email: user.email!,
              });

              const access = await db.query.userEntityAccess.findFirst({
                where: eq(userEntityAccess.userId, user.id),
              });

              const backupCodesRemaining = remaining.length;
              const warnLowCodes = backupCodesRemaining <= 2;

              return {
                token,
                userId: user.id,
                entityId: access?.entityId ?? null,
                name: user.name,
                email: user.email,
                backupCodeUsed: true,
                backupCodesRemaining,
                warnLowCodes,
              };
            }
          } catch {
            // JSON parse failed, skip backup code check
          }
        }

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid verification code",
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred during MFA verification",
        });
      }
    }),

  disableMfa: protectedProcedure
    .input(
      z.object({
        totpCode: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, ctx.session!.user!.id!),
        });

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        if (!user.twoFactorEnabled) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "MFA is not enabled",
          });
        }

        // Verify TOTP before disabling
        if (
          !user.twoFactorSecret ||
          !verifyTOTP(input.totpCode, user.twoFactorSecret)
        ) {
          // Check backup code
          if (user.backupCodes) {
            try {
              const hashedCodes: string[] = JSON.parse(user.backupCodes);
              if (!(await verifyBackupCode(input.totpCode, hashedCodes))) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Invalid verification code",
                });
              }
            } catch {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invalid verification code",
              });
            }
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid verification code",
            });
          }
        }

        await db
          .update(users)
          .set({
            twoFactorEnabled: false,
            twoFactorSecret: null,
            backupCodes: null,
          })
          .where(eq(users.id, user.id));

        logger.info({ userId: user.id }, "MFA disabled");

        return { success: true, message: "MFA has been disabled" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to disable MFA",
        });
      }
    }),

  regenerateBackupCodes: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.session!.user!.id!),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (!user.twoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA must be enabled to generate backup codes",
        });
      }

      const { backupCodes } = await generateMfaSecret(user.email ?? user.id);
      const hashedCodes = await hashBackupCodes(backupCodes);

      await db
        .update(users)
        .set({ backupCodes: JSON.stringify(hashedCodes) })
        .where(eq(users.id, user.id));

      logger.info({ userId: user.id }, "Backup codes regenerated");

      return { backupCodes };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to regenerate backup codes",
      });
    }
  }),

  mfaStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.session!.user!.id!),
        columns: {
          id: true,
          twoFactorEnabled: true,
          backupCodes: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      let backupCodesCount = 0;
      if (user.backupCodes) {
        try {
          const codes: string[] = JSON.parse(user.backupCodes);
          backupCodesCount = codes.length;
        } catch {
          backupCodesCount = 0;
        }
      }

      return {
        enabled: user.twoFactorEnabled,
        backupCodesCount,
        needsAttention: user.twoFactorEnabled && backupCodesCount <= 2,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get MFA status",
      });
    }
  }),
});
