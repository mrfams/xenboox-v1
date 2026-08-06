/**
 * Knowledge RAG — pgvector schema for the company brain.
 *
 * Extends the existing ops-company-brain tables with vector embeddings
 * for semantic search. Uses Neon's pgvector extension (Postgres-native,
 * entity-scoped, no external infra).
 *
 * Tables:
 * - document_chunks: chunked text with vector embeddings for similarity search
 * - knowledge_embeddings: document-level embeddings for quick lookup
 *
 * Design:
 * - Entity-scoped: every query filters by entityId
 * - pgvector: vector(1536) for OpenAI text-embedding-3-small (configurable)
 * - Hybrid retrieval: vector similarity + BM25 keyword search
 * - Citation: every retrieval returns source document + chunk for audit
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── Document Chunks (for RAG retrieval) ───────────────────────────────────

/**
 * Chunked text from knowledge documents, with vector embeddings
 * for semantic similarity search. Each chunk is a segment of a
 * document (typically 512-1024 tokens) with its embedding vector.
 */
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),

    /** Reference to the source document */
    documentId: uuid("document_id").notNull(),

    /** Source type: "knowledge_document", "uploaded_document", "journal_entry" */
    sourceType: text("source_type").notNull().default("knowledge_document"),

    /** Chunk index within the document (0-based) */
    chunkIndex: integer("chunk_index").notNull().default(0),

    /** The text content of this chunk */
    content: text("content").notNull(),

    /** Token count of this chunk (for context window management) */
    tokenCount: integer("token_count").notNull().default(0),

    /** Vector embedding (1536 dimensions for text-embedding-3-small) */
    embedding: text("embedding"), // Stored as JSON array; pgvector extension handles actual vector type

    /** Metadata about this chunk (section heading, page number, etc.) */
    metadata: jsonb("metadata").$type<{
      section?: string;
      pageNumber?: number;
      heading?: string;
      startOffset?: number;
      endOffset?: number;
    }>(),

    /** Whether this chunk has been embedded */
    isEmbedded: boolean("is_embedded").notNull().default(false),

    ...timestamps,
  },
  (t) => [
    index("doc_chunks_entity").on(t.entityId),
    index("doc_chunks_document").on(t.documentId),
    index("doc_chunks_source").on(t.entityId, t.sourceType),
    index("doc_chunks_embedded").on(t.isEmbedded),
    // Composite index for efficient retrieval
    index("doc_chunks_entity_embedded").on(t.entityId, t.isEmbedded),
  ],
);

// ─── Knowledge Embeddings (document-level) ─────────────────────────────────

/**
 * Document-level embeddings for quick lookup and deduplication.
 * One row per knowledge document, storing the document's aggregate embedding.
 */
export const knowledgeEmbeddings = pgTable(
  "knowledge_embeddings",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),

    /** Reference to the knowledge document */
    documentId: uuid("document_id").notNull(),

    /** Document title for display */
    title: text("title").notNull(),

    /** Document category for filtering */
    category: text("category"),

    /** Document-level embedding (aggregate of all chunks) */
    embedding: text("embedding"), // JSON array of floats

    /** Total chunks in this document */
    chunkCount: integer("chunk_count").notNull().default(0),

    /** Total tokens in this document */
    totalTokens: integer("total_tokens").notNull().default(0),

    /** Whether all chunks have been embedded */
    fullyEmbedded: boolean("fully_embedded").notNull().default(false),

    /** Embedding model used (for model tracking) */
    embeddingModel: text("embedding_model"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("knowledge_emb_doc").on(t.entityId, t.documentId),
    index("knowledge_emb_entity").on(t.entityId),
    index("knowledge_emb_category").on(t.entityId, t.category),
    index("knowledge_emb_embedded").on(t.fullyEmbedded),
  ],
);

// ─── RAG Citation (for audit trail) ────────────────────────────────────────

/**
 * Records every RAG retrieval for audit trail.
 * Tracks which chunks were retrieved, scored, and cited in responses.
 */
export const ragCitations = pgTable(
  "rag_citations",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),

    /** The query that triggered this retrieval */
    query: text("query").notNull(),

    /** Agent that performed the retrieval */
    agentName: text("agent_name").notNull(),

    /** Retrieved chunk IDs (ordered by relevance) */
    chunkIds: jsonb("chunk_ids").$type<string[]>().default([]),

    /** Similarity scores for each retrieved chunk */
    scores: jsonb("scores").$type<number[]>().default([]),

    /** Which chunks were actually cited in the response */
    citedChunkIds: jsonb("cited_chunk_ids").$type<string[]>().default([]),

    /** Total chunks in the knowledge base at time of query */
    totalChunks: integer("total_chunks").notNull().default(0),

    /** Retrieval method used: "vector", "keyword", "hybrid" */
    retrievalMethod: text("retrieval_method").notNull().default("hybrid"),

    /** Retrieval duration in milliseconds */
    durationMs: integer("duration_ms"),

    ...timestamps,
  },
  (t) => [
    index("rag_citations_entity").on(t.entityId),
    index("rag_citations_agent").on(t.agentName),
    index("rag_citations_query").on(t.entityId, t.agentName),
    index("rag_citations_created").on(t.entityId, t.createdAt),
  ],
);

// ─── Relations ─────────────────────────────────────────────────────────────

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  entity: one(entities, {
    fields: [documentChunks.entityId],
    references: [entities.id],
  }),
}));

export const knowledgeEmbeddingsRelations = relations(
  knowledgeEmbeddings,
  ({ one }) => ({
    entity: one(entities, {
      fields: [knowledgeEmbeddings.entityId],
      references: [entities.id],
    }),
  }),
);

export const ragCitationsRelations = relations(ragCitations, ({ one }) => ({
  entity: one(entities, {
    fields: [ragCitations.entityId],
    references: [entities.id],
  }),
}));
