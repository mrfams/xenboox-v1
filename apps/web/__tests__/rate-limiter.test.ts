import { describe, it, expect } from "vitest";

import { getRateLimiter } from "@/lib/security/rate-limiter";

describe("RateLimiter (in-memory fallback)", () => {
  it("allows requests within the chat stream limit and blocks beyond it", async () => {
    const limiter = getRateLimiter();
    const identifier = `chat:user-${Date.now()}`;

    let blocked = false;
    for (let i = 0; i < 35; i++) {
      const result = await limiter.checkChatStreamRateLimit(identifier);
      if (!result.success) {
        blocked = true;
        expect(result.remaining).toBe(0);
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it("tracks separate windows per identifier", async () => {
    const limiter = getRateLimiter();
    const a = `chat:user-a-${Date.now()}`;
    const b = `chat:user-b-${Date.now()}`;

    // Exhaust user A's window
    for (let i = 0; i < 35; i++) {
      await limiter.checkChatStreamRateLimit(a);
    }

    // User B is unaffected
    const result = await limiter.checkChatStreamRateLimit(b);
    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("returns reset timestamp in the future when blocked", async () => {
    const limiter = getRateLimiter();
    const identifier = `chat:user-${Date.now()}`;
    for (let i = 0; i < 35; i++) {
      await limiter.checkChatStreamRateLimit(identifier);
    }
    const result = await limiter.checkChatStreamRateLimit(identifier);
    expect(result.success).toBe(false);
    expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(result.limit).toBe(30);
  });

  it("API rate limit uses the default 1000/min window", async () => {
    const limiter = getRateLimiter();
    const result = await limiter.checkApiRateLimit(`api:test-${Date.now()}`);
    expect(result.success).toBe(true);
    expect(result.limit).toBe(1000);
  });

  it("agent rate limit window is 10/min", async () => {
    const limiter = getRateLimiter();
    const identifier = `agent:test-${Date.now()}`;
    let blocked = false;
    for (let i = 0; i < 15; i++) {
      const result = await limiter.checkAgentRateLimit(identifier);
      if (!result.success) {
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
  });
});
