/**
 * Ingestion Notification Service
 *
 * Sends real-time notifications when the ingestion pipeline flags documents
 * for review, auto-posts with notification, or encounters errors.
 *
 * Notifications are created directly in the database and surfaced through
 * the existing notification system (bell icon, notifications page, etc.).
 * In the future, this can be extended to push (email, SMS, push notification).
 */

import { db } from "@xenboox/db";
import { notifications, userEntityAccess } from "@xenboox/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { IngestionState, PostingDecision } from "../core/types";

// ─── Notification Types ─────────────────────────────────────────────────────

/**
 * Keep in sync with `notificationTypeEnum` in packages/db/schema/notifications.ts.
 * Adding a type here also requires an entry in NOTIFICATION_DESTINATIONS
 * (apps/web/lib/hooks/use-attention-signals.ts) so the sidebar routes it.
 */
type NotificationType =
  | "ingestion_review"
  | "ingestion_rejected"
  | "ingestion_posted"
  | "ingestion_failed"
  | "ingestion_escalated";

type NotificationPriority = "critical" | "high" | "medium" | "low";

/**
 * Build a human-readable document label once, shared by all senders.
 */
function buildDocumentName(state: IngestionState): string {
  return state.extraction?.data?.vendorName
    ? `${state.classification.category} - ${state.extraction.data.vendorName}`
    : state.extraction?.data?.customerName
      ? `${state.classification.category} - ${state.extraction.data.customerName}`
      : `Document ${state.documentId.slice(0, 8)}`;
}

// ─── Main Notification Sender ───────────────────────────────────────────────

/**
 * Send notifications about ingestion pipeline decisions to all users
 * who have access to the current entity.
 *
 * Called from the posting engine after a decision is made.
 */
export async function sendIngestionNotifications(
  entityId: string,
  state: IngestionState,
  decision: PostingDecision,
  journalEntryId?: string,
): Promise<void> {
  const documentName = buildDocumentName(state);

  switch (decision.action) {
    case "pending_review":
      await sendPendingReviewNotification(
        entityId,
        state,
        decision,
        documentName,
      );
      break;

    case "escalated":
      await sendEscalatedNotification(entityId, state, decision, documentName);
      break;

    case "auto_post":
      if (decision.confidence < 0.95) {
        // Auto-post with notification — notify whenever confidence is below
        // the silent threshold (< 0.95), so near-threshold posts get a glance.
        await sendAutoPostWithNotifyNotification(
          entityId,
          state,
          decision,
          journalEntryId,
          documentName,
        );
      }
      break;

    case "rejected":
      await sendRejectedNotification(entityId, state, decision, documentName);
      break;
  }
}

/**
 * Notify users that auto-posting failed and the document needs attention.
 * Called from the posting engine's failure path so a stuck document never
 * disappears silently.
 */
export async function sendPostingFailureNotification(
  entityId: string,
  state: IngestionState,
  errorMessage: string,
): Promise<void> {
  const documentName = buildDocumentName(state);

  await createNotificationForEntity(entityId, {
    type: "ingestion_failed",
    priority: "high",
    title: `${state.workflow?.replace(/_/g, " ")} — posting failed`,
    body: `${documentName} — Auto-posting failed: ${errorMessage}. Review the document to fix or retry.`,
    data: {
      documentId: state.documentId,
      workflow: state.workflow,
      error: errorMessage,
      action: "failed",
    },
  });
}

// ─── Individual Notification Senders ────────────────────────────────────────

/**
 * Notify users that a document needs review (confidence 60-84%).
 */
async function sendPendingReviewNotification(
  entityId: string,
  state: IngestionState,
  decision: PostingDecision,
  documentName: string,
): Promise<void> {
  const confidencePct = Math.round((decision.confidence ?? 0) * 100);
  const lowFields = (decision.reviewItems ?? [])
    .filter((item) => item.confidence < 0.7)
    .map((item) => item.label)
    .slice(0, 3)
    .join(", ");

  await createNotificationForEntity(entityId, {
    type: "ingestion_review",
    priority: "high",
    title: `${state.workflow?.replace(/_/g, " ")} needs review`,
    body: `${documentName} — Confidence ${confidencePct}%. ${lowFields ? `Low confidence fields: ${lowFields}.` : `Review and approve the proposed journal entry.`}`,
    data: {
      documentId: state.documentId,
      workflow: state.workflow,
      confidence: decision.confidence,
      action: decision.action,
      reviewItems: decision.reviewItems,
      proposedEntry: state.proposedJournal,
    },
  });
}

/**
 * Notify users that a document was escalated (confidence 40-59%).
 */
