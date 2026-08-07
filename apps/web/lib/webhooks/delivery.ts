// ─── Outbound Webhook Delivery Engine ──────────────────────────────────────
//
// Enterprise-grade webhook delivery for the API platform:
//   - HMAC-SHA256 signatures per subscription (unique secret per subscription)
//   - Idempotent delivery IDs (X-Xenboox-Delivery) so consumers can dedupe
//   - Exponential backoff with jitter, capped retries, retryable-status logic
//   - Full audit trail in webhook_delivery_logs + stats on subscriptions
//
// Design notes:
//   - Pure helpers are exported for unit testing (no DB, no network).
//   - DB orchestration functions are exported for the process route / jobs.
//   - Deliberately no "next_retry_at" column: retry time is derived from
//     `deliveredAt + backoff(attempt)` so no migration is required.
//   - Network calls have a hard timeout; failures never throw to callers.

import crypto from "crypto";

import { and, asc, eq, sql } from "drizzle-orm";
import {
  webhookSubscriptions,
  webhookDeliveryLogs,
} from "@xenboox/db/schema/api-platform";

import { db } from "@/lib/db";

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_BACKOFF_BASE_MS = 5_000;
export const DEFAULT_BACKOFF_MAX_MS = 300_000;
export const DEFAULT_MAX_RETRIES = 3;

