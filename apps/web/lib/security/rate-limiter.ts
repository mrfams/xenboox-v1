import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1000, "60 s"),
  prefix: "api",
})

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "60 s"),
  prefix: "auth",
})

const webhookLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(100, "60 s"),
  prefix: "webhook",
})

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export class RateLimiter {
  async checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return {
        success: true,
        limit: 1000,
        remaining: 999,
        reset: Math.floor(Date.now() / 1000) + 60,
      }
    }

    const { success, limit, remaining, reset } = await apiLimiter.limit(identifier)
    
    return {
      success,
      limit,
      remaining,
      reset: Math.floor(reset / 1000),
    }
  }

  async checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return {
        success: true,
        limit: 10,
        remaining: 9,
        reset: Math.floor(Date.now() / 1000) + 60,
      }
    }

    const { success, limit, remaining, reset } = await authLimiter.limit(identifier)
    
    return {
      success,
      limit,
      remaining,
      reset: Math.floor(reset / 1000),
    }
  }

  async checkWebhookRateLimit(identifier: string): Promise<RateLimitResult> {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return {
        success: true,
        limit: 100,
        remaining: 99,
        reset: Math.floor(Date.now() / 1000) + 60,
      }
    }

    const { success, limit, remaining, reset } = await webhookLimiter.limit(identifier)
    
    return {
      success,
      limit,
      remaining,
      reset: Math.floor(reset / 1000),
    }
  }
}

let rateLimiter: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter()
  }
  return rateLimiter
}