async function sendEscalatedNotification(
  entityId: string,
  state: IngestionState,
  decision: PostingDecision,
  documentName: string,
): Promise<void> {
  const confidencePct = Math.round((decision.confidence ?? 0) * 100);
  const dominantSignal = state.compositeConfidence?.dominantSignal ?? "unknown";

  await createNotificationForEntity(entityId, {
    type: "ingestion_escalated",
    priority: "critical",
    title: `⚠️ ${state.workflow?.replace(/_/g, " ")} — escalated`,
    body: `${documentName} — Confidence ${confidencePct}% (below 60% threshold). Issue: ${dominantSignal.replace(/_/g, " ")}. Requires human intervention.`,
    data: {
      documentId: state.documentId,
      workflow: state.workflow,
      confidence: decision.confidence,
      action: "escalated",
      dominantSignal,
      reviewItems: decision.reviewItems,
      proposedEntry: state.proposedJournal,
    },
  });
}

/**
 * Notify users that a document was auto-posted (85-94% confidence range).
 */
async function sendAutoPostWithNotifyNotification(
  entityId: string,
  state: IngestionState,
  decision: PostingDecision,
  journalEntryId?: string,
  documentName?: string,
): Promise<void> {
  const confidencePct = Math.round((decision.confidence ?? 0) * 100);

  await createNotificationForEntity(entityId, {
    type: "ingestion_posted",
    priority: "medium",
    title: `${state.workflow?.replace(/_/g, " ")} auto-posted`,
    body: `${documentName ?? "Document"} — Posted automatically with ${confidencePct}% confidence. Journal entry created.`,
    data: {
      documentId: state.documentId,
      workflow: state.workflow,
      confidence: decision.confidence,
      journalEntryId,
      action: "auto_post",
    },
  });
}

/**
 * Notify users that a document was rejected (validation failure or <40% confidence).
 */
async function sendRejectedNotification(
  entityId: string,
  state: IngestionState,
  decision: PostingDecision,
  documentName: string,
): Promise<void> {
  await createNotificationForEntity(entityId, {
    type: "ingestion_rejected",
    priority: "high",
    title: `${state.workflow?.replace(/_/g, " ")} — rejected`,
    body: `${documentName} — Could not process. ${decision.reason?.slice(0, 200) ?? "Validation failed."}`,
    data: {
      documentId: state.documentId,
      workflow: state.workflow,
      confidence: decision.confidence,
      reason: decision.reason,
      validationErrors: state.validation?.errors,
      action: decision.action,
    },
  });
}

// ─── Database Helper ────────────────────────────────────────────────────────

interface NotificationInput {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/**
 * Create notifications for all users who have access to the entity.
 * This ensures the right people see review requests and alerts.
 */
async function createNotificationForEntity(
  entityId: string,
  input: NotificationInput,
): Promise<void> {
  try {
    // Dedup: if this document already has an unread notification of the same
    // type (e.g. a retry re-processed the same document), skip the insert so
    // users are not spammed with identical alerts and badge counts stay honest.
    const documentId = input.data.documentId as string | undefined;
    if (documentId) {
      const existing = await db.query.notifications.findFirst({
        where: and(
          eq(notifications.entityId, entityId),
          eq(notifications.type, input.type),
          eq(notifications.read, false),
          // data is a `text` column holding JSON; cast to jsonb so the ->>
          // operator works against real Postgres (without the cast this query
          // throws, silently killing the entire notification insert).
          eq(sql`${notifications.data}::jsonb->>'documentId'`, documentId),
        ),
      });
      if (existing) return;
    }

    // Find all users with access to this entity
    const accessRecords = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.entityId, entityId),
      columns: { userId: true },
    });

    if (accessRecords.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          module: "notifications",
          message: "No users found for entity",
          entityId,
        }),
      );
      return;
    }

    // Create a notification for each user
    const notificationValues = accessRecords.map((record) => ({
      userId: record.userId,
      entityId,
      type: input.type,
      priority: input.priority,
      title: input.title,
      body: input.body,
      data: JSON.stringify(input.data),
      // "pending" = created in the inbox, not yet acted on. The web surface
      // reads `read` for the badge; status tracks delivery semantics.
      status: "pending" as const,
      sentAt: new Date(),
    }));

    await db.insert(notifications).values(notificationValues);

    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        level: "info",
        module: "notifications",
        type: input.type,
        recipientCount: accessRecords.length,
        entityId,
      }),
    );
  } catch (error) {
    // Notification failure should never break the ingestion pipeline
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        module: "notifications",
        message: "Failed to send notification",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