/** Statuses that warrant a retry. Network errors (null) also retry. */
export const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const MAX_ATTEMPT_EXPONENT = 10;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WebhookEnvelope {
  id: string; // delivery/event id — used for idempotency
  eventType: string;
  entityId: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface DeliveryOptions {
  url: string;
  eventType: string;
  payload: Record<string, unknown>;
  secret: string;
  deliveryId: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface DeliveryAttemptResult {
  success: boolean;
  status: number | null;
  durationMs: number;
  errorMessage?: string;
  responseBody?: string;
}

export interface PendingDelivery {
  logId: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  targetUrl: string;
  secret: string;
  attempt: number;
  maxRetries: number;
  /** Milliseconds since the last attempt after which this delivery is due. */
  backoffMs: number;
}

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  exhausted: number; // failed and no retries left
}

// ─── Pure Helpers ───────────────────────────────────────────────────────────

/** HMAC-SHA256 signature of the raw body using a subscription's secret. */
export function signWebhookPayload(rawBody: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf-8")
    .digest("hex");
}

/** Headers sent with every webhook delivery. */
export function buildWebhookHeaders(opts: {
  eventType: string;
  deliveryId: string;
  secret: string;
  rawBody: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Xenboox-Event": opts.eventType,
    "X-Xenboox-Delivery": opts.deliveryId,
    "X-Xenboox-Signature": `sha256=${signWebhookPayload(opts.rawBody, opts.secret)}`,
  };
}

/**
 * Exponential backoff with jitter for retry scheduling.
 * attempt 1 → baseMs, attempt 2 → baseMs×2, … capped at maxMs, ±20% jitter.
 */
export function computeBackoffDelayMs(
  attempt: number,
  baseMs = DEFAULT_BACKOFF_BASE_MS,
  maxMs = DEFAULT_BACKOFF_MAX_MS,
): number {
  const safeAttempt = Math.max(1, Math.min(attempt, MAX_ATTEMPT_EXPONENT));
  const raw = Math.min(baseMs * 2 ** (safeAttempt - 1), maxMs);
  const jitter = raw * 0.2 * (Math.random() - 0.5);
  // Cap the FINAL value (including jitter) so retries never exceed maxMs.
  return Math.min(maxMs, Math.max(0, Math.round(raw + jitter)));
}

/** Whether an HTTP status warrants a retry (null = network/transport error). */
export function isRetryableStatus(status: number | null): boolean {
  return status === null || RETRYABLE_STATUSES.has(status);
}

/** Deterministic "is this delivery attempt due for its next retry?" check. */
export function isDeliveryDue(
  lastAttemptAt: Date,
  attempt: number,
  retryIntervalMs: number,
  now: Date,
): boolean {
  if (attempt <= 1) return true; // first attempt never waited on
  const delay = computeBackoffDelayMs(attempt - 1, retryIntervalMs);
  return lastAttemptAt.getTime() + delay <= now.getTime();
}

// ─── Delivery (network) ─────────────────────────────────────────────────────

/** Deliver a single webhook with timeout + response capture. Never throws. */
export async function deliverWebhook(
  options: DeliveryOptions,
): Promise<DeliveryAttemptResult> {
  const startedAt = Date.now();
  const rawBody = JSON.stringify(options.payload);
  const headers = buildWebhookHeaders({
    eventType: options.eventType,
    deliveryId: options.deliveryId,
    secret: options.secret,
    rawBody,
  });
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(options.url, {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller.signal,
    });
    const body = await res.text().catch(() => "");
    const ok = res.status >= 200 && res.status < 300;
    return {
      success: ok,
      status: res.status,
      durationMs: Date.now() - startedAt,
      responseBody: body.slice(0, 500),
    };
  } catch (error) {
    return {
      success: false,
      status: null,
      durationMs: Date.now() - startedAt,
      errorMessage:
        error instanceof Error ? error.message : "Webhook transport error",
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── DB Orchestration ───────────────────────────────────────────────────────

/**
 * Find active subscriptions for an entity + event and enqueue a delivery log
 * for each. Returns the number of deliveries enqueued.
 */
export async function enqueueWebhookDeliveries(params: {
  entityId: string;
  eventType: string;
  data: Record<string, unknown>;
  now?: Date;
}): Promise<number> {
  const now = params.now ?? new Date();
  const envelope: WebhookEnvelope = {
    id: crypto.randomUUID(),
    eventType: params.eventType,
    entityId: params.entityId,
    createdAt: now.toISOString(),
    data: params.data,
  };

  const subscriptions = await db.query.webhookSubscriptions.findMany({
    where: and(
      eq(webhookSubscriptions.entityId, params.entityId),
      eq(webhookSubscriptions.eventType, params.eventType as any),
      eq(webhookSubscriptions.status, "active"),
    ),
  });

  if (subscriptions.length === 0) return 0;

  const rows = subscriptions.map((sub) => ({
    subscriptionId: sub.id,
    eventType: params.eventType as any,
    payload: envelope as unknown as Record<string, unknown>,
    attempt: 1,
    success: false,
    deliveredAt: now,
  }));

  await db.insert(webhookDeliveryLogs).values(rows);
  return rows.length;
}

/**
 * Process deliveries that are due (first attempt or retry window elapsed).
 * One pass per invocation — schedule via the process route or a cron job.
 */
export async function processPendingWebhookDeliveries(params: {
  batchSize?: number;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<ProcessResult> {
  const now = params.now ?? new Date();
  const batchSize = params.batchSize ?? 50;

  const logs = await db.query.webhookDeliveryLogs.findMany({
    where: eq(webhookDeliveryLogs.success, false),
    orderBy: [asc(webhookDeliveryLogs.deliveredAt)],
    limit: batchSize,
    with: { subscription: true },
  });

  const due: PendingDelivery[] = [];

  for (const log of logs) {
    const sub = log.subscription;
    if (!sub || sub.status !== "active") continue;
    if (log.attempt > sub.maxRetries) continue;

    if (
      !isDeliveryDue(log.deliveredAt, log.attempt, sub.retryIntervalMs, now)
    ) {
      continue;
    }

    due.push({
      logId: log.id,
      subscriptionId: sub.id,
      eventType: log.eventType,
      payload: (log.payload ?? {}) as Record<string, unknown>,
      targetUrl: sub.targetUrl,
      secret: sub.secret,
      attempt: log.attempt,
      maxRetries: sub.maxRetries,
      backoffMs: computeBackoffDelayMs(log.attempt - 1, sub.retryIntervalMs),
    });
  }

  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    exhausted: 0,
  };

  for (const delivery of due) {
    const attempt = await deliverWebhook({
      url: delivery.targetUrl,
      eventType: delivery.eventType,
      payload: delivery.payload,
      secret: delivery.secret,
      deliveryId: delivery.logId,
      fetchImpl: params.fetchImpl,
    });
    result.processed += 1;

    if (attempt.success) {
      result.succeeded += 1;
      await db
        .update(webhookDeliveryLogs)
        .set({
          success: true,
          responseStatus: attempt.status,
          responseBody: attempt.responseBody,
          durationMs: attempt.durationMs,
          errorMessage: null,
        })
        .where(eq(webhookDeliveryLogs.id, delivery.logId));

      await db
        .update(webhookSubscriptions)
        .set({
          lastDeliveredAt: now,
          lastDeliveryStatus: "success",
          deliveryCount: sql<number>`${webhookSubscriptions.deliveryCount} + 1`,
        })
        .where(eq(webhookSubscriptions.id, delivery.subscriptionId));
    } else {
      const retriesLeft = delivery.maxRetries - delivery.attempt;
      if (retriesLeft <= 0) {
        result.exhausted += 1;
      } else {
        result.failed += 1;
      }

      await db
        .update(webhookDeliveryLogs)
        .set({
          responseStatus: attempt.status,
          responseBody: attempt.responseBody,
          durationMs: attempt.durationMs,
          errorMessage: attempt.errorMessage,
          attempt: delivery.attempt + 1,
          deliveredAt: now,
        })
        .where(eq(webhookDeliveryLogs.id, delivery.logId));

      await db
        .update(webhookSubscriptions)
        .set({ lastDeliveryStatus: "failed" })
        .where(eq(webhookSubscriptions.id, delivery.subscriptionId));
    }
  }

  return result;
}

/**
 * One-call dispatch used by application code: enqueue deliveries for an
 * event. Processing happens asynchronously via the process route/cron.
 */
export async function dispatchWebhookEvent(params: {
  entityId: string;
  eventType: string;
  data: Record<string, unknown>;
}): Promise<number> {
  return enqueueWebhookDeliveries(params);
}
