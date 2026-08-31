/**
 * Narrative Cache — TDD Tests
 *
 * Tests the cache behavior for narrative generation results.
 * Covers: get/set, TTL expiry, invalidation, entity isolation, injectable provider.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Clear module cache to reset in-memory state between tests
async function getFreshModule() {
  vi.resetModules();
  return await import("../core/narrative-cache");
}

describe("narrative-cache", () => {
  describe("in-memory fallback", () => {
    it("stores and retrieves a narrative", async () => {
      const { setCachedNarrative, getCachedNarrative } = await getFreshModule();

      const narrative = { summary: "Revenue grew 10%", confidence: 0.85 };
      await setCachedNarrative("entity-1", "period-1", "report", narrative);

      const cached = await getCachedNarrative("entity-1", "period-1", "report");
      expect(cached).toEqual(narrative);
    });

    it("returns null for cache miss", async () => {
      const { getCachedNarrative } = await getFreshModule();

      const cached = await getCachedNarrative("entity-1", "period-1", "report");
      expect(cached).toBeNull();
    });

    it("isolates caches per entity", async () => {
      const { setCachedNarrative, getCachedNarrative } = await getFreshModule();

      await setCachedNarrative("entity-a", "period-1", "report", { data: "A" });
      await setCachedNarrative("entity-b", "period-1", "report", { data: "B" });

      const cachedA = await getCachedNarrative("entity-a", "period-1", "report");
      const cachedB = await getCachedNarrative("entity-b", "period-1", "report");

      expect(cachedA).toEqual({ data: "A" });
      expect(cachedB).toEqual({ data: "B" });
    });

    it("isolates caches per period", async () => {
      const { setCachedNarrative, getCachedNarrative } = await getFreshModule();

      await setCachedNarrative("entity-1", "period-1", "report", { data: "P1" });
      await setCachedNarrative("entity-1", "period-2", "report", { data: "P2" });

      const cached1 = await getCachedNarrative("entity-1", "period-1", "report");
      const cached2 = await getCachedNarrative("entity-1", "period-2", "report");

      expect(cached1).toEqual({ data: "P1" });
      expect(cached2).toEqual({ data: "P2" });
    });

    it("isolates caches per report type", async () => {
      const { setCachedNarrative, getCachedNarrative } = await getFreshModule();

      await setCachedNarrative("entity-1", "period-1", "pnl", { data: "P&L" });
      await setCachedNarrative("entity-1", "period-1", "bs", { data: "BS" });

      const cachedPnl = await getCachedNarrative("entity-1", "period-1", "pnl");
      const cachedBs = await getCachedNarrative("entity-1", "period-1", "bs");

      expect(cachedPnl).toEqual({ data: "P&L" });
      expect(cachedBs).toEqual({ data: "BS" });
    });

    it("invalidates all entries for an entity", async () => {
      const { setCachedNarrative, getCachedNarrative, invalidateNarrativeCache } =
        await getFreshModule();

      await setCachedNarrative("entity-1", "period-1", "report", { data: "1" });
      await setCachedNarrative("entity-1", "period-2", "report", { data: "2" });
      await setCachedNarrative("entity-2", "period-1", "report", { data: "3" });

      const count = await invalidateNarrativeCache("entity-1");
      expect(count).toBe(2);

      // Entity-1 entries should be gone
      const cached1 = await getCachedNarrative("entity-1", "period-1", "report");
      const cached2 = await getCachedNarrative("entity-1", "period-2", "report");
      expect(cached1).toBeNull();
      expect(cached2).toBeNull();

      // Entity-2 entry should still exist
      const cached3 = await getCachedNarrative("entity-2", "period-1", "report");
      expect(cached3).toEqual({ data: "3" });
    });

    it("overwrites existing cache entry", async () => {
      const { setCachedNarrative, getCachedNarrative } = await getFreshModule();

      await setCachedNarrative("entity-1", "period-1", "report", { data: "old" });
      await setCachedNarrative("entity-1", "period-1", "report", { data: "new" });

      const cached = await getCachedNarrative("entity-1", "period-1", "report");
      expect(cached).toEqual({ data: "new" });
    });

    it("returns stats with size", async () => {
      const { setCachedNarrative, getNarrativeCacheStats } =
        await getFreshModule();

      await setCachedNarrative("entity-1", "period-1", "report", { data: "1" });
      await setCachedNarrative("entity-1", "period-2", "report", { data: "2" });

      const stats = await getNarrativeCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe("injectable cache provider", () => {
    it("uses external provider when registered", async () => {
      const { setCacheProvider, setCachedNarrative, getCachedNarrative } =
        await getFreshModule();

      const store = new Map<string, unknown>();
      const provider = {
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, value: unknown) => {
          store.set(key, value);
        }),
        del: vi.fn(async (key: string) => {
          store.delete(key);
        }),
        keysByPrefix: vi.fn(async (prefix: string) => {
          return [...store.keys()].filter((k) => k.startsWith(prefix));
        }),
      };

      setCacheProvider(provider);

      const narrative = { summary: "Test", confidence: 0.9 };
      await setCachedNarrative("entity-1", "period-1", "report", narrative);

      // Should have called provider.set
      expect(provider.set).toHaveBeenCalled();

      const cached = await getCachedNarrative("entity-1", "period-1", "report");
      expect(cached).toEqual(narrative);
    });

    it("falls back to in-memory when provider fails", async () => {
      const { setCacheProvider, setCachedNarrative, getCachedNarrative } =
        await getFreshModule();

      const provider = {
        get: vi.fn(async () => {
          throw new Error("Redis down");
        }),
        set: vi.fn(async () => {
          throw new Error("Redis down");
        }),
        del: vi.fn(async () => {}),
        keysByPrefix: vi.fn(async () => []),
      };

      setCacheProvider(provider);

      // Should fall back to in-memory
      const narrative = { summary: "Fallback", confidence: 0.8 };
      await setCachedNarrative("entity-1", "period-1", "report", narrative);

      const cached = await getCachedNarrative("entity-1", "period-1", "report");
      expect(cached).toEqual(narrative);
    });
  });
});
