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
  auditLog,
} from "@xenboox/db/schema";
import { eq, and, desc, sql, lt, inArray } from "drizzle-orm";
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
        // Owners + admins — the people who can actually connect a bank.
        const owners = await db.query.userEntityAccess.findMany({
          where: and(
            eq(userEntityAccess.entityId, entityId),
            inArray(userEntityAccess.role, ["owner", "admin"]),
          ),
        });

        for (const owner of owners) {
          try {
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
          } catch (err) {
            // One failing notification must never abort the entity batch.
            logger.error(
              { err, entityId, userId: owner.userId },
              "Failed to send monthly bank reminder",
            );
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

    // 1. Mark overdue sales invoices (pending/partial with dueDate < today).
    // Date-format guard: legacy rows with non-ISO dueDate strings must not be
    // silently marked overdue by a lexicographic text comparison — they are
    // surfaced for manual repair instead.
    const overdueSales = await db
      .update(salesInvoices)
      .set({ status: "overdue" })
      .where(
        and(
          sql`${salesInvoices.status} IN ('pending', 'partial')`,
          lt(salesInvoices.dueDate, todayStr),
          sql`${salesInvoices.dueDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`,
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

    // Audit trail for AR overdue transitions (system actor)
    if (overdueSales.length > 0) {
      await db.insert(auditLog).values(
        overdueSales.map((r) => ({
          entityId: r.entityId,
          userId: null,
          action: "system.markOverdue",
          entityType: "sales_invoice",
          entityIdRef: r.id,
          newValues: { status: "overdue", invoiceNumber: r.invoiceNumber },
          actorType: "system",
          reason: "Daily overdue scan — dueDate < today",
        })),
      );
    }

    // 2. Mark overdue purchase invoices (pending/partial with dueDate < today)
    // — same ISO-date guard as AR.
    const overdueBills = await db
      .update(invoicesAp)
      .set({ status: "overdue" })
      .where(
        and(
          sql`${invoicesAp.status} IN ('pending', 'partial')`,
          lt(invoicesAp.dueDate, todayStr),
          sql`${invoicesAp.dueDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`,
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

    if (overdueBills.length > 0) {
      await db.insert(auditLog).values(
        overdueBills.map((r) => ({
          entityId: r.entityId,
          userId: null,
          action: "system.markOverdue",
          entityType: "invoice_ap",
          entityIdRef: r.id,
          newValues: { status: "overdue", invoiceNumber: r.invoiceNumber },
          actorType: "system",
          reason: "Daily overdue scan — dueDate < today",
        })),
      );
    }

    // 3. Create notifications for entities with newly overdue invoices
    const affectedEntityIds = new Set([
      ...overdueSales.map((r) => r.entityId),
      ...overdueBills.map((r) => r.entityId),
    ]);

    let notificationsSent = 0;

    for (const entityId of affectedEntityIds) {
      try {
        // Finance-capable roles — not just owners (a bookkeeper/accountant
        // runs collections day-to-day and must see the overdue signal).
        const financeUsers = await db.query.userEntityAccess.findMany({
          where: and(
            eq(userEntityAccess.entityId, entityId),
            inArray(userEntityAccess.role, [
              "owner",
              "admin",
              "finance_director",
              "accountant",
            ]),
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
        for (const user of financeUsers) {
          const existing = await db.query.notifications.findFirst({
            where: and(
              eq(notifications.userId, user.userId),
              eq(notifications.entityId, entityId),
              eq(notifications.type, "overdue_invoice"),
              sql`${notifications.createdAt} >= ${todayStr}`,
            ),
          });

          if (!existing) {
            await db.insert(notifications).values({
              userId: user.userId,
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
      } catch (err) {
        // One entity must never abort the whole scan — the statuses are already
        // updated; log so the gap is visible instead of silently lost.
        logger.error(
          { err, entityId },
          "Failed to notify for newly overdue invoices",
        );
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
