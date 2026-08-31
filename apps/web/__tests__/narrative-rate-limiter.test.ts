/**
 * Narrative Rate Limiter — TDD Tests
 *
 * Tests the rate limiting behavior for AI narrative generation.
 * Covers: minute/hour/day limits, remaining counts, retryAfter, fallback behavior.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the security rate limiter to test in-memory fallback
vi.mock("@/lib/security/rate-limiter", () => ({
  getRateLimiter: () => ({
    checkApiRateLimit: vi.fn().mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: Math.floor(Date.now() / 1000) + 60,
    }),
  }),
}));

// Clear the module cache to reset in-memory state between tests
async function getFreshModule() {
  vi.resetModules();
  return await import("@/lib/rate-limiters/narrative-rate-limiter");
}

describe("narrative-rate-limiter", () => {
  describe("checkNarrativeRateLimit", () => {
    it("allows first request for an entity", async () => {
      const { checkNarrativeRateLimit } = await getFreshModule();
      const result = await checkNarrativeRateLimit("entity-1");

      expect(result.allowed).toBe(true);
      expect(result.remaining.minute).toBe(2); // 3 - 1
      expect(result.remaining.hour).toBe(9); // 10 - 1
      expect(result.remaining.day).toBe(49); // 50 - 1
    });

    it("allows multiple requests within minute limit", async () => {
      const { checkNarrativeRateLimit } = await getFreshModule();

      // Use up 2 of 3 minute slots
      await checkNarrativeRateLimit("entity-2");
      const result = await checkNarrativeRateLimit("entity-2");

      expect(result.allowed).toBe(true);
      expect(result.remaining.minute).toBe(1); // 3 - 2
    });

    it("rejects request when minute limit exceeded", async () => {
      const { checkNarrativeRateLimit } = await getFreshModule();

      // Use up all 3 minute slots
      await checkNarrativeRateLimit("entity-3");
      await checkNarrativeRateLimit("entity-3");
      await checkNarrativeRateLimit("entity-3");

      // 4th request should be rejected
      const result = await checkNarrativeRateLimit("entity-3");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.remaining.minute).toBe(0);
    });

    it("tracks hour-level counts correctly", async () => {
      const { checkNarrativeRateLimit } = await getFreshModule();

      // Make 3 requests (uses all minute slots)
      await checkNarrativeRateLimit("entity-4");
      await checkNarrativeRateLimit("entity-4");
      await checkNarrativeRateLimit("entity-4");

      // 4th request blocked by minute limit
      const blocked = await checkNarrativeRateLimit("entity-4");
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining.hour).toBe(7); // 10 - 3
    });

    it("tracks day-level counts correctly", async () => {
      const { checkNarrativeRateLimit } = await getFreshModule();

      // Make 3 requests (uses all minute slots)
      await checkNarrativeRateLimit("entity-5");
      await checkNarrativeRateLimit("entity-5");
      await checkNarrativeRateLimit("entity-5");

      // Day count should be 3
      const blocked = await checkNarrativeRateLimit("entity-5");
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining.day).toBe(47); // 50 - 3
    });

    it("isolates counts per entity", async () => {
      const { checkNarrativeRateLimit } = await getFreshModule();

      // Entity A uses 3 slots
      await checkNarrativeRateLimit("entity-a");
      await checkNarrativeRateLimit("entity-a");
      await checkNarrativeRateLimit("entity-a");

      // Entity B should still have full quota
      const result = await checkNarrativeRateLimit("entity-b");
      expect(result.allowed).toBe(true);
      expect(result.remaining.minute).toBe(2);
    });

    it("returns retryAfter when rate limited", async () => {
      const { checkNarrativeRateLimit } = await getFreshModule();

      // Exhaust minute limit
      await checkNarrativeRateLimit("entity-6");
      await checkNarrativeRateLimit("entity-6");
      await checkNarrativeRateLimit("entity-6");

      const result = await checkNarrativeRateLimit("entity-6");
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeTypeOf("number");
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60000); // Max 1 minute
    });
  });

  describe("recordNarrativeGeneration", () => {
    it("increments count without checking", async () => {
      const { checkNarrativeRateLimit, recordNarrativeGeneration } =
        await getFreshModule();

      // Record 2 generations
      recordNarrativeGeneration("entity-7");
      recordNarrativeGeneration("entity-7");

      // Check should show 2 used
      const result = await checkNarrativeRateLimit("entity-7");
      expect(result.remaining.minute).toBe(0); // 3 - 3 (2 recorded + 1 check)
    });
  });
});
