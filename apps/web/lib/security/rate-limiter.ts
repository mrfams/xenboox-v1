import { Redis } from "@upstash/redis";
import { Ratelimit, type Duration } from "@upstash/ratelimit";

class InMemoryRateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  async check(key: string, limit: number, windowSeconds: number) {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now > entry.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.floor((now + windowSeconds * 1000) / 1000),
      };
    }

    if (entry.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.floor(entry.resetAt / 1000),
      };
    }

    entry.count++;
    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: Math.floor(entry.resetAt / 1000),
    };
  }
}

const fallbackLimiter = new InMemoryRateLimiter();

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

function createRatelimit(
  prefix: string,
  requests: number,
  window: Duration,
  mode: "sliding" | "fixed" = "sliding",
) {
  const client = getRedis();
  if (!client) return null;
  return new Ratelimit({
    redis: client,
    limiter:
      mode === "sliding"
        ? Ratelimit.slidingWindow(requests, window)
        : Ratelimit.fixedWindow(requests, window),
    prefix,
  });
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ─── Per-Tenant Tier Limits (§19.2) ────────────────────────────────────────
//
// Limits scale with billing plan. Higher plans get higher ceilings.
// The tier is resolved from the user's organization at check time.

type BillingPlan = "free" | "starter" | "growth" | "pro" | "firm";

const TIER_LIMITS: Record<
  BillingPlan,
  { api: number; agent: number; chat: number; webhook: number }
> = {
  free: { api: 200, agent: 5, chat: 10, webhook: 20 },
  starter: { api: 500, agent: 10, chat: 20, webhook: 50 },
  growth: { api: 1000, agent: 20, chat: 30, webhook: 100 },
  pro: { api: 5000, agent: 50, chat: 60, webhook: 200 },
  firm: { api: 10000, agent: 100, chat: 120, webhook: 500 },
};

function getTierLimits(plan: BillingPlan | string) {
  return TIER_LIMITS[plan as BillingPlan] || TIER_LIMITS.free;
}

const DEFAULT_LIMIT = 1000;
const DEFAULT_WINDOW_SECONDS = 60;

async function tryUpstash(
  limiter: Ratelimit | null,
  identifier: string,
  fallbackLimit: number,
  fallbackWindowSeconds: number,
): Promise<RateLimitResult> {
  if (limiter) {
    try {
      const { success, limit, remaining, reset } =
        await limiter.limit(identifier);
      return { success, limit, remaining, reset: Math.floor(reset / 1000) };
    } catch {
      // Upstash failed — fall through to in-memory
    }
  }
  return fallbackLimiter.check(
    identifier,
    fallbackLimit,
    fallbackWindowSeconds,
  );
}

// Default limiters (used when plan is unknown)
const apiLimiter = hasRedis()
  ? createRatelimit("api", DEFAULT_LIMIT, "60 s")
  : null;

// Read ceiling — batch tRPC reads are the hottest path; this only stops
// scrapers/abuse, never legit reads (Vercel batches collapse ~N calls into
// one HTTP request, and per-batch they consume a single window entry).
const apiReadLimiter = hasRedis()
  ? createRatelimit("api:read", 5000, "60 s")
  : null;

const agentLimiter = hasRedis() ? createRatelimit("agent", 10, "60 s") : null;

const authLoginLimiter = hasRedis()
  ? createRatelimit("auth:login", 10, "60 s", "sliding")
  : null;

// Sustained window for login — 30 attempts per 15 min per IP (catches slow brute force)
const authLoginSustainedLimiter = hasRedis()
  ? createRatelimit("auth:login:sustained", 30, "15 m", "sliding")
  : null;

const authRegisterLimiter = hasRedis()
  ? createRatelimit("auth:register", 5, "15 m", "sliding")
  : null;

const authPasswordLimiter = hasRedis()
  ? createRatelimit("auth:password", 5, "15 m", "sliding")
  : null;

const webhookLimiter = hasRedis()
  ? createRatelimit("webhook", 100, "60 s")
  : null;

const chatStreamLimiter = hasRedis()
  ? createRatelimit("chat:stream", 30, "60 s")
  : null;

export class RateLimiter {
  async checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(
      apiLimiter,
      identifier,
      DEFAULT_LIMIT,
      DEFAULT_WINDOW_SECONDS,
    );
  }

  async checkApiReadRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(apiReadLimiter, identifier, 5000, 60);
  }

  async checkAuthLoginRateLimit(identifier: string): Promise<RateLimitResult> {
    // Two-window check: burst (10/min) AND sustained (30/15m). Must pass both.
    const burst = await tryUpstash(authLoginLimiter, identifier, 10, 60);
    if (!burst.success) return burst;
    const sustained = await tryUpstash(
      authLoginSustainedLimiter,
      `sustained:${identifier}`,
      30,
      900,
    );
    // Return the tighter window's remaining/reset when sustained is the limiter
    if (!sustained.success) return sustained;
    return burst.remaining < sustained.remaining ? burst : sustained;
  }

  async checkAuthRegisterRateLimit(
    identifier: string,
  ): Promise<RateLimitResult> {
    return tryUpstash(authRegisterLimiter, identifier, 5, 900);
  }

  async checkAuthPasswordRateLimit(
    identifier: string,
  ): Promise<RateLimitResult> {
    return tryUpstash(authPasswordLimiter, identifier, 5, 900);
  }

  async checkWebhookRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(webhookLimiter, identifier, 100, 60);
  }

  async checkAgentRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(agentLimiter, identifier, 10, 60);
  }

  async checkChatStreamRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(chatStreamLimiter, identifier, 30, 60);
  }

  async checkPaymentLinkRateLimit(
    identifier: string,
  ): Promise<RateLimitResult> {
    return tryUpstash(webhookLimiter, `pay:${identifier}`, 10, 60);
  }

  /**
   * Rate limit for resolving payment link tokens (public read endpoint).
   * More generous than payment: 30 per minute per token.
   */
  async checkPaymentLinkResolveRateLimit(
    identifier: string,
  ): Promise<RateLimitResult> {
    return tryUpstash(webhookLimiter, `pay:resolve:${identifier}`, 30, 60);
  }

  // ─── Plan-Aware Rate Limiting ──────────────────────────────────────────

  /**
   * Check API rate limit with plan-aware limits.
   * Pass the user's billing plan to get the correct tier ceiling.
   */
  async checkApiRateLimitForPlan(
    identifier: string,
    plan: BillingPlan | string,
  ): Promise<RateLimitResult> {
    const limits = getTierLimits(plan);
    const prefixedKey = `api:${plan}:${identifier}`;
    const limiter = hasRedis()
      ? createRatelimit(`api:${plan}`, limits.api, "60 s")
      : null;
    return tryUpstash(limiter, prefixedKey, limits.api, 60);
  }

  /**
   * Check agent rate limit with plan-aware limits.
   */
  async checkAgentRateLimitForPlan(
    identifier: string,
    plan: BillingPlan | string,
  ): Promise<RateLimitResult> {
    const limits = getTierLimits(plan);
    const prefixedKey = `agent:${plan}:${identifier}`;
    const limiter = hasRedis()
      ? createRatelimit(`agent:${plan}`, limits.agent, "60 s")
      : null;
    return tryUpstash(limiter, prefixedKey, limits.agent, 60);
  }

  /**
   * Check chat stream rate limit with plan-aware limits.
   */
  async checkChatStreamRateLimitForPlan(
    identifier: string,
    plan: BillingPlan | string,
  ): Promise<RateLimitResult> {
    const limits = getTierLimits(plan);
    const prefixedKey = `chat:${plan}:${identifier}`;
    const limiter = hasRedis()
      ? createRatelimit(`chat:${plan}`, limits.chat, "60 s")
      : null;
    return tryUpstash(limiter, prefixedKey, limits.chat, 60);
  }

  /**
   * Check webhook rate limit with plan-aware limits.
   */
  async checkWebhookRateLimitForPlan(
    identifier: string,
    plan: BillingPlan | string,
  ): Promise<RateLimitResult> {
    const limits = getTierLimits(plan);
    const prefixedKey = `webhook:${plan}:${identifier}`;
    const limiter = hasRedis()
      ? createRatelimit(`webhook:${plan}`, limits.webhook, "60 s")
      : null;
    return tryUpstash(limiter, prefixedKey, limits.webhook, 60);
  }
}

