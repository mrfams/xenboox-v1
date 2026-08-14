// ─── Webhook event dedup (§19.2) ────────────────────────────────────────────
//
// Webhook providers (Mono, Resend) deliver at-least-once: they retry until
// they receive a 2xx. Without dedup a retried event double-applies — duplicate
// inbound email records, double job triggers, re-run syncs.
//
// `claimWebhookEvent` atomically claims an event key in the idempotency_keys
// table (PK on `key` makes check-and-insert race-free). The first delivery
// wins; duplicates return false and the handler short-circuits with a 200.

import { and, eq, lt } from "drizzle-orm";

import { idempotencyKeys } from "@xenboox/db/schema";

import { db } from "@/lib/db";

const TTL_HOURS = 24;

/** Deterministic short hash for building event keys when no event id exists. */
export function shortHash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = (h * 33) ^ value.charCodeAt(i);
    h >>>= 0;
  }
  return `h${h.toString(16).padStart(8, "0")}`;
}

/**
 * Atomically claim a webhook event. Returns true when this is the first
 * delivery of `key`; false when it was already processed (or is in flight).
 */
export async function claimWebhookEvent(
  key: string,
  ttlHours = TTL_HOURS,
): Promise<boolean> {
  // Clear an expired claim so the key can be reused after the TTL window.
  await db
    .delete(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, key),
        lt(idempotencyKeys.expiresAt, new Date()),
      ),
    );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const inserted = await db
    .insert(idempotencyKeys)
    .values({
      key,
      userId: "",
      entityId: "",
      route: "webhook",
      createdAt: now,
      expiresAt,
    })
    .onConflictDoNothing({ target: idempotencyKeys.key })
    .returning();

  return inserted.length > 0;
}
