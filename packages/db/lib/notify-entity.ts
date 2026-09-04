/**
 * Shared entity-scoped notification sender.
 *
 * Single source of truth for the "notify every user who can see this entity"
 * pattern. Used by background jobs (bank sync/import) and pipeline engines
 * (ingestion). The `db` handle is injected so this module never imports the
 * db client directly (avoids a package-root import cycle) and stays trivially
 * testable.
 *
 * Semantics:
 *  - Resolves all users with access to the entity (userEntityAccess).
 *  - Batch-inserts one notification row per user (the bell, Activity Hub and
 *    sidebar attention signals all read this table per user + entity).
 *  - Optional dedupe: when `dedupeDataField` is set, an existing UNREAD row of
 *    the same entity + type whose `data->>dedupeDataField` equals the incoming
 *    value suppresses the insert. This keeps retries/job re-runs from spamming.
 *  - Never throws — notification failure must never break the pipeline.
 */

import { and, eq, sql } from "drizzle-orm";
import { notifications, userEntityAccess } from "../schema";
import type { Database } from "../client";

/**
 * Business-key fields we dedupe on, rendered as literal SQL (never raw
 * interpolated). Add a new field here when a caller needs a new dedupe key.
 */
export type NotificationDedupeField = "documentId" | "connectionId";

export interface EntityNotificationInput {
  /** One of notificationTypeEnum, e.g. "bank_sync_failed". */
  type: string;
  /** "critical" | "high" | "medium" | "low" */
  priority: string;
  title: string;
  body: string;
  /** JSON-serializable metadata — deep-link ids live here (connectionId, documentId). */
  data: Record<string, unknown>;
  /**
   * Top-level key inside `data` used for dedupe, e.g. "connectionId".
   * Omit to always notify.
   */
  dedupeDataField?: NotificationDedupeField;
}

/**
 * data->>'<field>' as literal SQL. The field name is allowlisted so it is
 * always rendered as a fixed literal (never raw-interpolated user input).
 */
function dataFieldEqSql(field: NotificationDedupeField) {
  switch (field) {
    case "documentId":
      return sql`${notifications.data}::jsonb->>'documentId'`;
    case "connectionId":
      return sql`${notifications.data}::jsonb->>'connectionId'`;
  }
}

interface NotifyEntityOptions extends EntityNotificationInput {
  entityId: string;
}

/**
 * Send a notification to every user with access to the entity.
 *
 * @param db Drizzle client (injected by caller).
 */
export async function notifyEntityUsers(
  db: Database,
  options: NotifyEntityOptions,
): Promise<{ recipients: number; deduped: boolean }> {
  const { entityId, type, priority, title, body, data, dedupeDataField } =
    options;

  try {
    // Dedupe: an unread notification of the same type for the same entity AND
    // the same business key (e.g. connectionId/documentId) suppresses repeats.
    if (dedupeDataField) {
      const keyValue = data[dedupeDataField];
      if (keyValue !== undefined && keyValue !== null) {
        const existing = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.entityId, entityId),
            eq(notifications.type, type),
            eq(notifications.read, false),
            // data is a text column holding JSON; cast to jsonb so ->> works
            // against real Postgres (without the cast this throws).
            eq(dataFieldEqSql(dedupeDataField), String(keyValue)),
          ),
        });
        if (existing) return { recipients: 0, deduped: true };
      }
    }

    // Find all users with access to this entity.
    const accessRecords = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.entityId, entityId),
      columns: { userId: true },
    });

    if (accessRecords.length === 0) {
      // eslint-disable-next-line no-console -- operational log
      console.warn(
        JSON.stringify({
          level: "warn",
          module: "notify-entity",
          message: "No users found for entity",
          entityId,
        }),
      );
      return { recipients: 0, deduped: false };
    }

    const notificationValues = accessRecords.map((record) => ({
      userId: record.userId,
      entityId,
      type,
      priority,
      title,
      body,
      data: JSON.stringify(data),
      // "pending" = created in the inbox, not yet acted on. The web surface
      // reads `read` for the badge; status tracks delivery semantics.
      status: "pending" as const,
      sentAt: new Date(),
    }));

    await db.insert(notifications).values(notificationValues);

    // eslint-disable-next-line no-console -- operational log
    console.info(
      JSON.stringify({
        level: "info",
        module: "notify-entity",
        type,
        recipientCount: accessRecords.length,
        entityId,
      }),
    );

    return { recipients: accessRecords.length, deduped: false };
  } catch (error) {
    // Notification failure must never break the pipeline that called us.
    // eslint-disable-next-line no-console -- operational log
    console.error(
      JSON.stringify({
        level: "error",
        module: "notify-entity",
        message: "Failed to send notification",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return { recipients: 0, deduped: false };
  }
}

/**
 * Mark previously-sent failure notifications as read once the underlying
 * condition heals (e.g. a bank connection recovers). Prevents stale failure
 * alerts from double-signalling against a fresh healthy state.
 */
export async function clearEntityFailureNotifications(
  db: Database,
  options: {
    entityId: string;
    /** One of notificationTypeEnum, e.g. "bank_sync_failed". */
    type: string;
    /** Business key field inside `data` to match, e.g. "connectionId". */
    dedupeDataField: NotificationDedupeField;
    /** The value to match (the healed connection/document). */
    keyValue: string;
  },
): Promise<void> {
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.entityId, options.entityId),
          eq(notifications.type, options.type),
          eq(notifications.read, false),
          eq(dataFieldEqSql(options.dedupeDataField), options.keyValue),
        ),
      );
  } catch (error) {
    // Clearing is best-effort — never fail the healing sync.
    // eslint-disable-next-line no-console -- operational log
    console.error(
      JSON.stringify({
        level: "error",
        module: "notify-entity",
        message: "Failed to clear failure notifications",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
