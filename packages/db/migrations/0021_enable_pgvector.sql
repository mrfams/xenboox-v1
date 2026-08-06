-- Migration: Enable pgvector extension and create vector columns
-- This migration enables the pgvector Postgres extension and converts
-- the text-based embedding columns to proper vector types for efficient
-- approximate nearest neighbor (ANN) search.

-- ─── 1. Enable pgvector extension ──────────────────────────────────────────
-- Neon Postgres supports pgvector natively. This is idempotent.
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 2. Add vector columns to document_chunks ──────────────────────────────
-- Add a proper vector column alongside the existing text column.
-- The text column is kept for backward compatibility during migration.

-- Add embedding_vector column (1536 dimensions for text-embedding-3-small)
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Migrate data from text column to vector column
UPDATE document_chunks
SET embedding_vector = embedding::vector
WHERE embedding IS NOT NULL
  AND embedding_vector IS NULL;

-- Create an index for efficient cosine similarity search
-- IVFFlat index with 100 lists (good for <1M rows)
-- For production with >1M rows, consider HNSW index instead
CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx
  ON document_chunks
  USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);

-- ─── 3. Add vector columns to knowledge_embeddings ─────────────────────────

ALTER TABLE knowledge_embeddings
  ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

UPDATE knowledge_embeddings
SET embedding_vector = embedding::vector
WHERE embedding IS NOT NULL
  AND embedding_vector IS NULL;

CREATE INDEX IF NOT EXISTS knowledge_emb_embedding_idx
  ON knowledge_embeddings
  USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);

-- ─── 4. Create a function for efficient vector search ──────────────────────
-- This function performs cosine similarity search using pgvector's
-- native operators, which is much faster than application-level comparison.

CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  entity_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.3,
  filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  document_id uuid,
  source_type text,
  chunk_index int,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.document_id,
    dc.source_type,
    dc.chunk_index,
    1 - (dc.embedding_vector <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE dc.entity_id = entity_id
    AND dc.is_embedded = true
    AND dc.embedding_vector IS NOT NULL
    AND (filter_source_type IS NULL OR dc.source_type = filter_source_type)
    AND 1 - (dc.embedding_vector <=> query_embedding) > match_threshold
  ORDER BY dc.embedding_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── 5. Create a function for batch embedding updates ──────────────────────
-- Efficiently update embeddings in batches to avoid long transactions.

CREATE OR REPLACE FUNCTION update_chunk_embedding(
  chunk_id uuid,
  new_embedding vector(1536)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE document_chunks
  SET embedding_vector = new_embedding,
      is_embedded = true,
      updated_at = NOW()
  WHERE id = chunk_id;
END;
$$;

-- ─── 6. Add comment for documentation ──────────────────────────────────────

COMMENT ON EXTENSION vector IS 'pgvector — open-source vector similarity search for Postgres';
COMMENT ON COLUMN document_chunks.embedding_vector IS 'pgvector vector(1536) for text-embedding-3-small similarity search';
COMMENT ON COLUMN knowledge_embeddings.embedding_vector IS 'pgvector vector(1536) for document-level similarity search';
COMMENT ON FUNCTION search_similar_chunks IS 'Efficient cosine similarity search using pgvector native operators';
COMMENT ON FUNCTION update_chunk_embedding IS 'Update a single chunk embedding vector';
