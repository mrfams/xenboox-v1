/**
 * Entity-scoped in-memory TTL cache.
 *
 * PURPOSE: cheap, safe caching for rarely-changing configuration reads
 * (fiscal periods, tax rules, branding). Financial STATEMENT data must
 * NEVER go through here — freshness is sacred — which is why this cache is
 * opt-in per query, entity-scoped by construction, TTL-bounded, and capped
 * in size with LRU eviction.
 *
 * ISOLATION: the cache key is structurally prefixed with the entityId, so a
 * tenant can never read another tenant's cached value even if a caller
 * forgets to scope. This is the in-process complement to the DB RLS layer —
 * defense in depth, not a substitute.
 *
 * SAFETY: values are serialized-neutral (stored as-is) but keyed by a hash
 * of the canonical input; TTL defaults are short (60s); invalidation is
 * explicit per namespace/entity.
 */

import { createHash } from "node:crypto";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface TenantCacheStats {
  hits: number;
  misses: number;
  entries: number;
  maxEntries: number;
}

export class TenantCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxEntries = 500,
    private readonly defaultTtlMs = 60_000,
  ) {}

  /** Structural key: entityId first, then namespace, then a hash of the
   *  query key so no cross-tenant collision is possible. */
  private buildKey(entityId: string, namespace: string, key: string): string {
    const keyHash = createHash("sha256").update(key).digest("hex").slice(0, 16);
    return `${entityId}::${namespace}::${keyHash}`;
  }

  get<T>(entityId: string, namespace: string, key: string): T | undefined {
    const storeKey = this.buildKey(entityId, namespace, key);
    const entry = this.store.get(storeKey) as CacheEntry<T> | undefined;
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(storeKey);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set<T>(
    entityId: string,
    namespace: string,
    key: string,
    value: T,
    ttlMs = this.defaultTtlMs,
  ): void {
    // Evict expired entries opportunistically when near the cap.
    if (this.store.size >= this.maxEntries) {
      const now = Date.now();
      for (const [k, v] of this.store) {
        if (v.expiresAt <= now) this.store.delete(k);
      }
    }
    // Still over the cap: evict the oldest entry (LRU-ish by insertion).
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    const storeKey = this.buildKey(entityId, namespace, key);
    this.store.set(storeKey, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /** Drop everything for one entity (called from mutations that touch the
   *  cached domain — e.g. fiscal.create invalidates fiscal.*). */
  invalidateEntity(entityId: string, namespace?: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(`${entityId}::`)) {
        if (!namespace || k.startsWith(`${entityId}::${namespace}::`)) {
          this.store.delete(k);
        }
      }
    }
  }

  getStats(): TenantCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      entries: this.store.size,
      maxEntries: this.maxEntries,
    };
  }

  /** Test helper — full reset. */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/** Singleton — one cache per process, shared across routers. */
export const tenantCache = new TenantCache();

/** Convenience: namespaced helpers for a domain. */
export function cachedDomain(
  namespace: string,
  ttlMs = 60_000,
): {
  get: <T>(entityId: string, key: string) => T | undefined;
  set: <T>(entityId: string, key: string, value: T) => void;
  invalidate: (entityId: string) => void;
} {
  return {
    get: <T>(entityId: string, key: string) =>
      tenantCache.get<T>(entityId, namespace, key),
    set: <T>(entityId: string, key: string, value: T) =>
      tenantCache.set(entityId, namespace, key, value, ttlMs),
    invalidate: (entityId: string) =>
      tenantCache.invalidateEntity(entityId, namespace),
  };
}
