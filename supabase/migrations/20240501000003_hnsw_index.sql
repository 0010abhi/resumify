-- HNSW index for fast cosine similarity search on embeddings
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON public.embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Generic RPC used by interview-questions and career-plan Edge Functions
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(768),
  source_type_filter TEXT,
  source_id_filter UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_text TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    chunk_text,
    chunk_index,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.embeddings
  WHERE source_type = source_type_filter AND source_id = source_id_filter
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Resume-specific alias kept for backwards compat
CREATE OR REPLACE FUNCTION match_resume_chunks(
  query_embedding vector(768),
  resume_id_filter UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_text TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    chunk_text,
    chunk_index,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.embeddings
  WHERE source_type = 'resume' AND source_id = resume_id_filter
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
