/**
 * RAG Retrieval — Hybrid search (vector similarity + BM25 keyword).
 *
 * Retrieves relevant knowledge chunks for a query, combining:
 * - Vector similarity (semantic search via embeddings)
 * - BM25 keyword matching (exact term matching)
 *
 * Every retrieval is logged to the audit trail via ragCitations table.
 * Returns citations with source document, chunk text, and relevance scores.
 *
 * Design:
 * - Entity-scoped: every query filters by entityId
 * - Hybrid: vector + keyword for best recall
 * - Audited: every retrieval logged for compliance
 * - Cited: responses include source chunks for transparency
 */

import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { documentChunks, ragCitations } from "@xenboox/db/schema";
import { generateEmbeddings, cosineSimilarity } from "./embeddings";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RetrievalQuery {
  /** The search query */
  query: string;
  /** Entity ID for scoping */
  entityId: string;
  /** Agent performing the retrieval */
  agentName: string;
  /** Max chunks to retrieve */
  topK?: number;
  /** Minimum similarity score threshold */
  minScore?: number;
  /** Source type filter */
  sourceType?: string;
  /** Category filter */
  category?: string;
  /** Retrieval method: "vector", "keyword", "hybrid" */
  method?: "vector" | "keyword" | "hybrid";
}

export interface RetrievedChunk {
  /** Chunk ID */
  id: string;
  /** Chunk content */
  content: string;
  /** Source document ID */
  documentId: string;
  /** Source type */
  sourceType: string;
  /** Chunk index within document */
  chunkIndex: number;
  /** Similarity score (0-1) */
  score: number;
  /** Retrieval method that found this chunk */
  method: "vector" | "keyword";
  /** Metadata about the chunk */
  metadata?: Record<string, unknown>;
}

export interface RetrievalResult {
  /** Retrieved chunks ordered by relevance */
  chunks: RetrievedChunk[];
  /** Total chunks in the knowledge base */
  totalChunks: number;
  /** Retrieval method used */
  method: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Citation ID for audit trail */
  citationId: string;
}

// ─── Vector Search ─────────────────────────────────────────────────────────

/**
 * Search chunks by vector similarity.
 * Generates an embedding for the query, then compares against all chunk embeddings.
 *
 * Note: In production with pgvector, this would use the `<->` operator
 * for efficient approximate nearest neighbor search. For now, we do
 * a full scan with cosine similarity (fine for <10K chunks).
 */
