/**
 * Entity-scoped TTL cache — Redis-backed with in-memory fallback.
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
 * REDIS: In production (Vercel serverless), in-memory Maps lose state across
 * invocations. Upstash Redis provides shared state across all instances.
 * Falls back to in-memory when Redis is unavailable (dev/test).
 *
 * SAFETY: values are serialized as JSON for Redis storage; TTL defaults are
 * short (60s); invalidation is explicit per namespace/entity.
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
  backend: "redis" | "memory";
}

// ─── Redis Helper ──────────────────────────────────────────────────────────

let redisClient: import("@upstash/redis").Redis | null = null;
let redisChecked = false;

function hasRedis(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function getRedis(): import("@upstash/redis").Redis | null {
  if (redisChecked) return redisClient;
  redisChecked = true;
  if (!hasRedis()) return null;
  try {
    // Dynamic import to avoid build errors when Upstash is not configured
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis");
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    return redisClient;
  } catch {
    return null;
  }
}

// ─── Cache Implementation ──────────────────────────────────────────────────

export class TenantCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private backend: "redis" | "memory" = "memory";

  constructor(
    private readonly maxEntries = 500,
    private readonly defaultTtlMs = 60_000,
  ) {
    this.backend = getRedis() ? "redis" : "memory";
  }

  /** Structural key: entityId first, then namespace, then a hash of the
   *  query key so no cross-tenant collision is possible. */
  private buildKey(entityId: string, namespace: string, key: string): string {
    const keyHash = createHash("sha256").update(key).digest("hex").slice(0, 16);
    return `tc:${entityId}::${namespace}::${keyHash}`;
  }

  async get<T>(
    entityId: string,
    namespace: string,
    key: string,
  ): Promise<T | undefined> {
    const storeKey = this.buildKey(entityId, namespace, key);

    // Try Redis first
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get<string>(storeKey);
        if (raw) {
          this.hits++;
          const entry = JSON.parse(raw) as CacheEntry<T>;
          if (entry.expiresAt <= Date.now()) {
            await redis.del(storeKey).catch(() => {});
            this.misses++;
            return undefined;
          }
          return entry.value;
        }
        this.misses++;
        return undefined;
      } catch {
        // Redis failed — fall through to memory
      }
    }

    // In-memory fallback
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

  async set<T>(
    entityId: string,
    namespace: string,
    key: string,
    value: T,
    ttlMs = this.defaultTtlMs,
  ): Promise<void> {
    const storeKey = this.buildKey(entityId, namespace, key);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };

    // Write to Redis
    const redis = getRedis();
    if (redis) {
      try {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        await redis.set(storeKey, JSON.stringify(entry), { ex: ttlSeconds });
        return;
      } catch {
        // Redis failed — fall through to memory
      }
    }

    // In-memory fallback
    if (this.store.size >= this.maxEntries) {
      const now = Date.now();
      for (const [k, v] of this.store) {
        if (v.expiresAt <= now) this.store.delete(k);
      }
    }
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(storeKey, entry);
  }

  /** Drop everything for one entity (called from mutations that touch the
   *  cached domain — e.g. fiscal.create invalidates fiscal.*). */
  async invalidateEntity(entityId: string, namespace?: string): Promise<void> {
    const prefix = `${entityId}::`;

    // Invalidate in Redis
    const redis = getRedis();
    if (redis) {
      try {
        // Scan for keys matching the pattern
        let cursor = 0;
        do {
          const result = await redis.scan(cursor, {
            match: `tc:${prefix}*`,
            count: 100,
          });
          cursor = result[0];
          const keys = result[1];
          if (keys.length > 0) {
            if (namespace) {
              const filtered = keys.filter((k: string) =>
                k.includes(`::${namespace}::`),
              );
              if (filtered.length > 0) {
                await redis.del(...filtered);
              }
            } else {
              await redis.del(...keys);
            }
          }
        } while (cursor !== 0);
      } catch {
        // Redis failed — continue with memory invalidation
      }
    }

    // Invalidate in memory
    for (const k of this.store.keys()) {
      if (k.startsWith(`tc:${prefix}`)) {
        if (!namespace || k.includes(`::${namespace}::`)) {
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
      backend: this.backend,
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
  get: <T>(entityId: string, key: string) => Promise<T | undefined>;
  set: <T>(entityId: string, key: string, value: T) => Promise<void>;
  invalidate: (entityId: string) => Promise<void>;
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
