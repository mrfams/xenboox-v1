import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import {
  users,
  entities,
  transactions,
  journalEntries,
} from "@xenboox/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

// ─── Onboarding Drip Email Sequence ──────────────────────────────────────
//
// Sends a 6-email drip campaign to new users:
//   Day 0: Welcome
//   Day 1: Check-in (bank connected?)
//   Day 3: Value reminder (transactions processed?)
//   Day 7: Advanced features
//   Day 14: Success check (feedback request)
//   Day 30: Habit formation (power user)
//
// Triggered daily via Vercel cron → Trigger.dev

type OnboardingUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  entityId: string | null;
};

async function getOnboardingUsers(): Promise<OnboardingUser[]> {
  // Get users created in the last 35 days (covers all 6 emails)
  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

  const recentUsers = await db.query.users.findMany({
    where: gte(users.createdAt, thirtyFiveDaysAgo),
    columns: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  // Get entity IDs for each user
  const usersWithEntities: OnboardingUser[] = [];
  for (const user of recentUsers) {
    const userEntity = await db.query.userEntityAccess.findFirst({
      where: eq(userEntityAccess.userId, user.id),
      columns: { entityId: true },
    });
    usersWithEntities.push({
      ...user,
      entityId: userEntity?.entityId ?? null,
    });
  }

  return usersWithEntities;
}

function daysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function hasConnectedBank(entityId: string): Promise<boolean> {
  const bankAccount = await db.query.bankAccounts.findFirst({
    where: eq(bankAccounts.entityId, entityId),
    columns: { id: true },
  });
  return !!bankAccount;
}

async function getTransactionStats(entityId: string) {
  const txCount = await db
    .select({ value: count() })
    .from(transactions)
    .where(eq(transactions.entityId, entityId));

  const journalCount = await db
    .select({ value: count() })
    .from(journalEntries)
    .where(eq(journalEntries.entityId, entityId));

  return {
    transactionsProcessed: txCount[0]?.value ?? 0,
    reportsGenerated: journalCount[0]?.value ?? 0,
  };
}

export const processOnboardingDrip = task({
  id: "process-onboarding-drip",
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  onFailure: dlqOnFailure<{ triggeredAt: string }>({
    task: "process-onboarding-drip",
    type: "email_delivery",
    severity: "medium",
    title: () => "Onboarding drip sequence failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();
    logger.info("Starting onboarding drip sequence", { triggeredAt });

    const users = await getOnboardingUsers();
    logger.info("Found onboarding users", { count: users.length });

    let emailsSent = 0;
    let emailsFailed = 0;
    const results: Array<{
      userId: string;
      email: string;
      day: number;
      sent: boolean;
      error?: string;
    }> = [];

    // Lazy import email functions to avoid circular deps
    const {
      sendOnboardingWelcomeEmail,
      sendOnboardingDay1Email,
      sendOnboardingDay3Email,
      sendOnboardingDay7Email,
      sendOnboardingDay14Email,
      sendOnboardingDay30Email,
    } = await import("@/lib/email");

    const dashboardUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://xenboox.com";

    for (const user of users) {
      const days = daysSince(user.createdAt);
      const userName = user.name?.split(" ")[0] ?? "there";

      try {
        // Day 0: Welcome (sent within first day)
        if (days === 0) {
          await sendOnboardingWelcomeEmail(user.email, {
            userName,
            dashboardUrl,
          });
          emailsSent++;
          results.push({
            userId: user.id,
            email: user.email,
            day: 0,
            sent: true,
          });
          continue;
        }

        // Day 1: Check-in
        if (days === 1 && user.entityId) {
          const bankConnected = await hasConnectedBank(user.entityId);
          await sendOnboardingDay1Email(user.email, {
            userName,
            dashboardUrl,
            hasConnectedBank: bankConnected,
          });
          emailsSent++;
          results.push({
            userId: user.id,
            email: user.email,
            day: 1,
            sent: true,
          });
          continue;
        }

        // Day 3: Value reminder
        if (days === 3 && user.entityId) {
          const stats = await getTransactionStats(user.entityId);
          await sendOnboardingDay3Email(user.email, {
            userName,
            dashboardUrl,
            transactionsProcessed: stats.transactionsProcessed,
            timeSavedMinutes: Math.round(stats.transactionsProcessed * 0.5), // ~30 sec per transaction
          });
          emailsSent++;
          results.push({
            userId: user.id,
            email: user.email,
            day: 3,
            sent: true,
          });
          continue;
        }

        // Day 7: Advanced features
        if (days === 7) {
          await sendOnboardingDay7Email(user.email, {
            userName,
            dashboardUrl,
          });
          emailsSent++;
          results.push({
            userId: user.id,
            email: user.email,
            day: 7,
            sent: true,
          });
          continue;
        }

        // Day 14: Success check
        if (days === 14 && user.entityId) {
          const stats = await getTransactionStats(user.entityId);
          await sendOnboardingDay14Email(user.email, {
            userName,
            dashboardUrl,
            transactionsCategorized: stats.transactionsProcessed,
            reportsGenerated: stats.reportsGenerated,
          });
          emailsSent++;
          results.push({
            userId: user.id,
            email: user.email,
            day: 14,
            sent: true,
          });
          continue;
        }

        // Day 30: Habit formation
        if (days === 30 && user.entityId) {
          const stats = await getTransactionStats(user.entityId);
          await sendOnboardingDay30Email(user.email, {
            userName,
            dashboardUrl,
            transactionsCategorized: stats.transactionsProcessed,
            timeSavedHours:
              Math.round(((stats.transactionsProcessed * 0.5) / 60) * 10) / 10,
          });
          emailsSent++;
          results.push({
            userId: user.id,
            email: user.email,
            day: 30,
            sent: true,
          });
          continue;
        }
      } catch (error) {
        emailsFailed++;
        results.push({
          userId: user.id,
          email: user.email,
          day: days,
          sent: false,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.error("Failed to send onboarding email", {
          userId: user.id,
          email: user.email,
          day: days,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Onboarding drip sequence completed", {
      totalUsers: users.length,
      emailsSent,
      emailsFailed,
    });

    return {
      success: emailsFailed === 0,
      totalUsers: users.length,
      emailsSent,
      emailsFailed,
      results,
    };
  },
});
