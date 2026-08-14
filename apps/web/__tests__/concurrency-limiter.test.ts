// ─── §19.2 Concurrent-request limiter — per-tenant heavy-operation caps ────
//
// Report generation / bulk export must be concurrency-capped per tenant so
// one workspace can't starve the shared pool. Test the in-memory fallback
// path (no Upstash env in unit tests) — the Redis path uses the same
// acquire/release contract.

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

async function makeLimiter() {
  const { getConcurrencyLimiter } = await import("@/lib/security/rate-limiter");
  return getConcurrencyLimiter();
}

describe("ConcurrencyLimiter (in-memory path)", () => {
  it("acquires up to the max and rejects beyond it", async () => {
    const limiter = await makeLimiter();
    expect(await limiter.acquire("entity-1", 2, 120)).toBe(true);
    expect(await limiter.acquire("entity-1", 2, 120)).toBe(true);
    expect(await limiter.acquire("entity-1", 2, 120)).toBe(false);
  });

  it("releases a slot so the next acquire succeeds", async () => {
    const limiter = await makeLimiter();
    expect(await limiter.acquire("entity-1", 1, 120)).toBe(true);
    expect(await limiter.acquire("entity-1", 1, 120)).toBe(false);
    await limiter.release("entity-1");
    expect(await limiter.acquire("entity-1", 1, 120)).toBe(true);
  });

  it("tracks tenants independently — one tenant can't starve another", async () => {
    const limiter = await makeLimiter();
    await limiter.acquire("entity-1", 1, 120);
    expect(await limiter.acquire("entity-2", 1, 120)).toBe(true);
    expect(await limiter.acquire("entity-1", 1, 120)).toBe(false);
  });

  it("expires slots after the TTL so a crashed handler frees itself", async () => {
    const limiter = await makeLimiter();
    expect(await limiter.acquire("entity-1", 1, 0)).toBe(true); // TTL 0 = already expired
    expect(await limiter.acquire("entity-1", 1, 0)).toBe(true);
  });

  it("release is idempotent and never goes negative", async () => {
    const limiter = await makeLimiter();
    await limiter.acquire("entity-1", 5, 120);
    await limiter.release("entity-1");
    await limiter.release("entity-1");
    // After over-releasing, the counter floors at 0 — next acquire works.
    expect(await limiter.acquire("entity-1", 1, 120)).toBe(true);
  });
});
