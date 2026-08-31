/**
 * Rate limiter for agent narrative generation.
 * 
 * Architecture: Uses a pluggable rate limit check function.
 * In production (web app context), the host app injects a Redis-backed checker.
 * In standalone mode (evals, tests), falls back to in-memory sliding window.
 *
 * Limits per entity:
 * - 3 per minute (burst protection)
 * - 10 per hour (sustained abuse protection)
 * - 50 per day (daily budget protection)
 */

const LIMITS = {
  perMinute: 3,
  perHour: 10,
  perDay: 50,
} as const;

const WINDOWS = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const;

// ─── In-Memory Sliding Window (Fallback) ───────────────────────────────────

const counts = new Map<
  string,
  { minute: number; hour: number; day: number; lastReset: number }
>();

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, value] of counts.entries()) {
    if (now - value.lastReset > WINDOWS.day) {
      counts.delete(key);
    }
  }
}

function checkInMemory(entityId: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  cleanupOldEntries();

  const now = Date.now();
  const entry = counts.get(entityId);

  if (!entry || now - entry.lastReset > WINDOWS.day) {
    counts.set(entityId, { minute: 1, hour: 1, day: 1, lastReset: now });
    return { allowed: true };
  }

  if (entry.day >= LIMITS.perDay) {
    return { allowed: false, retryAfterMs: WINDOWS.day - (now - entry.lastReset) };
  }

  if (entry.hour >= LIMITS.perHour) {
    return { allowed: false, retryAfterMs: WINDOWS.hour - (now - entry.lastReset) };
  }

  if (entry.minute >= LIMITS.perMinute) {
    return { allowed: false, retryAfterMs: WINDOWS.minute - (now - entry.lastReset) };
  }

  entry.minute++;
  entry.hour++;
  entry.day++;

  return { allowed: true };
}

// ─── Injectable Rate Limit Checker ──────────────────────────────────────────

export type RateLimitChecker = (entityId: string) => Promise<{
  allowed: boolean;
  retryAfterMs?: number;
}>;

let externalChecker: RateLimitChecker | null = null;

/**
 * Register an external rate limit checker (e.g., Redis-backed from the web app).
 * Call this once at startup to override the in-memory fallback.
 */
export function setRateLimitChecker(checker: RateLimitChecker): void {
  externalChecker = checker;
}

/**
 * Check if a request is allowed for this entity.
 * Uses external checker if registered, otherwise falls back to in-memory.
 */
export async function checkRateLimit(entityId: string): Promise<{
  allowed: boolean;
  retryAfterMs?: number;
}> {
  if (externalChecker) {
    try {
      return await externalChecker(entityId);
    } catch {
      // External checker failed — fall through to in-memory
    }
  }

  return checkInMemory(entityId);
}

/**
 * Record a request (for tracking without checking).
 */
export function recordRequest(entityId: string): void {
  if (externalChecker) {
    // External checker already handles counting
    return;
  }

  const now = Date.now();
  const entry = counts.get(entityId);

  if (!entry || now - entry.lastReset > WINDOWS.day) {
    counts.set(entityId, { minute: 1, hour: 1, day: 1, lastReset: now });
  } else {
    entry.minute++;
    entry.hour++;
    entry.day++;
  }
}
