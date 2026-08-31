/**
 * Redis-backed rate limiter for AI narrative generation.
 * Uses the existing RateLimiter from security/rate-limiter.ts for distributed
 * rate limiting across Vercel serverless instances.
 *
 * Limits per entity:
 * - 3 per minute (burst protection)
 * - 10 per hour (sustained abuse protection)
 * - 50 per day (daily budget protection)
 *
 * Falls back to in-memory sliding window when Redis is unavailable (dev).
 */

import { getRateLimiter } from "@/lib/security/rate-limiter";

const LIMITS = {
  perMinute: 3,
  perHour: 10,
  perDay: 50,
} as const;

// ─── In-Memory Fallback (Dev Only) ─────────────────────────────────────────
// When Redis is unavailable, fall back to per-process in-memory tracking.
// NOT suitable for production — each Vercel instance has its own state.

interface WindowEntry {
  minute: number;
  hour: number;
  day: number;
  minuteResetAt: number;
  hourResetAt: number;
  dayResetAt: number;
}

const fallbackCounts = new Map<string, WindowEntry>();

const WINDOWS = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const;

function getOrCreateEntry(entityId: string, now: number): WindowEntry {
  let entry = fallbackCounts.get(entityId);

  if (!entry) {
    entry = {
      minute: 0,
      hour: 0,
      day: 0,
      minuteResetAt: now + WINDOWS.minute,
      hourResetAt: now + WINDOWS.hour,
      dayResetAt: now + WINDOWS.day,
    };
    fallbackCounts.set(entityId, entry);
    return entry;
  }

  // Reset minute window independently
  if (now >= entry.minuteResetAt) {
    entry.minute = 0;
    entry.minuteResetAt = now + WINDOWS.minute;
  }

  // Reset hour window independently
  if (now >= entry.hourResetAt) {
    entry.hour = 0;
    entry.hourResetAt = now + WINDOWS.hour;
  }

  // Reset day window independently
  if (now >= entry.dayResetAt) {
    entry.day = 0;
    entry.dayResetAt = now + WINDOWS.day;
  }

  return entry;
}

function checkFallback(entityId: string): {
  allowed: boolean;
  retryAfter?: number;
  remaining: { minute: number; hour: number; day: number };
} {
  const now = Date.now();
  const entry = getOrCreateEntry(entityId, now);

  // Check day limit first (longest window)
  if (entry.day >= LIMITS.perDay) {
    return {
      allowed: false,
      retryAfter: entry.dayResetAt - now,
      remaining: { minute: 0, hour: 0, day: 0 },
    };
  }

  // Check hour limit
  if (entry.hour >= LIMITS.perHour) {
    return {
      allowed: false,
      retryAfter: entry.hourResetAt - now,
      remaining: {
        minute: Math.max(0, LIMITS.perMinute - entry.minute),
        hour: 0,
        day: Math.max(0, LIMITS.perDay - entry.day),
      },
    };
  }

  // Check minute limit
  if (entry.minute >= LIMITS.perMinute) {
    return {
      allowed: false,
      retryAfter: entry.minuteResetAt - now,
      remaining: {
        minute: 0,
        hour: Math.max(0, LIMITS.perHour - entry.hour),
        day: Math.max(0, LIMITS.perDay - entry.day),
      },
    };
  }

  // All clear — increment counters
  entry.minute++;
  entry.hour++;
  entry.day++;

  return {
    allowed: true,
    remaining: {
      minute: Math.max(0, LIMITS.perMinute - entry.minute),
      hour: Math.max(0, LIMITS.perHour - entry.hour),
      day: Math.max(0, LIMITS.perDay - entry.day),
    },
  };
}

// ─── Redis-Backed Check (Production) ───────────────────────────────────────

async function checkRedis(entityId: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
  remaining: { minute: number; hour: number; day: number };
}> {
  const limiter = getRateLimiter();

  // Check minute window first (most restrictive)
  const minuteResult = await limiter.checkApiRateLimit(`narrative:${entityId}:min`);
  if (!minuteResult.success) {
    return {
      allowed: false,
      retryAfter: minuteResult.reset * 1000 - Date.now(),
      remaining: { minute: 0, hour: LIMITS.perHour, day: LIMITS.perDay },
    };
  }

  // Check hour window
  const hourResult = await limiter.checkApiRateLimit(`narrative:${entityId}:hr`);
  if (!hourResult.success) {
    return {
      allowed: false,
      retryAfter: hourResult.reset * 1000 - Date.now(),
      remaining: {
        minute: minuteResult.remaining,
        hour: 0,
        day: LIMITS.perDay,
      },
    };
  }

  // Check day window
  const dayResult = await limiter.checkApiRateLimit(`narrative:${entityId}:day`);
  if (!dayResult.success) {
    return {
      allowed: false,
      retryAfter: dayResult.reset * 1000 - Date.now(),
      remaining: {
        minute: minuteResult.remaining,
        hour: hourResult.remaining,
        day: 0,
      },
    };
  }

  return {
    allowed: true,
    remaining: {
      minute: minuteResult.remaining,
      hour: hourResult.remaining,
      day: dayResult.remaining,
    },
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Check if a narrative generation request is allowed for this entity.
 * Uses Redis-backed distributed rate limiting in production,
 * falls back to in-memory in development.
 */
export async function checkNarrativeRateLimit(entityId: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
  remaining: { minute: number; hour: number; day: number };
}> {
  const hasRedis = !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (hasRedis) {
    try {
      return await checkRedis(entityId);
    } catch {
      // Redis failed — fall through to in-memory
    }
  }

  return checkFallback(entityId);
}

/**
 * Record that a narrative was generated (for tracking without checking).
 * In production, this is a no-op since checkNarrativeRateLimit already increments.
 */
export function recordNarrativeGeneration(entityId: string): void {
  // Redis-backed: already incremented by checkNarrativeRateLimit
  // Fallback: increment the in-memory counter
  const hasRedis = !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!hasRedis) {
    const now = Date.now();
    const entry = getOrCreateEntry(entityId, now);
    entry.minute++;
    entry.hour++;
    entry.day++;
  }
}
