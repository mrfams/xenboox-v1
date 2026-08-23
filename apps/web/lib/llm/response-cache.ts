/**
 * LLM Response Cache — Redis-backed with in-memory fallback.
 *
 * Caches LLM responses to avoid re-computation for repeated queries.
 * In production (Vercel serverless), in-memory Maps lose state across
 * invocations. Upstash Redis provides shared state across all instances.
 * Falls back to in-memory when Redis is unavailable (dev/test).
 */

import * as crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────────────────

export interface CacheEntry<T = unknown> {
  /** Cached response data */
  data: T;
  /** Hash of the input prompt for deduplication */
  inputHash: string;
  /** When the entry was created */
  createdAt: number;
  /** When the entry expires */
  expiresAt: number;
  /** Number of times this entry has been accessed */
  hitCount: number;
  /** Model used for this response */
  model?: string;
  /** Entity ID this response belongs to */
  entityId?: string;
}

export interface CacheConfig {
  /** Maximum number of entries in the cache */
  maxSize: number;
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Enable cache statistics */
  enableStats: boolean;
}

export interface CacheStats {
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Total number of entries evicted */
  evictions: number;
  /** Current number of entries in the cache */
  size: number;
  /** Hit rate as a percentage */
  hitRate: number;
  /** Which backend is active */
  backend: "redis" | "memory";
}

// ─── Default Configuration ──────────────────────────────────────────────

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttlMs: 60 * 60 * 1000, // 1 hour
  enableStats: true,
};

// ─── Redis Helper ───────────────────────────────────────────────────────

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

// ─── Cache Implementation ───────────────────────────────────────────────

class LLMResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
    backend: "memory",
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats.backend = getRedis() ? "redis" : "memory";
  }

  /**
   * Generate a hash for the input prompt
   */
  private hashInput(input: string, entityId?: string): string {
    const normalized = `${entityId || ""}:${input.toLowerCase().trim()}`;
    return crypto
      .createHash("sha256")
      .update(normalized)
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Get an entry from the cache
   */
  async get<T>(input: string, entityId?: string): Promise<T | null> {
    const hash = this.hashInput(input, entityId);

    // Try Redis first
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get<string>(`llm:${hash}`);
        if (raw) {
          const entry = JSON.parse(raw) as CacheEntry<T>;
          if (Date.now() > entry.expiresAt) {
            await redis.del(`llm:${hash}`).catch(() => {});
            this.stats.misses++;
            this.updateHitRate();
            return null;
          }
          entry.hitCount++;
          this.stats.hits++;
          this.updateHitRate();
          return entry.data;
        }
        this.stats.misses++;
        this.updateHitRate();
        return null;
      } catch {
        // Redis failed — fall through to memory
      }
    }

    // In-memory fallback
    const entry = this.cache.get(hash);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hash);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access stats
    entry.hitCount++;
    this.stats.hits++;
    this.updateHitRate();

    // Move to end (most recently used)
    this.cache.delete(hash);
    this.cache.set(hash, entry);

    return entry.data as T;
  }

  /**
   * Set an entry in the cache
   */
  async set<T>(
    input: string,
    data: T,
    options: {
      entityId?: string;
      model?: string;
      ttlMs?: number;
    } = {},
  ): Promise<void> {
    const hash = this.hashInput(input, options.entityId);
    const now = Date.now();
    const ttlMs = options.ttlMs || this.config.ttlMs;

    const entry: CacheEntry<T> = {
      data,
      inputHash: hash,
      createdAt: now,
      expiresAt: now + ttlMs,
      hitCount: 0,
      model: options.model,
      entityId: options.entityId,
    };

    // Write to Redis
    const redis = getRedis();
    if (redis) {
      try {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        await redis.set(`llm:${hash}`, JSON.stringify(entry), {
          ex: ttlSeconds,
        });
        return;
      } catch {
        // Redis failed — fall through to memory
      }
    }

    // In-memory fallback
    if (this.cache.size >= this.config.maxSize && !this.cache.has(hash)) {
      this.evictOldest();
    }

    this.cache.set(hash, entry);
    this.stats.size = this.cache.size;
  }

  /**
   * Check if an entry exists (without incrementing hit count)
   */
  async has(input: string, entityId?: string): Promise<boolean> {
    const hash = this.hashInput(input, entityId);

    // Try Redis first
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get<string>(`llm:${hash}`);
        if (!raw) return false;
        const entry = JSON.parse(raw) as CacheEntry;
        return Date.now() <= entry.expiresAt;
      } catch {
        // Fall through to memory
      }
    }

    const entry = this.cache.get(hash);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hash);
      return false;
    }
    return true;
  }

  /**
   * Delete an entry from the cache
   */
  async delete(input: string, entityId?: string): Promise<boolean> {
    const hash = this.hashInput(input, entityId);

    // Delete from Redis
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(`llm:${hash}`);
      } catch {
        // Continue with memory deletion
      }
    }

    // Delete from memory
    const deleted = this.cache.delete(hash);
    if (deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear all entries for a specific entity
   */
  async clearEntity(entityId: string): Promise<number> {
    let cleared = 0;

    // Clear from Redis (scan for matching keys)
    const redis = getRedis();
    if (redis) {
      try {
        let cursor = 0;
        do {
          const result = await redis.scan(cursor, {
            match: "llm:*",
            count: 100,
          });
          cursor = result[0];
          const keys = result[1];
          for (const key of keys) {
            const raw = await redis.get<string>(key);
            if (raw) {
              const entry = JSON.parse(raw) as CacheEntry;
              if (entry.entityId === entityId) {
                await redis.del(key);
                cleared++;
              }
            }
          }
        } while (cursor !== 0);
      } catch {
        // Continue with memory clearing
      }
    }

    // Clear from memory
    for (const [hash, entry] of this.cache) {
      if (entry.entityId === entityId) {
        this.cache.delete(hash);
        cleared++;
      }
    }
    this.stats.size = this.cache.size;
    return cleared;
  }

  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    // Clear Redis (scan and delete all llm: keys)
    const redis = getRedis();
    if (redis) {
      try {
        let cursor = 0;
        do {
          const result = await redis.scan(cursor, {
            match: "llm:*",
            count: 100,
          });
          cursor = result[0];
          const keys = result[1];
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== 0);
      } catch {
        // Continue with memory clearing
      }
    }

    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Evict the oldest (least recently used) entry
   */
  private evictOldest(): void {
    const keys = Array.from(this.cache.keys());
    const oldest = keys[0];
    if (oldest) {
      this.cache.delete(oldest);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.cache.entries());
    for (const [hash, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(hash);
        cleaned++;
      }
    }

    this.stats.size = this.cache.size;
    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────

let cacheInstance: LLMResponseCache | null = null;

/**
 * Get or create the LLM response cache instance
 */
export function getLLMResponseCache(
  config?: Partial<CacheConfig>,
): LLMResponseCache {
  if (!cacheInstance) {
    cacheInstance = new LLMResponseCache(config);
  }
  return cacheInstance;
}

/**
 * Helper function to get or set cached LLM response
 */
export async function withLLMCache<T>(
  input: string,
  computeFn: () => Promise<T>,
  options: {
    entityId?: string;
    model?: string;
    ttlMs?: number;
    cache?: LLMResponseCache;
  } = {},
): Promise<T> {
  const cache = options.cache || getLLMResponseCache();

  // Check cache first
  const cached = await cache.get<T>(input, options.entityId);
  if (cached !== null) {
    return cached;
  }

  // Compute and cache
  const result = await computeFn();
  await cache.set(input, result, {
    entityId: options.entityId,
    model: options.model,
    ttlMs: options.ttlMs,
  });

  return result;
}

// ─── Periodic Cleanup ───────────────────────────────────────────────────

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cache cleanup
 */
export function startCacheCleanup(intervalMs: number = 5 * 60 * 1000): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const cache = getLLMResponseCache();
    cache.cleanup();
  }, intervalMs);
}

/**
 * Stop periodic cache cleanup
 */
export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
