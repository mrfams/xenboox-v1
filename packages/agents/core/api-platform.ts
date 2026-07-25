// ─── API Platform: Webhook Dispatch Engine (Phase 3) ─────────────────────
//
// Subscribable events per entity. When events fire, webhooks are sent
// to the target URL with an HMAC-SHA256 signature for verification.
//
// Event types:
//   close.completed              — Month-end close completed
//   invoice.paid                 — AR invoice marked as paid
//   invoice.overdue              — AR invoice becomes overdue
//   reconciliation.flagged       — Bank reconciliation flagged
//   budget.threshold_exceeded    — Budget threshold crossed
//   transaction.created          — Journal entry posted
//   expense.approved             — Expense claim approved
//   payroll.completed            — Payroll run completed
//   document.processed           — Document OCR/extraction done

import crypto from "crypto";
import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { webhookSubscriptions, webhookDeliveryLogs } from "@xenboox/db/schema";

export type WebhookEventType =
  | "close.completed"
  | "invoice.paid"
  | "invoice.overdue"
  | "reconciliation.flagged"
  | "budget.threshold_exceeded"
  | "transaction.created"
  | "expense.approved"
  | "payroll.completed"
  | "document.processed";

export interface WebhookPayload {
  eventType: WebhookEventType;
  entityId: string;
  timestamp: string;
  data: Record<string, unknown>;
  environment: string;
}

// ─── Sign a webhook payload with HMAC-SHA256 ──────────────────────────────

function signPayload(payload: WebhookPayload, secret: string): string {
  const payloadStr = JSON.stringify(payload);
  return crypto
    .createHmac("sha256", secret)
    .update(payloadStr, "utf-8")
    .digest("hex");
}

// ─── Dispatch a single webhook delivery ───────────────────────────────────

async function deliverWebhook(
  subscription: typeof webhookSubscriptions.$inferSelect,
  payload: WebhookPayload,
): Promise<{
  success: boolean;
  statusCode: number | null;
  durationMs: number;
  errorMessage?: string;
}> {
  const start = Date.now();
  const signature = signPayload(payload, subscription.secret);

  try {
    const response = await fetch(subscription.targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": payload.eventType,
        "User-Agent": "Xenboox-Webhook/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    const durationMs = Date.now() - start;

    return {
      success: response.ok,
      statusCode: response.status,
      durationMs,
      errorMessage: response.ok
        ? undefined
        : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    return {
      success: false,
      statusCode: null,
      durationMs,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Fire a webhook event ─────────────────────────────────────────────────
//
// Looks up all active subscriptions for the entity + event type,
// dispatches to each, and records delivery logs with retry queueing.

export async function fireWebhookEvent(params: {
  entityId: string;
  eventType: WebhookEventType;
  data: Record<string, unknown>;
}): Promise<{
  delivered: number;
  failed: number;
  total: number;
}> {
  const { entityId, eventType, data } = params;

  // Find all active subscriptions for this event + entity
  const subscriptions = await db.query.webhookSubscriptions.findMany({
    where: and(
      eq(webhookSubscriptions.entityId, entityId),
      eq(webhookSubscriptions.eventType, eventType),
      eq(webhookSubscriptions.status, "active"),
    ),
  });

  if (subscriptions.length === 0) {
    return { delivered: 0, failed: 0, total: 0 };
  }

  const payload: WebhookPayload = {
    eventType,
    entityId,
    timestamp: new Date().toISOString(),
    data,
    environment: process.env.NODE_ENV ?? "production",
  };

  let delivered = 0;
  let failed = 0;

  // Dispatch to all subscriptions in parallel
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const result = await deliverWebhook(sub, payload);

      // Record delivery log
      await db.insert(webhookDeliveryLogs).values({
        subscriptionId: sub.id,
        eventType,
        payload,
        responseStatus: result.statusCode,
        success: result.success,
        durationMs: result.durationMs,
        errorMessage: result.errorMessage,
        attempt: 1,
      });

      // Update subscription stats
      await db
        .update(webhookSubscriptions)
        .set({
          lastDeliveredAt: new Date(),
          lastDeliveryStatus: result.success ? "success" : "failed",
          deliveryCount: (sub.deliveryCount ?? 0) + 1,
          failureCount: result.success
            ? sub.failureCount
            : (sub.failureCount ?? 0) + 1,
        })
        .where(eq(webhookSubscriptions.id, sub.id));

      if (result.success) {
        delivered++;
      } else {
        failed++;
      }
    }),
  );

  return { delivered, failed, total: subscriptions.length };
}

// ─── Retry failed delivery ────────────────────────────────────────────────
//
// Retries a previously failed webhook delivery.

export async function retryDelivery(
  deliveryLogId: string,
): Promise<{ success: boolean }> {
  const log = await db.query.webhookDeliveryLogs.findFirst({
    where: eq(webhookDeliveryLogs.id, deliveryLogId),
    with: { subscription: true },
  });

  if (!log || !log.subscription) {
    return { success: false };
  }

  const payload = log.payload as WebhookPayload | null;
  if (!payload) {
    return { success: false };
  }

  const result = await deliverWebhook(log.subscription, payload);

  await db.insert(webhookDeliveryLogs).values({
    subscriptionId: log.subscription.id,
    eventType: log.eventType,
    payload,
    responseStatus: result.statusCode,
    success: result.success,
    durationMs: result.durationMs,
    errorMessage: result.errorMessage,
    attempt: (log.attempt ?? 1) + 1,
  });

  await db
    .update(webhookSubscriptions)
    .set({
      lastDeliveredAt: new Date(),
      lastDeliveryStatus: result.success ? "success" : "failed",
      failureCount: result.success
        ? log.subscription.failureCount
        : (log.subscription.failureCount ?? 0) + 1,
    })
    .where(eq(webhookSubscriptions.id, log.subscription.id));

  return { success: result.success };
}
