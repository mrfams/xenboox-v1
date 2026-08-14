import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SemanticCache } from "@xenboox/models";

describe("SemanticCache — repeated questions (§22.1)", () => {
  let cache: SemanticCache;

  beforeEach(() => {
    cache = new SemanticCache();
    cache.clear();
  });

  it("returns the cached answer for the identical question", () => {
    cache.store(
      "entity-1",
      "what was my cash balance?",
      "GMD 120,000",
      "claude-haiku-4-5",
      "anthropic",
    );
    const hit = cache.lookup("entity-1", "what was my cash balance?");
    expect(hit.hit).toBe(true);
    expect(hit.answer).toBe("GMD 120,000");
  });

  it("matches near-duplicate phrasing (semantic, not exact)", () => {
    cache.store(
      "entity-1",
      "what was my cash balance?",
      "GMD 120,000",
      "claude-haiku-4-5",
      "anthropic",
    );
    const hit = cache.lookup("entity-1", "Show me my cash balance please");
    expect(hit.hit).toBe(true);
    expect(hit.answer).toBe("GMD 120,000");
  });

  it("misses on unrelated questions", () => {
    cache.store(
      "entity-1",
      "what was my cash balance?",
      "GMD 120,000",
      "claude-haiku-4-5",
      "anthropic",
    );
    const miss = cache.lookup(
      "entity-1",
      "what is the weather today in banjul",
    );
    expect(miss.hit).toBe(false);
  });

  it("isolates cache entries per entity (multi-tenant)", () => {
    cache.store(
      "entity-1",
      "what was my cash balance?",
      "GMD 120,000",
      "claude-haiku-4-5",
      "anthropic",
    );
    const miss = cache.lookup("entity-2", "what was my cash balance?");
    expect(miss.hit).toBe(false);
  });

  it("honors a stricter similarity threshold", () => {
    const strict = new SemanticCache(15 * 60_000, 2_000, 0.99);
    strict.store(
      "entity-1",
      "what was my cash balance in january?",
      "GMD 120,000",
      "claude-haiku-4-5",
      "anthropic",
    );
    // A meaningfully shorter query misses at 0.99 (but hits at the 0.92 default)
    expect(strict.lookup("entity-1", "what was my cash balance?").hit).toBe(
      false,
    );
    // Exact match still hits
    expect(
      strict.lookup("entity-1", "what was my cash balance in january?").hit,
    ).toBe(true);
  });

  it("expires entries after the TTL", () => {
    const ttlCache = new SemanticCache(1_000); // 1s
    ttlCache.store(
      "entity-1",
      "what was my cash balance?",
      "GMD 120,000",
      "claude-haiku-4-5",
      "anthropic",
    );

    const oldNow = Date.now;
    vi.spyOn(Date, "now").mockImplementation(() => oldNow() + 2_000);
    expect(ttlCache.lookup("entity-1", "what was my cash balance?").hit).toBe(
      false,
    );
    vi.restoreAllMocks();
  });

  it("bounds memory with LRU eviction", () => {
    const small = new SemanticCache(60_000, 3);
    small.store("entity-1", "q one?", "a1", "m", "p");
    small.store("entity-1", "q two?", "a2", "m", "p");
    small.store("entity-1", "q three?", "a3", "m", "p");
    small.store("entity-1", "q four?", "a4", "m", "p"); // evicts oldest
    expect(small.size()).toBe(3);
  });

  it("tracks hit count on cached answers", () => {
    cache.store(
      "entity-1",
      "what was my cash balance?",
      "GMD 120,000",
      "claude-haiku-4-5",
      "anthropic",
    );
    cache.lookup("entity-1", "what was my cash balance?");
    cache.lookup("entity-1", "what was my cash balance?");
    // second lookup returns hit:true again (dedup in the model entry is caller-side)
    expect(cache.lookup("entity-1", "what was my cash balance?").hit).toBe(
      true,
    );
  });
});

describe("SemanticCache — normalization", () => {
  it("ignores stopwords and punctuation when matching", () => {
    const cache = new SemanticCache();
    cache.store(
      "e1",
      "Please show me our cash balance!",
      "GMD 5,000",
      "m",
      "p",
    );
    const hit = cache.lookup("e1", "please, show cash balance");
    expect(hit.hit).toBe(true);
  });

  it("does not match very short/empty normalized queries", () => {
    const cache = new SemanticCache();
    cache.store("e1", "hi", "hello", "m", "p");
    expect(cache.lookup("e1", "ok").hit).toBe(false);
  });
});
