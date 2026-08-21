/**
 * Knowledge RAG Router — Vector search and document management.
 *
 * Provides tRPC procedures for:
 * - Semantic search across knowledge base
 * - Document chunking and embedding
 * - Citation retrieval for audit trail
 * - Knowledge base statistics
 *
 * All procedures are entity-scoped and authenticated.
 */

import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc, sql, like } from "drizzle-orm";
import {
  documentChunks,
  knowledgeEmbeddings,
  ragCitations,
} from "@xenboox/db/schema";
import {
  retrieve,
  formatStructuredCitations,
  type RetrievedChunk,
} from "@xenboox/ingestion/engine/retrieval";
import {
  processDocumentForRAG,
  chunkText,
  getEmbeddingConfig,
} from "@xenboox/ingestion/engine/embeddings";

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const searchInputSchema = z.object({
  query: z.string().min(1).max(500),
  topK: z.number().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.3),
  sourceType: z
    .enum(["knowledge_document", "uploaded_document", "journal_entry"])
    .optional(),
  category: z.string().optional(),
  method: z.enum(["vector", "keyword", "hybrid"]).default("hybrid"),
});

const processDocumentInputSchema = z.object({
  documentId: z.string().uuid(),
  text: z.string().min(1),
  title: z.string().optional(),
  category: z.string().optional(),
  sourceType: z
    .enum(["knowledge_document", "uploaded_document", "journal_entry"])
    .default("knowledge_document"),
});

const chunksInputSchema = z.object({
  documentId: z.string().uuid(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const knowledgeRagRouter = router({
  /**
   * Semantic search across the knowledge base.
   * Uses hybrid search (vector + keyword) with Reciprocal Rank Fusion.
   * Returns relevant chunks with citations for audit trail.
   */
  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { query, topK, minScore, sourceType, category, method } = input;

      const result = await retrieve(query, {
        entityId,
        agentName: "dashboard-user",
        topK,
        minScore,
        sourceType,
        category,
        method,
      });

      return {
        chunks: result.chunks.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          documentId: chunk.documentId,
          sourceType: chunk.sourceType,
          chunkIndex: chunk.chunkIndex,
          score: chunk.score,
          method: chunk.method,
          metadata: chunk.metadata,
        })),
        totalChunks: result.totalChunks,
        method: result.method,
        durationMs: result.durationMs,
        citationId: result.citationId,
      };
    }),

  /**
   * Process a document for RAG: chunk text and generate embeddings.
   * Stores chunks in document_chunks table with vector embeddings.
   */
  processDocument: protectedProcedure
    .input(processDocumentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { documentId, text, title, category, sourceType } = input;

      const result = await processDocumentForRAG(documentId, entityId, text, {
        sourceType,
        title,
        category,
      });

      return {
        success: true,
        chunksCreated: result.chunksCreated,
        embeddingsGenerated: result.embeddingsGenerated,
      };
    }),

  /**
   * Get chunks for a specific document.
   * Used for document preview and editing in the knowledge base UI.
   */
  getDocumentChunks: protectedProcedure
    .input(chunksInputSchema)
    .query(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { documentId, page, limit } = input;

      const offset = (page - 1) * limit;

      const chunks = await db.query.documentChunks.findMany({
        where: and(
          eq(documentChunks.entityId, entityId),
          eq(documentChunks.documentId, documentId),
        ),
        orderBy: [desc(documentChunks.chunkIndex)],
        limit,
        offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documentChunks)
        .where(
          and(
            eq(documentChunks.entityId, entityId),
            eq(documentChunks.documentId, documentId),
          ),
        );

      return {
        chunks: chunks.map((chunk) => ({
          id: chunk.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          isEmbedded: chunk.isEmbedded,
          metadata: chunk.metadata,
        })),
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      };
    }),

  /**
   * Get knowledge base statistics for a specific entity.
   * Shows document count, chunk count, embedding model, and last updated.
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { entityId } = ctx;

    // Total documents
    const docCount = await db
      .select({ count: sql<number>`count(distinct document_id)::int` })
      .from(documentChunks)
      .where(eq(documentChunks.entityId, entityId));

    // Total chunks
    const chunkCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentChunks)
      .where(eq(documentChunks.entityId, entityId));

    // Embedded chunks
    const embeddedCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentChunks)
      .where(
        and(
          eq(documentChunks.entityId, entityId),
          eq(documentChunks.isEmbedded, true),
        ),
      );

    // Total tokens
    const tokenCount = await db
      .select({
        total: sql<number>`coalesce(sum(token_count), 0)::int`,
      })
      .from(documentChunks)
      .where(eq(documentChunks.entityId, entityId));

    // Recent citations
    const recentCitations = await db.query.ragCitations.findMany({
      where: eq(ragCitations.entityId, entityId),
      orderBy: [desc(ragCitations.createdAt)],
      limit: 10,
    });

    return {
      documentCount: docCount[0]?.count ?? 0,
      chunkCount: chunkCount[0]?.count ?? 0,
      embeddedCount: embeddedCount[0]?.count ?? 0,
      totalTokens: tokenCount[0]?.total ?? 0,
      embeddingModel: getEmbeddingConfig().model,
      recentCitations: recentCitations.map((citation) => ({
        id: citation.id,
        query: citation.query,
        agentName: citation.agentName,
        chunkCount: citation.chunkIds?.length ?? 0,
        method: citation.retrievalMethod,
        durationMs: citation.durationMs,
        createdAt: citation.createdAt,
      })),
    };
  }),

  /**
   * Delete a document and all its chunks from the knowledge base.
   */
  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { entityId } = ctx;
      const { documentId } = input;

      // Delete chunks
      await db
        .delete(documentChunks)
        .where(
          and(
            eq(documentChunks.entityId, entityId),
            eq(documentChunks.documentId, documentId),
          ),
        );

      // Delete embedding record
      await db
        .delete(knowledgeEmbeddings)
        .where(
          and(
            eq(knowledgeEmbeddings.entityId, entityId),
            eq(knowledgeEmbeddings.documentId, documentId),
          ),
        );

      return { success: true };
    }),

  /**
   * Preview chunks that would be generated from text.
   * Useful for testing chunking before processing a document.
   */
  previewChunks: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(100_000) }))
    .query(({ input }) => {
      const { text } = input;
      const chunks = chunkText(text);

      return {
        chunks: chunks.map((chunk) => ({
          index: chunk.index,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          preview:
            chunk.content.length > 100
              ? chunk.content.slice(0, 100) + "..."
              : chunk.content,
        })),
        totalChunks: chunks.length,
        totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      };
    }),
});
