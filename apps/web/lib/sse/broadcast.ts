// ─── Redis-backed SSE broadcast (§16.1) ────────────────────────────────────
// Replaces the in-memory `activeConnections` Map with Upstash Redis so
// broadcasts survive serverless restarts and work across Vercel instances.
//
// POST publishes to a Redis list; SSE polling loops drain it.

import { Redis } from "@upstash/redis";

const REDIS_SSE_PREFIX = "sse:pending:";
const REDIS_TTL_SECONDS = 60;

function hasRedis(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!hasRedis()) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

/**
 * Publish an SSE event to Redis for cross-instance delivery.
 * Called by POST /api/agent-events and any other event producers.
 */
export async function publishSseEvent(
  entityId: string,
  event: unknown,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return; // no Redis → no broadcast (DB polling still works)

  const key = `${REDIS_SSE_PREFIX}${entityId}`;
  const payload = JSON.stringify(event);

  // LPUSH + EXPIRE: append to list, set TTL so stale events auto-clean
  await redis.lpush(key, payload);
  await redis.expire(key, REDIS_TTL_SECONDS);
}

/**
 * Publish an attention signal event to Redis for cross-instance delivery.
 * This is a convenience wrapper that formats the event for attention SSE.
 */
export async function publishAttentionSignal(
  entityId: string,
  event: {
    surface: string;
    tone: "action" | "new";
    delta: number;
    count: number;
    message?: string;
  },
): Promise<void> {
  await publishSseEvent(entityId, {
    type: "attention_changed",
    entityId,
    ...event,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Drain pending SSE events from Redis for a given entity.
 * Returns all events and trims the list to prevent re-delivery.
 * Called by the SSE polling loop.
 */
export async function drainSseEvents(entityId: string): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];

  const key = `${REDIS_SSE_PREFIX}${entityId}`;

  // LRANGE 0 -1 to get all pending events, then DELETE the key.
  // This is atomic enough for our use case — worst case we lose one
  // event if two SSE connections race, but DB polling catches it.
  const events = await redis.lrange<string>(key, 0, -1);
  if (events.length > 0) {
    await redis.del(key);
  }
  return events;
}
