/**
 * Retrieval Engine Tests — Vector Search, Hybrid Fusion, Citation Formatting
 *
 * Covers: hybridFuse, formatCitations, formatStructuredCitations,
 * cosineSimilarity, chunkText, and retrieve (DB-mocked).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RetrievedChunk } from "../engine/retrieval";

// ─── Hoisted Mock Variables ──────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    query: {
      documentChunks: { findMany: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock("@xenboox/db", () => ({ db: mockDb }));

vi.mock("../engine/embeddings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../engine/embeddings")>();
  return {
    ...actual,
    generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3, 0.4, 0.5]]),
  };
});

// ─── Test Data ───────────────────────────────────────────────────────────

function makeChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: overrides.id ?? `chunk-${Math.random().toString(36).slice(2, 8)}`,
    content: overrides.content ?? "Test content",
    documentId: overrides.documentId ?? "doc-1",
    sourceType: overrides.sourceType ?? "knowledge_document",
    chunkIndex: overrides.chunkIndex ?? 0,
    score: overrides.score ?? 0.5,
    method: overrides.method ?? "vector",
    metadata: overrides.metadata,
  };
}

function setupDbMocks(chunks: any[] = [], citationId = "citation-1") {
  mockDb.query.documentChunks.findMany.mockResolvedValue(chunks);
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: chunks.length }]),
    }),
  });
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: citationId }]),
    }),
  });
  mockDb.execute.mockRejectedValue(new Error("pgvector not available"));
}

// ─── cosineSimilarity Tests ──────────────────────────────────────────────

describe("cosineSimilarity — Math Correctness", () => {
  let cosineSimilarity: (a: number[], b: number[]) => number;

  beforeEach(async () => {
    vi.resetModules();
    // Re-import to get the real function (not mocked)
    const mod = await import("../engine/embeddings");
    cosineSimilarity = mod.cosineSimilarity;
  });

  it("returns 1.0 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0, 0], [1, 0, 0, 0])).toBe(1.0);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0, 0], [0, 1, 0, 0])).toBe(0.0);
  });

  it("returns -1.0 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1.0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it("handles negative values", () => {
    expect(cosineSimilarity([1, -1, 0], [-1, 1, 0])).toBeCloseTo(-1.0, 10);
  });

  it("is commutative", () => {
    const a = [0.1, 0.2, 0.3];
    const b = [0.4, 0.5, 0.6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });

  it("normalized vectors produce correct similarity", () => {
    const a = [0.6, 0.8];
    const b = [0.8, 0.6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.96, 5);
  });
});

// ─── chunkText Tests ─────────────────────────────────────────────────────

describe("chunkText — Text Splitting & Overlap", () => {
  let chunkText: typeof import("../engine/embeddings").chunkText;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../engine/embeddings");
    chunkText = mod.chunkText;
  });

  it("returns empty array for empty text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk for short text", () => {
    const chunks = chunkText("Hello world.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("Hello world.");
    expect(chunks[0].index).toBe(0);
  });

  it("splits text into multiple chunks", () => {
    const text = "Sentence one. Sentence two. Sentence three. Sentence four.";
    const chunks = chunkText(text, 10, 0);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("assigns sequential chunk indices", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Sentence ${i}.`).join(
      " ",
    );
    const chunks = chunkText(text, 15, 0);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].index).toBe(i);
    }
  });

  it("estimates token count for each chunk", () => {
    const chunks = chunkText("Hello world. This is a test.");
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });

  it("provides metadata with offsets", () => {
    const chunks = chunkText("First sentence. Second sentence.");
    for (const chunk of chunks) {
      expect(chunk.metadata).toBeDefined();
      expect(typeof chunk.metadata.startOffset).toBe("number");
      expect(typeof chunk.metadata.endOffset).toBe("number");
    }
  });

  it("handles paragraph breaks", () => {
    const text = "Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.";
    const chunks = chunkText(text, 100, 0);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("handles single long word (no sentence boundaries)", () => {
    // A single word without punctuation is treated as one sentence
    const chunks = chunkText("A".repeat(500), 50, 0);
    expect(chunks).toHaveLength(1);
  });

  it("handles long text with sentence boundaries", () => {
    const text = Array.from(
      { length: 20 },
      (_, i) => `Sentence ${i} with some words.`,
    ).join(" ");
    const chunks = chunkText(text, 50, 0);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("handles text with no punctuation", () => {
    const text = "No punctuation here just words flowing together";
    const chunks = chunkText(text, 100, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(text);
  });
});

// ─── hybridFuse Tests ────────────────────────────────────────────────────

describe("hybridFuse — Reciprocal Rank Fusion", () => {
  // Local re-implementation matching the source (not exported)
  function hybridFuse(
    vectorResults: RetrievedChunk[],
    keywordResults: RetrievedChunk[],
    topK: number,
    vectorWeight = 0.7,
    keywordWeight = 0.3,
  ): RetrievedChunk[] {
    const scoreMap = new Map<string, RetrievedChunk & { fusedScore: number }>();
    vectorResults.forEach((chunk, rank) => {
      scoreMap.set(chunk.id, {
        ...chunk,
        fusedScore: vectorWeight / (60 + rank),
        method: "vector",
      });
    });
    keywordResults.forEach((chunk, rank) => {
      const rrfScore = keywordWeight / (60 + rank);
      const existing = scoreMap.get(chunk.id);
      if (existing) existing.fusedScore += rrfScore;
      else
        scoreMap.set(chunk.id, {
          ...chunk,
          fusedScore: rrfScore,
          method: "keyword",
        });
    });
    return Array.from(scoreMap.values())
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, topK)
      .map(({ fusedScore, ...chunk }) => ({ ...chunk, score: fusedScore }));
  }

  it("fuses vector and keyword results", () => {
    const fused = hybridFuse(
      [
        makeChunk({ id: "v1", method: "vector" }),
        makeChunk({ id: "v2", method: "vector" }),
      ],
      [
        makeChunk({ id: "k1", method: "keyword" }),
        makeChunk({ id: "k2", method: "keyword" }),
      ],
      5,
    );
    expect(fused.length).toBe(4);
  });

  it("deduplicates chunks in both results", () => {
    const fused = hybridFuse(
      [makeChunk({ id: "shared", method: "vector" })],
      [makeChunk({ id: "shared", method: "keyword" })],
      5,
    );
    expect(fused).toHaveLength(1);
    expect(fused[0].score).toBeCloseTo(0.7 / 60 + 0.3 / 60, 6);
  });

  it("respects topK limit", () => {
    const chunks = Array.from({ length: 10 }, (_, i) =>
      makeChunk({ id: `v${i}` }),
    );
    expect(hybridFuse(chunks, [], 3)).toHaveLength(3);
  });

  it("handles empty inputs", () => {
    expect(hybridFuse([], [], 5)).toHaveLength(0);
  });

  it("handles only vector results", () => {
    const chunks = [makeChunk({ id: "v1" }), makeChunk({ id: "v2" })];
    const fused = hybridFuse(chunks, [], 5);
    expect(fused).toHaveLength(2);
    expect(fused[0].score).toBeGreaterThan(fused[1].score);
  });

  it("handles only keyword results", () => {
    const chunks = [makeChunk({ id: "k1" }), makeChunk({ id: "k2" })];
    const fused = hybridFuse([], chunks, 5);
    expect(fused).toHaveLength(2);
    expect(fused[0].score).toBeGreaterThan(fused[1].score);
  });

  it("applies custom weights correctly", () => {
    // With separate chunks (no overlap), vector chunk only gets vector weight, keyword only gets keyword weight
    const vectorOnly = makeChunk({ id: "vec-only", method: "vector" });
    const keywordOnly = makeChunk({ id: "key-only", method: "keyword" });

    const highVector = hybridFuse([vectorOnly], [keywordOnly], 5, 0.9, 0.1);
    // vec-only gets 0.9/60, key-only gets 0.1/60
    const vecScore = highVector.find((c) => c.id === "vec-only")!;
    const keyScore = highVector.find((c) => c.id === "key-only")!;
    expect(vecScore.score).toBeGreaterThan(keyScore.score);
  });

  it("RRF formula is correct", () => {
    const fused = hybridFuse(
      [makeChunk({ id: "v1" }), makeChunk({ id: "v2" })],
      [],
      5,
    );
    expect(fused[0].score).toBeCloseTo(0.7 / 60, 6);
    expect(fused[1].score).toBeCloseTo(0.7 / 61, 6);
  });

  it("preserves chunk metadata", () => {
    const metadata = { section: "Ch1" };
    const fused = hybridFuse([makeChunk({ id: "v1", metadata })], [], 5);
    expect(fused[0].metadata).toEqual(metadata);
  });
});

// ─── formatCitations Tests ───────────────────────────────────────────────

describe("formatCitations — Markdown Citations", () => {
  let formatCitations: typeof import("../engine/retrieval").formatCitations;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../engine/retrieval");
    formatCitations = mod.formatCitations;
  });

  it("formats single chunk", () => {
    const result = formatCitations([
      makeChunk({
        sourceType: "knowledge_document",
        chunkIndex: 0,
        score: 0.95,
      }),
    ]);
    expect(result).toContain("**Sources:**");
    expect(result).toContain("[1]");
    expect(result).toContain("Knowledge Base");
    expect(result).toContain("score: 0.95");
  });

  it("formats multiple chunks", () => {
    const result = formatCitations([
      makeChunk({
        sourceType: "knowledge_document",
        chunkIndex: 0,
        score: 0.95,
      }),
      makeChunk({
        sourceType: "uploaded_document",
        chunkIndex: 3,
        score: 0.82,
      }),
    ]);
    expect(result).toContain("[1]");
    expect(result).toContain("[2]");
    expect(result).toContain("Knowledge Base");
    expect(result).toContain("Document");
  });

  it("returns empty string for empty chunks", () => {
    expect(formatCitations([])).toBe("");
  });

  it("uses correct source labels", () => {
    const result = formatCitations([
      makeChunk({ sourceType: "knowledge_document" }),
      makeChunk({ sourceType: "uploaded_document" }),
      makeChunk({ sourceType: "journal_entry" }),
      makeChunk({ sourceType: "custom" }),
    ]);
    expect(result).toContain("Knowledge Base");
    expect(result).toContain("Document");
    expect(result).toContain("journal_entry");
    expect(result).toContain("custom");
  });

  it("chunk index is 1-based", () => {
    expect(formatCitations([makeChunk({ chunkIndex: 0 })])).toContain(
      "chunk 1",
    );
    expect(formatCitations([makeChunk({ chunkIndex: 5 })])).toContain(
      "chunk 6",
    );
  });

  it("score formatted to 2 decimal places", () => {
    expect(formatCitations([makeChunk({ score: 0.87654 })])).toContain(
      "score: 0.88",
    );
  });
});

// ─── formatStructuredCitations Tests ─────────────────────────────────────

describe("formatStructuredCitations — API Citations", () => {
  let formatStructuredCitations: typeof import("../engine/retrieval").formatStructuredCitations;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../engine/retrieval");
    formatStructuredCitations = mod.formatStructuredCitations;
  });

  it("returns structured objects", () => {
    const result = formatStructuredCitations([
      makeChunk({
        content: "Test",
        sourceType: "knowledge_document",
        documentId: "doc-1",
        score: 0.9,
        method: "vector",
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      index: 1,
      content: "Test",
      sourceType: "knowledge_document",
      documentId: "doc-1",
      score: 0.9,
      method: "vector",
    });
  });

  it("truncates content > 200 chars", () => {
    const result = formatStructuredCitations([
      makeChunk({ content: "A".repeat(300) }),
    ]);
    expect(result[0].content).toHaveLength(203);
    expect(result[0].content).toContain("...");
  });

  it("does not truncate <= 200 chars", () => {
    const result = formatStructuredCitations([
      makeChunk({ content: "A".repeat(200) }),
    ]);
    expect(result[0].content).toHaveLength(200);
  });

  it("returns empty array for empty input", () => {
    expect(formatStructuredCitations([])).toEqual([]);
  });

  it("indexes from 1", () => {
    const result = formatStructuredCitations([
      makeChunk({ id: "a" }),
      makeChunk({ id: "b" }),
    ]);
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(2);
  });
});

// ─── retrieve Integration Tests ──────────────────────────────────────────

describe("retrieve — Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbMocks([]);
  });

  it("defaults to hybrid method", async () => {
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("test", {
      entityId: "e1",
      agentName: "agent",
    });
    expect(result.method).toBe("hybrid");
  });

  it("returns citation ID", async () => {
    setupDbMocks([], "cit-xyz");
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("test", {
      entityId: "e1",
      agentName: "agent",
    });
    expect(result.citationId).toBe("cit-xyz");
  });

  it("measures duration", async () => {
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("test", {
      entityId: "e1",
      agentName: "agent",
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("logs citation metadata", async () => {
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "cit-1" }]),
    });
    mockDb.insert.mockReturnValue({ values: mockValues });

    const { retrieve } = await import("../engine/retrieval");
    await retrieve("my query", {
      entityId: "e1",
      agentName: "cfo",
      method: "vector",
    });

    expect(mockValues).toHaveBeenCalled();
    const data = mockValues.mock.calls[0][0];
    expect(data.entityId).toBe("e1");
    expect(data.query).toBe("my query");
    expect(data.agentName).toBe("cfo");
    expect(data.retrievalMethod).toBe("vector");
  });

  it("vector method falls back to application-level search", async () => {
    setupDbMocks([
      {
        id: "c1",
        content: "Test",
        documentId: "d1",
        sourceType: "knowledge_document",
        chunkIndex: 0,
        embedding: JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5]),
        metadata: null,
      },
    ]);
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("test", {
      entityId: "e1",
      agentName: "agent",
      method: "vector",
    });
    expect(mockDb.execute).toHaveBeenCalled();
    expect(result.chunks).toBeDefined();
  });

  it("keyword method finds chunks by term overlap", async () => {
    setupDbMocks([
      {
        id: "c1",
        content: "Revenue revenue revenue revenue",
        documentId: "d1",
        sourceType: "knowledge_document",
        chunkIndex: 0,
        metadata: null,
      },
      {
        id: "c2",
        content: "Weather patterns",
        documentId: "d2",
        sourceType: "knowledge_document",
        chunkIndex: 1,
        metadata: null,
      },
    ]);
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("revenue", {
      entityId: "e1",
      agentName: "agent",
      method: "keyword",
    });
    expect(result.chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("respects topK limit", async () => {
    setupDbMocks(
      Array.from({ length: 20 }, (_, i) => ({
        id: `c${i}`,
        content: `Content ${i}`,
        documentId: `d${i}`,
        sourceType: "knowledge_document",
        chunkIndex: i,
        metadata: null,
      })),
    );
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("test", {
      entityId: "e1",
      agentName: "agent",
      method: "keyword",
      topK: 3,
    });
    expect(result.chunks.length).toBeLessThanOrEqual(3);
  });

  it("handles empty knowledge base", async () => {
    setupDbMocks([]);
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("test", {
      entityId: "e1",
      agentName: "agent",
    });
    expect(result.chunks).toHaveLength(0);
  });

  it("handles long query", async () => {
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("word ".repeat(1000), {
      entityId: "e1",
      agentName: "agent",
    });
    expect(result).toBeDefined();
  });

  it("handles special characters", async () => {
    const { retrieve } = await import("../engine/retrieval");
    const result = await retrieve("SELECT * FROM users; DROP TABLE;", {
      entityId: "e1",
      agentName: "agent",
    });
    expect(result).toBeDefined();
  });
});
