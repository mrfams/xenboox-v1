/**
 * Narrative generation cache.
 * 
 * Architecture: Uses a pluggable cache interface.
 * In production (web app context), the host app injects a Redis-backed cache.
 * In standalone mode (evals, tests), falls back to in-memory Map.
 * 
 * TTL: 10 minutes
 * Key format: entityId:periodId:reportType
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

// ─── In-Memory Cache (Fallback) ────────────────────────────────────────────

const memoryCache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}

function buildKey(entityId: string, periodId: string, reportType: string): string {
  return `${entityId}:${periodId}:${reportType}`;
}

// ─── Injectable Cache Interface ─────────────────────────────────────────────

export type CacheProvider = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, ttlSeconds: number) => Promise<void>;
  del: (key: string) => Promise<void>;
  keysByPrefix: (prefix: string) => Promise<string[]>;
};

let externalCache: CacheProvider | null = null;

/**
 * Register an external cache provider (e.g., Redis from the web app).
 * Call this once at startup to override the in-memory fallback.
 */
export function setCacheProvider(provider: CacheProvider): void {
  externalCache = provider;
}

/**
 * Get a cached narrative result.
 */
export async function getCachedNarrative<T>(
  entityId: string,
  periodId: string,
  reportType: string,
): Promise<T | null> {
  const key = buildKey(entityId, periodId, reportType);

  if (externalCache) {
    try {
      return await externalCache.get<T>(key);
    } catch {
      // Cache read failed — fall through to in-memory
    }
  }

  cleanupExpired();
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Set a cached narrative result.
 */
export async function setCachedNarrative<T>(
  entityId: string,
  periodId: string,
  reportType: string,
  value: T,
): Promise<void> {
  const key = buildKey(entityId, periodId, reportType);

  if (externalCache) {
    try {
      await externalCache.set(key, value, 600); // 10 minutes
      return;
    } catch {
      // Cache write failed — fall through to in-memory
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Invalidate cache for an entity (e.g., after data mutation).
 */
export async function invalidateNarrativeCache(entityId: string): Promise<number> {
  if (externalCache) {
    try {
      const keys = await externalCache.keysByPrefix(entityId);
      for (const key of keys) {
        await externalCache.del(key);
      }
      return keys.length;
    } catch {
      // Cache invalidation failed — fall through to in-memory
    }
  }

  let count = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(entityId)) {
      memoryCache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Get cache stats for monitoring.
 */
export async function getNarrativeCacheStats(): Promise<{
  size: number;
  hitRate: number;
}> {
  if (externalCache) {
    // Redis doesn't easily expose hit rate — return size from keys scan
    try {
      const keys = await externalCache.keysByPrefix("");
      return { size: keys.length, hitRate: 0 };
    } catch {
      // fall through
    }
  }

  cleanupExpired();
  return {
    size: memoryCache.size,
    hitRate: 0, // TODO: track hits/misses with a counter
  };
}
