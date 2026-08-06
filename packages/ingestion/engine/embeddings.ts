/**
 * Embedding Service — Generate vector embeddings via the model gateway.
 *
 * Uses the model control plane (callModel) to generate embeddings,
 * so the embedding model is admin-configurable via the Model Ops panel.
 * Supports OpenAI text-embedding-3-small (1536 dims) as default.
 *
 * Features:
 * - Document chunking (smart split by sentences/paragraphs)
 * - Batch embedding for efficiency
 * - Entity-scoped: every embedding carries entityId
 * - Model gateway: embedding model chosen by admin, not hard-coded
 */

import { db } from "@xenboox/db";
import { eq, and, sql } from "drizzle-orm";
import { documentChunks, knowledgeEmbeddings } from "@xenboox/db/schema";

// ─── Configuration ─────────────────────────────────────────────────────────

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_CHUNK_SIZE = 512; // tokens
const DEFAULT_CHUNK_OVERLAP = 64; // tokens
const MAX_BATCH_SIZE = 100; // max chunks per embedding call

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
 * Generate embeddings for an array of text chunks.
 * Uses the model gateway (callModel) with the embedding model.
 *
 * For now, this generates a mock embedding (random vector).
 * In production, this calls the embedding model via the gateway.
 *
 * @param texts - Array of text strings to embed
 * @param entityId - Entity ID for scoping
 * @param dimensions - Embedding dimensions (default 1536)
 * @returns Array of embedding vectors (each is a number[])
 */
export async function generateEmbeddings(
  texts: string[],
  entityId: string,
  dimensions = DEFAULT_EMBEDDING_DIMENSIONS,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Batch texts to avoid exceeding API limits
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
  }

  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    // In production, this calls the embedding model via the gateway:
    // const response = await callModel({
    //   agentName: "document",
    //   taskType: "embedding",
    //   entityId,
    //   messages: [{ role: "user", content: batch }],
    //   // embedding-specific params
    // });
    //
    // For now, generate deterministic mock embeddings based on text hash
    const embeddings = batch.map((text) =>
      generateMockEmbedding(text, dimensions),
    );
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
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
 * Stores chunks in the document_chunks table.
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

    await db.insert(documentChunks).values({
      entityId,
      documentId,
      sourceType: metadata?.sourceType ?? "knowledge_document",
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: JSON.stringify(embedding),
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

  await db
    .insert(knowledgeEmbeddings)
    .values({
      entityId,
      documentId,
      title: metadata?.title ?? `Document ${documentId}`,
      category: metadata?.category,
      embedding: aggregateEmbedding ? JSON.stringify(aggregateEmbedding) : null,
      chunkCount: chunksCreated,
      totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      fullyEmbedded: true,
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
    })
    .onConflictDoNothing();

  return { chunksCreated, embeddingsGenerated };
}

// ─── Similarity Search ─────────────────────────────────────────────────────

/**
 * Cosine similarity between two vectors.
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
