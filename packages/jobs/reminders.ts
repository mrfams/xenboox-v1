import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import {
  bankConnections,
  documents,
  notifications,
  notificationTypeEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
} from "@xenboox/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { users } from "@xenboox/db/schema/auth";
import { userEntityAccess } from "@xenboox/db/schema/organization";

export const sendMonthlyBankReminders = task({
  id: "send-monthly-bank-reminders",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  onFailure: dlqOnFailure<{ entityId?: string }>({
    task: "send-monthly-bank-reminders",
    type: "review",
    severity: "medium",
    title: () => "Monthly bank reminders failed",
    entityIdFrom: (p) => p.entityId,
  }),

  run: async (payload: { entityId?: string }) => {
    const targetEntityId = payload.entityId;

    logger.info("Starting monthly bank reminder scan", {
      entityId: targetEntityId ?? "all",
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const entityIds = targetEntityId
      ? [targetEntityId]
      : (
          await db
            .select({ entityId: bankConnections.entityId })
            .from(bankConnections)
            .groupBy(bankConnections.entityId)
        ).map((r) => r.entityId);

    let remindersSent = 0;

    for (const entityId of entityIds) {
      const [connections] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bankConnections)
        .where(
          and(
            eq(bankConnections.entityId, entityId),
            sql`${bankConnections.status} = 'active'`,
          ),
        );

      const hasActiveConnection = connections?.count && connections.count > 0;

      const recentStatements = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(
          and(
            eq(documents.entityId, entityId),
            eq(documents.type, "bank_statement"),
            sql`${documents.createdAt} >= ${monthStart}`,
          ),
        );

      const hasRecentStatement = recentStatements?.[0]?.count
        ? recentStatements[0].count > 0
        : false;

      if (!hasActiveConnection && !hasRecentStatement) {
        const owners = await db.query.userEntityAccess.findMany({
          where: and(
            eq(userEntityAccess.entityId, entityId),
            eq(userEntityAccess.role, "owner"),
          ),
        });

        for (const owner of owners) {
          const existing = await db.query.notifications.findFirst({
            where: and(
              eq(notifications.userId, owner.userId),
              eq(notifications.entityId, entityId),
              eq(notifications.type, "bank_upload_reminder"),
              sql`${notifications.createdAt} >= ${monthStart}`,
            ),
          });

          if (!existing) {
            await db.insert(notifications).values({
              userId: owner.userId,
              entityId,
              type: "bank_upload_reminder",
              priority: "medium",
              title: "Monthly bank upload reminder",
              body: `It's almost the end of the month. Please upload your bank statement or connect your bank account via API to keep your books up to date.`,
              status: "pending",
            });

            remindersSent++;
          }
        }
      }
    }

    logger.info("Monthly bank reminder scan completed", {
      entitiesScanned: entityIds.length,
      remindersSent,
    });

    return { success: true, entitiesScanned: entityIds.length, remindersSent };
  },
});
