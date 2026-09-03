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
  salesInvoices,
  invoicesAp,
} from "@xenboox/db/schema";
import { eq, and, desc, sql, lt } from "drizzle-orm";
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

// ─── Overdue Invoice Detection ─────────────────────────────────────────────
// Runs daily. Marks invoices/bills past their due date as overdue and
// creates notifications for the entity owners.

export const markOverdueInvoices = task({
  id: "mark-overdue-invoices",
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

  onFailure: dlqOnFailure<{ triggeredAt?: string }>({
    task: "mark-overdue-invoices",
    type: "data_validation",
    severity: "medium",
    title: () => "Overdue invoice detection failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]!;

    logger.info("Starting overdue invoice scan", { today: todayStr });

    // 1. Mark overdue sales invoices (pending/partial with dueDate < today)
    const overdueSales = await db
      .update(salesInvoices)
      .set({ status: "overdue" })
      .where(
        and(
          sql`${salesInvoices.status} IN ('pending', 'partial')`,
          lt(salesInvoices.dueDate, todayStr),
        ),
      )
      .returning({
        id: salesInvoices.id,
        entityId: salesInvoices.entityId,
        invoiceNumber: salesInvoices.invoiceNumber,
      });

    logger.info("Marked overdue sales invoices", {
      count: overdueSales.length,
    });

    // 2. Mark overdue purchase invoices (pending/partial with dueDate < today)
    const overdueBills = await db
      .update(invoicesAp)
      .set({ status: "overdue" })
      .where(
        and(
          sql`${invoicesAp.status} IN ('pending', 'partial')`,
          lt(invoicesAp.dueDate, todayStr),
        ),
      )
      .returning({
        id: invoicesAp.id,
        entityId: invoicesAp.entityId,
        invoiceNumber: invoicesAp.invoiceNumber,
      });

    logger.info("Marked overdue purchase invoices", {
      count: overdueBills.length,
    });

    // 3. Create notifications for entities with newly overdue invoices
    const affectedEntityIds = new Set([
      ...overdueSales.map((r) => r.entityId),
      ...overdueBills.map((r) => r.entityId),
    ]);

    let notificationsSent = 0;

    for (const entityId of affectedEntityIds) {
      const owners = await db.query.userEntityAccess.findMany({
        where: and(
          eq(userEntityAccess.entityId, entityId),
          eq(userEntityAccess.role, "owner"),
        ),
      });

      const salesCount = overdueSales.filter(
        (r) => r.entityId === entityId,
      ).length;
      const billsCount = overdueBills.filter(
        (r) => r.entityId === entityId,
      ).length;

      const parts: string[] = [];
      if (salesCount > 0)
        parts.push(
          `${salesCount} customer invoice${salesCount > 1 ? "s" : ""}`,
        );
      if (billsCount > 0)
        parts.push(`${billsCount} bill${billsCount > 1 ? "s" : ""}`);

      const summary = parts.join(" and ");

      // Dedup: don't send if we already notified today for this entity
      for (const owner of owners) {
        const existing = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.userId, owner.userId),
            eq(notifications.entityId, entityId),
            eq(notifications.type, "overdue_invoice"),
            sql`${notifications.createdAt} >= ${todayStr}`,
          ),
        });

        if (!existing) {
          await db.insert(notifications).values({
            userId: owner.userId,
            entityId,
            type: "overdue_invoice",
            priority: "high",
            title: `${summary} now overdue`,
            body: `You have ${summary} past their due date. Review and follow up to get paid faster.`,
            status: "pending",
          });
          notificationsSent++;
        }
      }
    }

    logger.info("Overdue invoice scan completed", {
      salesMarkedOverdue: overdueSales.length,
      billsMarkedOverdue: overdueBills.length,
      notificationsSent,
    });

    return {
      success: true,
      salesMarkedOverdue: overdueSales.length,
      billsMarkedOverdue: overdueBills.length,
      notificationsSent,
    };
  },
});