// ─── Concurrent-Request Limiter (§19.2) ────────────────────────────────────
//
// Heavy endpoints (report generation, bulk export) get a per-tenant
// concurrency cap so one tenant can't starve the pool. The limiter tracks
// ACTIVE (in-flight) requests — distinct from the windowed request-count
// limits above. Falls back to in-memory when Upstash is unreachable.

class InMemoryConcurrencyLimiter {
  private active = new Map<string, { count: number; expiresAt: number }>();

  /** Returns true when the slot was acquired. */
  acquire(key: string, max: number, ttlSeconds: number): boolean {
    const now = Date.now();
    const entry = this.active.get(key);
    if (!entry || now >= entry.expiresAt) {
      this.active.set(key, {
        count: 1,
        expiresAt: now + ttlSeconds * 1000,
      });
      return 1 <= max;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  release(key: string): void {
    const entry = this.active.get(key);
    if (!entry) return;
    entry.count = Math.max(0, entry.count - 1);
  }
}

const fallbackConcurrency = new InMemoryConcurrencyLimiter();

export class ConcurrencyLimiter {
  /**
   * Acquire a slot for `key`. `max` is the per-key ceiling of concurrent
   * in-flight operations; slots auto-expire after `ttlSeconds` so a crashed
   * handler can never leak a permanently-held slot.
   */
  async acquire(
    key: string,
    max: number,
    ttlSeconds: number,
  ): Promise<boolean> {
    if (hasRedis()) {
      try {
        const client = getRedis()!;
        // Lua-free approach: INCR + EXPIRE (first incr sets the TTL). An
        // EXPIRE race is harmless — worst case a slot lives slightly longer
        // than intended and the TTL still bounds it.
        const count = await client.incr(`concurrent:${key}`);
        if (count === 1) {
          await client.expire(`concurrent:${key}`, ttlSeconds);
        }
        if (count > max) {
          await client.decr(`concurrent:${key}`);
          return false;
        }
        return true;
      } catch {
        // Upstash failed — fall through to in-memory
      }
    }
    return fallbackConcurrency.acquire(key, max, ttlSeconds);
  }

  async release(key: string): Promise<void> {
    if (hasRedis()) {
      try {
        const client = getRedis()!;
        const count = await client.decr(`concurrent:${key}`);
        if (count <= 0) {
          await client.del(`concurrent:${key}`);
        }
        return;
      } catch {
        // ignore — TTL bounds the slot anyway
      }
    }
    fallbackConcurrency.release(key);
  }
}

let concurrencyLimiter: ConcurrencyLimiter | null = null;

export function getConcurrencyLimiter(): ConcurrencyLimiter {
  if (!concurrencyLimiter) {
    concurrencyLimiter = new ConcurrencyLimiter();
  }
  return concurrencyLimiter;
}

let rateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}
