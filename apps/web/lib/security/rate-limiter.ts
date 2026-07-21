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

function createRatelimit(prefix: string, requests: number, window: Duration) {
  const client = getRedis();
  if (!client) return null;
  return new Ratelimit({
    redis: client,
    limiter: Ratelimit.fixedWindow(requests, window),
    prefix,
  });
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
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

const apiLimiter = hasRedis()
  ? createRatelimit("api", DEFAULT_LIMIT, "60 s")
  : null;

const agentLimiter = hasRedis() ? createRatelimit("agent", 10, "60 s") : null;

const authLoginLimiter = hasRedis()
  ? createRatelimit("auth:login", 5, "60 s")
  : null;

const authRegisterLimiter = hasRedis()
  ? createRatelimit("auth:register", 3, "300 s")
  : null;

const authPasswordLimiter = hasRedis()
  ? createRatelimit("auth:password", 3, "300 s")
  : null;

const webhookLimiter = hasRedis()
  ? createRatelimit("webhook", 100, "60 s")
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

  async checkAuthLoginRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(authLoginLimiter, identifier, 5, 60);
  }

  async checkAuthRegisterRateLimit(
    identifier: string,
  ): Promise<RateLimitResult> {
    return tryUpstash(authRegisterLimiter, identifier, 3, 300);
  }

  async checkAuthPasswordRateLimit(
    identifier: string,
  ): Promise<RateLimitResult> {
    return tryUpstash(authPasswordLimiter, identifier, 3, 300);
  }

  async checkWebhookRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(webhookLimiter, identifier, 100, 60);
  }

  async checkAgentRateLimit(identifier: string): Promise<RateLimitResult> {
    return tryUpstash(agentLimiter, identifier, 10, 60);
  }
}

let rateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}
