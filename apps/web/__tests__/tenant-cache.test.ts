// ─── §4.5/§344 Tenant-scoped TTL cache ─────────────────────────────────────
//
// The cache is the safe caching layer for rarely-changing configuration
// reads. The tests pin the four invariants that matter:
// 1. ENTITY ISOLATION — a tenant can never read another tenant's value.
// 2. TTL expiry — stale values are never served.
// 3. Size cap with eviction — memory stays bounded.
// 4. Invalidation — mutations propagate immediately.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TenantCache,
  cachedDomain,
  tenantCache,
} from "@/lib/cache/tenant-cache";

describe("TenantCache", () => {
  let cache: TenantCache;

  beforeEach(() => {
    cache = new TenantCache(100, 60_000);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined on miss and the value on hit", () => {
    expect(cache.get("entity-a", "ns", "k")).toBeUndefined();
    cache.set("entity-a", "ns", "k", { v: 1 });
    expect(cache.get("entity-a", "ns", "k")).toEqual({ v: 1 });
    expect(cache.getStats().hits).toBe(1);
    expect(cache.getStats().misses).toBe(1);
  });

  it("isolates values per entity even with identical keys", () => {
    cache.set("entity-a", "ns", "same-key", "A-data");
    cache.set("entity-b", "ns", "same-key", "B-data");
    expect(cache.get("entity-a", "ns", "same-key")).toBe("A-data");
    expect(cache.get("entity-b", "ns", "same-key")).toBe("B-data");
  });

  it("isolates values per namespace for the same entity", () => {
    cache.set("entity-a", "ns-1", "k", "one");
    cache.set("entity-a", "ns-2", "k", "two");
    expect(cache.get("entity-a", "ns-1", "k")).toBe("one");
    expect(cache.get("entity-a", "ns-2", "k")).toBe("two");
  });

  it("expires entries after the TTL", () => {
    cache.set("entity-a", "ns", "k", "fresh", 60_000);
    vi.advanceTimersByTime(59_999);
    expect(cache.get("entity-a", "ns", "k")).toBe("fresh");
    vi.advanceTimersByTime(2);
    expect(cache.get("entity-a", "ns", "k")).toBeUndefined();
  });

  it("evicts the oldest entry when over the cap", () => {
    const small = new TenantCache(2, 60_000);
    small.set("e", "n", "1", "first");
    small.set("e", "n", "2", "second");
    small.set("e", "n", "3", "third");
    expect(small.get("e", "n", "1")).toBeUndefined(); // oldest evicted
    expect(small.get("e", "n", "2")).toBe("second");
    expect(small.get("e", "n", "3")).toBe("third");
    expect(small.getStats().entries).toBeLessThanOrEqual(2);
  });

  it("invalidates a namespace for one entity only", () => {
    cache.set("entity-a", "fiscal", "k1", "a1");
    cache.set("entity-a", "tax-rules", "k2", "a2");
    cache.set("entity-b", "fiscal", "k1", "b1");

    cache.invalidateEntity("entity-a", "fiscal");

    expect(cache.get("entity-a", "fiscal", "k1")).toBeUndefined();
    expect(cache.get("entity-a", "tax-rules", "k2")).toBe("a2");
    expect(cache.get("entity-b", "fiscal", "k1")).toBe("b1");
  });

  it("invalidates everything for an entity when no namespace is given", () => {
    cache.set("entity-a", "fiscal", "k1", "a1");
    cache.set("entity-a", "tax-rules", "k2", "a2");
    cache.invalidateEntity("entity-a");
    expect(cache.get("entity-a", "fiscal", "k1")).toBeUndefined();
    expect(cache.get("entity-a", "tax-rules", "k2")).toBeUndefined();
  });
});

describe("cachedDomain helper", () => {
  beforeEach(() => {
    tenantCache.clear();
  });

  it("namespaces get/set/invalidate through the shared singleton", () => {
    const domain = cachedDomain("tax-rules", 60_000);
    domain.set("entity-1", "key-a", { count: 3 });
    expect(domain.get("entity-1", "key-a")).toEqual({ count: 3 });
    // Different entity, same key — isolated.
    expect(domain.get("entity-2", "key-a")).toBeUndefined();
    domain.invalidate("entity-1");
    expect(domain.get("entity-1", "key-a")).toBeUndefined();
  });

  it("hashing keys means different inputs never collide", () => {
    const domain = cachedDomain("ns");
    domain.set("entity-1", '{"country":"KE"}', "ke");
    domain.set("entity-1", '{"country":"UG"}', "ug");
    expect(domain.get("entity-1", '{"country":"KE"}')).toBe("ke");
    expect(domain.get("entity-1", '{"country":"UG"}')).toBe("ug");
  });
});