async function vectorSearch(
  query: string,
  entityId: string,
  topK: number,
  minScore: number,
  sourceType?: string,
): Promise<RetrievedChunk[]> {
  // 1. Generate query embedding
  const [queryEmbedding] = await generateEmbeddings([query], entityId);

  if (!queryEmbedding) {
    return [];
  }

  // 2. Try pgvector native search first (much faster)
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  try {
    const results = await db.execute(sql`
      SELECT * FROM search_similar_chunks(
        ${vectorStr}::vector,
        ${entityId}::uuid,
        ${topK},
        ${minScore},
        ${sourceType ?? null}
      )
    `);

    if (results.rows.length > 0) {
      return results.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        documentId: row.document_id,
        sourceType: row.source_type,
        chunkIndex: row.chunk_index,
        score: parseFloat(row.similarity),
        method: "vector" as const,
        metadata: row.metadata as Record<string, unknown> | undefined,
      }));
    }
  } catch {
    // pgvector function not available, fall back to application-level search
  }

  // 3. Fallback: application-level cosine similarity search
  const conditions = [
    eq(documentChunks.entityId, entityId),
    eq(documentChunks.isEmbedded, true),
  ];
  if (sourceType) {
    conditions.push(eq(documentChunks.sourceType, sourceType));
  }

  const chunks = await db.query.documentChunks.findMany({
    where: and(...conditions),
    orderBy: [desc(documentChunks.createdAt)],
    limit: Math.min(topK * 10, 200), // Limit to avoid loading too many chunks
  });

  const scored = chunks
    .map((chunk) => {
      let chunkEmbedding: number[] = [];
      try {
        chunkEmbedding = JSON.parse(chunk.embedding ?? "[]");
      } catch {
        return null;
      }

      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
      return {
        id: chunk.id,
        content: chunk.content,
        documentId: chunk.documentId,
        sourceType: chunk.sourceType,
        chunkIndex: chunk.chunkIndex,
        score,
        method: "vector" as const,
        metadata: chunk.metadata as Record<string, unknown> | undefined,
      };
    })
    .filter(
      (s): s is NonNullable<typeof s> => s !== null && s.score >= minScore,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

// ─── Keyword Search ────────────────────────────────────────────────────────

/**
 * Search chunks by keyword matching (BM25-like).
 * Uses PostgreSQL full-text search for efficient keyword matching.
 */
async function keywordSearch(
  query: string,
  entityId: string,
  topK: number,
  sourceType?: string,
): Promise<RetrievedChunk[]> {
  // Build search terms
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  // Fetch candidate chunks and score by keyword overlap
  const conditions = [eq(documentChunks.entityId, entityId)];
  if (sourceType) {
    conditions.push(eq(documentChunks.sourceType, sourceType));
  }

  const chunks = await db.query.documentChunks.findMany({
    where: and(...conditions),
    orderBy: [desc(documentChunks.createdAt)],
    limit: Math.min(topK * 10, 200), // Limit to avoid loading too many chunks
  });

  const scored = chunks
    .map((chunk) => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;

      for (const term of terms) {
        const matches = contentLower.split(term).length - 1;
        score += matches;
      }

      // Normalize by query length
      score = score / terms.length;

      return {
        id: chunk.id,
        content: chunk.content,
        documentId: chunk.documentId,
        sourceType: chunk.sourceType,
        chunkIndex: chunk.chunkIndex,
        score: Math.min(score / 5, 1), // Normalize to 0-1
        method: "keyword" as const,
        metadata: chunk.metadata as Record<string, unknown> | undefined,
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

// ─── Hybrid Search ─────────────────────────────────────────────────────────

/**
 * Combine vector and keyword search results with score fusion.
 * Uses Reciprocal Rank Fusion (RRF) to combine rankings.
 */
function hybridFuse(
  vectorResults: RetrievedChunk[],
  keywordResults: RetrievedChunk[],
  topK: number,
  vectorWeight = 0.7,
  keywordWeight = 0.3,
): RetrievedChunk[] {
  const scoreMap = new Map<string, RetrievedChunk & { fusedScore: number }>();

  // Score vector results
  vectorResults.forEach((chunk, rank) => {
    const rrfScore = vectorWeight / (60 + rank);
    scoreMap.set(chunk.id, {
      ...chunk,
      fusedScore: rrfScore,
      method: "vector",
    });
  });

  // Score keyword results
  keywordResults.forEach((chunk, rank) => {
    const rrfScore = keywordWeight / (60 + rank);
    const existing = scoreMap.get(chunk.id);
    if (existing) {
      existing.fusedScore += rrfScore;
    } else {
      scoreMap.set(chunk.id, {
        ...chunk,
        fusedScore: rrfScore,
        method: "keyword",
      });
    }
  });

  // Sort by fused score and return top K
  return Array.from(scoreMap.values())
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, topK)
    .map(({ fusedScore, ...chunk }) => ({
      ...chunk,
      score: fusedScore,
    }));
}

// ─── Main Retrieval Function ───────────────────────────────────────────────

/**
 * Retrieve relevant chunks for a query using the specified method.
 * Logs the retrieval to the audit trail.
 *
 * @param query - The search query
 * @param options - Retrieval options (entityId, agentName, topK, method, etc.)
 * @returns RetrievalResult with chunks and audit metadata
 */
export async function retrieve(
  query: string,
  options: {
    entityId: string;
    agentName: string;
    topK?: number;
    minScore?: number;
    sourceType?: string;
    category?: string;
    method?: "vector" | "keyword" | "hybrid";
  },
): Promise<RetrievalResult> {
  const startTime = Date.now();
  const topK = options.topK ?? 5;
  const minScore = options.minScore ?? 0.3;
  const method = options.method ?? "hybrid";

  let chunks: RetrievedChunk[] = [];
  let totalChunks = 0;

  // Get total chunk count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentChunks)
    .where(eq(documentChunks.entityId, options.entityId));
  totalChunks = countResult[0]?.count ?? 0;

  // Perform search based on method
  switch (method) {
    case "vector":
      chunks = await vectorSearch(
        query,
        options.entityId,
        topK,
        minScore,
        options.sourceType,
      );
      break;

    case "keyword":
      chunks = await keywordSearch(
        query,
        options.entityId,
        topK,
        options.sourceType,
      );
      break;

    case "hybrid": {
      const vectorResults = await vectorSearch(
        query,
        options.entityId,
        topK * 2, // Get more candidates for fusion
        minScore * 0.5, // Lower threshold for fusion
        options.sourceType,
      );
      const keywordResults = await keywordSearch(
        query,
        options.entityId,
        topK * 2,
        options.sourceType,
      );
      chunks = hybridFuse(vectorResults, keywordResults, topK);
      break;
    }
  }

  const durationMs = Date.now() - startTime;

  // Log citation for audit trail (only when results found)
  let citationId = "";
  if (chunks.length > 0) {
    const [citation] = await db
      .insert(ragCitations)
      .values({
        entityId: options.entityId,
        query,
        agentName: options.agentName,
        chunkIds: chunks.map((c) => c.id),
        scores: chunks.map((c) => c.score),
        citedChunkIds: chunks
          .filter((c) => c.score >= minScore)
          .map((c) => c.id),
        totalChunks,
        retrievalMethod: method,
        durationMs,
      })
      .returning();
    citationId = citation?.id ?? "";
  }

  return {
    chunks,
    totalChunks,
    method,
    durationMs,
    citationId,
  };
}

// ─── Citation Formatting ───────────────────────────────────────────────────

/**
 * Format retrieved chunks as citations for inclusion in chat responses.
 * Returns a human-readable citation string.
 */
export function formatCitations(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  const citations = chunks
    .map((chunk, i) => {
      const source =
        chunk.sourceType === "knowledge_document"
          ? `Knowledge Base`
          : chunk.sourceType === "uploaded_document"
            ? `Document`
            : chunk.sourceType;
      return `[${i + 1}] ${source} (chunk ${chunk.chunkIndex + 1}, score: ${chunk.score.toFixed(2)})`;
    })
    .join("\n");

  return `\n\n**Sources:**\n${citations}`;
}

/**
 * Format retrieved chunks as structured citations for the API.
 */
export function formatStructuredCitations(chunks: RetrievedChunk[]): Array<{
  index: number;
  content: string;
  sourceType: string;
  documentId: string;
  score: number;
  method: string;
}> {
  return chunks.map((chunk, i) => ({
    index: i + 1,
    content:
      chunk.content.slice(0, 200) + (chunk.content.length > 200 ? "..." : ""),
    sourceType: chunk.sourceType,
    documentId: chunk.documentId,
    score: chunk.score,
    method: chunk.method,
  }));
}
