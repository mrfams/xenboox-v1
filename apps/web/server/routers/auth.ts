import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { users } from "@xenboox/db/schema/auth"
import { organizations, entities, userEntityAccess } from "@xenboox/db/schema/organization"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes
const RESET_TOKEN_EXPIRY_MS = 1 * 60 * 60 * 1000 // 1 hour

export const authRouter = router({
  register: publicProcedure
    .input(z.object({
      name: z.string().min(2, "Name must be at least 2 characters").max(100),
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters").max(128),
      organizationName: z.string().min(2, "Organization name is required").max(200),
    }))
    .mutation(async ({ input }) => {
      try {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        })

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists"
          })
        }

        const passwordHash = await bcrypt.hash(input.password, 12)

        const [user] = await db.insert(users).values({
          name: input.name,
          email: input.email,
          passwordHash,
          emailVerified: new Date(),
        }).returning()

        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" })
        }

        const [org] = await db.insert(organizations).values({
          name: input.organizationName,
          slug: input.organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") + "-" + Date.now().toString(36),
          type: "business",
          plan: "free",
          ownerId: user.id,
        }).returning()

        if (!org) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create organization" })
        }

        const [entity] = await db.insert(entities).values({
          organizationId: org.id,
          name: input.organizationName,
          type: "company",
          currency: "GMD",
          country: "GM",
          fiscalYearEnd: "12",
          isActive: true,
        }).returning()

        if (!entity) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create entity" })
        }

        await db.insert(userEntityAccess).values({
          userId: user.id,
          entityId: entity.id,
          role: "owner",
          grantedBy: user.id,
        })

        return {
          userId: user.id,
          entityId: entity.id,
          name: user.name,
          email: user.email,
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred during registration"
        })
      }
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email("Invalid email address") }))
    .mutation(async ({ input }) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        })

        if (!user) {
          return { success: true, message: "If the email exists, a reset link has been sent" }
        }

        const resetToken = nanoid(32)
        const resetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

        await db.update(users)
          .set({
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
          })
          .where(eq(users.id, user.id))

        // TODO: Send reset email with token — never expose token in API response
        // await sendPasswordResetEmail(user.email, resetToken)

        return {
          success: true,
          message: "If the email exists, a reset link has been sent",
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred"
        })
      }
    }),

  resetPassword: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
    }))
    .mutation(async ({ input }) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.resetPasswordToken, input.token),
        })

        if (!user) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" })
        }

        if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Reset token has expired" })
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 12)

        await db.update(users)
          .set({
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null,
            failedLoginAttempts: 0,
            lockoutUntil: null,
          })
          .where(eq(users.id, user.id))

        return { success: true, message: "Password has been reset successfully" }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred"
        })
      }
    }),

  // checkAccountLockout removed — was enabling user enumeration
})