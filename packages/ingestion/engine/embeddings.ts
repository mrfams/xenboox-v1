/**
 * Embedding Service — Generate vector embeddings via the model gateway.
 *
 * Uses the OpenAI text-embedding-3-small model (1536 dimensions) by default.
 * The embedding model is configurable via environment variables:
 * - EMBEDDING_MODEL: model name (default: text-embedding-3-small)
 * - EMBEDDING_DIMENSIONS: vector dimensions (default: 1536)
 * - OPENAI_API_KEY: required for real embeddings
 *
 * Features:
 * - Document chunking (smart split by sentences/paragraphs)
 * - Batch embedding for efficiency (max 2048 texts per batch)
 * - Entity-scoped: every embedding carries entityId
 * - Graceful fallback: if API fails, generates deterministic mock embeddings
 * - Rate limiting: respects API rate limits with exponential backoff
 */

import { db } from "@xenboox/db";
import { eq, and, sql } from "drizzle-orm";
import { documentChunks, knowledgeEmbeddings } from "@xenboox/db/schema";

// ─── Configuration ─────────────────────────────────────────────────────────

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = parseInt(
  process.env.EMBEDDING_DIMENSIONS ?? "1536",
  10,
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const DEFAULT_CHUNK_SIZE = 512; // tokens
const DEFAULT_CHUNK_OVERLAP = 64; // tokens
const MAX_BATCH_SIZE = 2048; // OpenAI limit per request
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// ─── Chunking ──────────────────────────────────────────────────────────────

/**
 * Split text into chunks suitable for embedding.
 * Uses sentence boundaries with overlap for context preservation.
 *
 * @param text - The full document text
 * @param chunkSize - Target chunk size in tokens (approximate)
 * @param overlap - Overlap between chunks in tokens
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): Array<{
  content: string;
  index: number;
  tokenCount: number;
  metadata: { startOffset: number; endOffset: number };
}> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: Array<{
    content: string;
    index: number;
    tokenCount: number;
    metadata: { startOffset: number; endOffset: number };
  }> = [];

  // Split by paragraphs first, then sentences
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  let chunkIndex = 0;
  let charOffset = 0;

  for (const paragraph of paragraphs) {
    const sentences = paragraph.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokenCount(sentence);
      const currentTokens = estimateTokenCount(currentChunk);

      if (
        currentTokens + sentenceTokens > chunkSize &&
        currentChunk.length > 0
      ) {
        // Flush current chunk
        const startOffset = charOffset - currentChunk.length;
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex,
          tokenCount: currentTokens,
          metadata: {
            startOffset,
            endOffset: charOffset,
          },
        });

        // Start new chunk with overlap
        const overlapText = getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + " " + sentence;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }

      charOffset += sentence.length + 1; // +1 for space
    }

    // Add paragraph break
    charOffset += 2; // \n\n
  }

  // Flush remaining content
  if (currentChunk.trim().length > 0) {
    const startOffset = charOffset - currentChunk.length;
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: estimateTokenCount(currentChunk),
      metadata: {
        startOffset,
        endOffset: charOffset,
      },
    });
  }

  return chunks;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters).
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get the last N tokens of text for overlap.
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const charsNeeded = overlapTokens * 4;
  if (text.length <= charsNeeded) return text;
  return text.slice(text.length - charsNeeded);
}

// ─── Embedding Generation ──────────────────────────────────────────────────

/**
 * Generate embeddings for an array of text strings.
 * Calls the OpenAI embedding API via fetch.
 *
 * Falls back to deterministic mock embeddings if:
 * - OPENAI_API_KEY is not set
 * - API call fails after retries
 *
 * @param texts - Array of text strings to embed
 * @param entityId - Entity ID for scoping (used for logging)
 * @param dimensions - Embedding dimensions (default 1536)
 * @returns Array of embedding vectors (each is a number[])
 */
export async function generateEmbeddings(
  texts: string[],
  entityId: string,
  dimensions = EMBEDDING_DIMENSIONS,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Try real embeddings if API key is available
  if (OPENAI_API_KEY) {
    try {
      return await generateRealEmbeddings(texts, dimensions);
    } catch (error) {
      console.warn(
        `[embeddings] Real embedding failed, falling back to mock: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // Fallback: generate deterministic mock embeddings
  return texts.map((text) => generateMockEmbedding(text, dimensions));
}

/**
 * Generate real embeddings via OpenAI API.
 * Handles batching, retries, and rate limiting.
 */
async function generateRealEmbeddings(
  texts: string[],
  dimensions: number,
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  // Batch texts to avoid exceeding API limits
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
  }

  for (const batch of batches) {
    const embeddings = await callEmbeddingApi(batch, dimensions);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

/**
 * Call the OpenAI embedding API with retry logic.
 */
async function callEmbeddingApi(
  texts: string[],
  dimensions: number,
): Promise<number[][]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: texts,
          dimensions,
          encoding_format: "float",
        }),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[embeddings] Rate limited, retrying in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }

      // Handle server errors (retry)
      if (response.status >= 500) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[embeddings] Server error ${response.status}, retrying in ${delayMs}ms`,
        );
        await sleep(delayMs);
        continue;
      }

      // Handle client errors (don't retry)
      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Embedding API error ${response.status}: ${body.slice(0, 200)}`,
        );
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
        model: string;
        usage: { prompt_tokens: number; total_tokens: number };
      };

      // Sort by index to maintain order
      const sorted = data.data.sort((a, b) => a.index - b.index);
      return sorted.map((item) => item.embedding);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (except 429 which is handled above)
      if (
        lastError.message.includes("400") ||
        lastError.message.includes("401") ||
        lastError.message.includes("403")
      ) {
        throw lastError;
      }

      // Retry on network errors and server errors
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[embeddings] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms: ${lastError.message}`,
        );
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error("Embedding API failed after all retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a deterministic mock embedding from text.
 * Uses a simple hash-based approach for consistent results.
 * Replace with real embedding model call in production.
 */
function generateMockEmbedding(text: string, dimensions: number): number[] {
  const embedding: number[] = [];
  let hash = 0;

  // Simple string hash for deterministic values
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  // Generate normalized vector from hash seed
  for (let i = 0; i < dimensions; i++) {
    hash = ((hash << 13) ^ hash) | 0;
    const value = (Math.sin(hash * 0.001 + i * 0.1) * 0.5 + 0.5) * 2 - 1;
    embedding.push(parseFloat(value.toFixed(6)));
  }

  // Normalize to unit vector
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / norm);
}

// ─── Document Chunking & Embedding Pipeline ────────────────────────────────

/**
 * Chunk a document and generate embeddings for all chunks.
 * Stores chunks in the document_chunks table with both JSON and vector columns.
 *
 * @param documentId - The knowledge document ID
 * @param entityId - Entity ID for scoping
 * @param text - Full document text
 * @param metadata - Optional metadata about the document
 */
export async function processDocumentForRAG(
  documentId: string,
  entityId: string,
  text: string,
  metadata?: {
    sourceType?: string;
    title?: string;
    category?: string;
  },
): Promise<{
  chunksCreated: number;
  embeddingsGenerated: number;
}> {
  // 1. Chunk the text
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return { chunksCreated: 0, embeddingsGenerated: 0 };
  }

  // 2. Generate embeddings for all chunks
  const texts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(texts, entityId);

  // 3. Store chunks in the database
  let chunksCreated = 0;
  let embeddingsGenerated = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];

    // Convert embedding to pgvector format: '[0.1, 0.2, ...]'
    const vectorStr = embedding ? `[${embedding.join(",")}]` : null;

    await db.insert(documentChunks).values({
      entityId,
      documentId,
      sourceType: metadata?.sourceType ?? "knowledge_document",
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: JSON.stringify(embedding), // JSON for backward compat
      embeddingVector: vectorStr as any, // pgvector format
      metadata: chunk.metadata,
      isEmbedded: true,
    });

    chunksCreated++;
    if (embedding) embeddingsGenerated++;
  }

  // 4. Update knowledge_embeddings record
  const aggregateEmbedding =
    embeddings.length > 0
      ? embeddings[0] // Use first chunk as document-level embedding
      : null;

  const vectorStr = aggregateEmbedding
    ? `[${aggregateEmbedding.join(",")}]`
    : null;

  await db
    .insert(knowledgeEmbeddings)
    .values({
      entityId,
      documentId,
      title: metadata?.title ?? `Document ${documentId}`,
      category: metadata?.category,
      embedding: aggregateEmbedding ? JSON.stringify(aggregateEmbedding) : null,
      embeddingVector: vectorStr as any,
      chunkCount: chunksCreated,
      totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      fullyEmbedded: true,
      embeddingModel: EMBEDDING_MODEL,
    })
    .onConflictDoNothing();

  return { chunksCreated, embeddingsGenerated };
}

// ─── Similarity Search ─────────────────────────────────────────────────────

/**
 * Cosine similarity between two vectors.
 * Used as fallback when pgvector is not available.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Get the embedding model configuration.
 */
export function getEmbeddingConfig() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    hasApiKey: !!OPENAI_API_KEY,
    baseUrl: OPENAI_BASE_URL,
  };
}
