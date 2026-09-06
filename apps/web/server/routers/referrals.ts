import { z } from "zod";
import { eq, and, count, desc } from "drizzle-orm";
import {
  referralCodes,
  referralSignups,
  referralRewards,
} from "@xenboox/db/schema/referrals";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Referrals Router ──────────────────────────────────────────────────────

export const referralsRouter = router({
  /**
   * Get or create the current user's referral code.
   */
  getMyCode: rlsProtectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id!;
    const entityId = ctx.entityId!;

    let existing = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.userId, userId),
    });

    if (!existing) {
      // Generate a unique code: 8 hex chars. `code` is UNIQUE in the schema —
      // retry on the (rare) collision instead of 500ing the first query.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = `XBX-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
        const [created] = await db
          .insert(referralCodes)
          .values({
            userId,
            entityId,
            code,
          })
          .onConflictDoNothing({ target: referralCodes.code })
          .returning();
        if (created) {
          existing = created;
          break;
        }
      }
      if (!existing) {
        existing = await db.query.referralCodes.findFirst({
          where: eq(referralCodes.userId, userId),
        });
      }
    }

    return existing;
  }),

  /**
   * Get referral stats for the current user.
   */
  getStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id!;

    const code = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.userId, userId),
    });

    if (!code) {
      return {
        totalReferrals: 0,
        activatedReferrals: 0,
        pendingReferrals: 0,
        rewards: [],
      };
    }

    const allSignups = await db.query.referralSignups.findMany({
      where: eq(referralSignups.referralCodeId, code.id),
      orderBy: [desc(referralSignups.createdAt)],
    });

    const rewards = await db.query.referralRewards.findMany({
      where: eq(referralRewards.userId, userId),
      orderBy: [desc(referralRewards.grantedAt)],
    });

    return {
      totalReferrals: allSignups.length,
      activatedReferrals: allSignups.filter(
        (s) => s.status === "activated" || s.status === "rewarded",
      ).length,
      pendingReferrals: allSignups.filter((s) => s.status === "pending").length,
      rewards,
    };
  }),

  /**
   * List all referrals for the current user.
   */
  listReferrals: rlsProtectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id!;

    const code = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.userId, userId),
    });

    if (!code) return [];

    return db.query.referralSignups.findMany({
      where: eq(referralSignups.referralCodeId, code.id),
      orderBy: [desc(referralSignups.createdAt)],
    });
  }),

  /**
   * Record a signup from a referral link (called during registration).
   */
  recordSignup: rlsProtectedProcedure
    .input(
      z.object({
        code: z.string(),
        refereeEmail: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      const referralCode = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, input.code),
      });

      if (!referralCode) {
        return { success: false, error: "Invalid referral code" };
      }

      // Check for duplicate
      const existing = await db.query.referralSignups.findFirst({
        where: and(
          eq(referralSignups.referralCodeId, referralCode.id),
          eq(referralSignups.refereeEmail, input.refereeEmail),
        ),
      });

      if (existing) {
        return { success: false, error: "Already referred" };
      }

      const [signup] = await db
        .insert(referralSignups)
        .values({
          referralCodeId: referralCode.id,
          referrerUserId: referralCode.userId,
          refereeEmail: input.refereeEmail,
          status: "pending",
        })
        .returning();

      return { success: true, signupId: signup.id };
    }),
});
