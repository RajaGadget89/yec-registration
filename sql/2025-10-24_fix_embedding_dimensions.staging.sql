-- Fix embedding dimensions for Thai-optimized model
-- Update from 384 to 768 dimensions for paraphrase-multilingual-mpnet-base-v2

-- Drop existing indexes
DROP INDEX IF EXISTS idx_cms_embeddings_embed;
DROP INDEX IF EXISTS idx_cms_embeddings_vector_search;

-- Update embedding column to 768 dimensions
ALTER TABLE cms_embeddings 
ALTER COLUMN embedding TYPE vector(768);

-- Recreate indexes for 768 dimensions
CREATE INDEX IF NOT EXISTS idx_cms_embeddings_embed 
ON cms_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_cms_embeddings_vector_search 
ON cms_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Update search_embeddings function for 768 dimensions
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(768),
  content_type text,
  language_filter text DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  item_id uuid,
  content text,
  type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.item_id,
    ce.content,
    ce.type,
    1 - (ce.embedding <=> query_embedding) as similarity
  FROM cms_embeddings ce
  WHERE 
    ce.type = content_type
    AND ce.is_active = true
    AND (language_filter IS NULL OR ce.language = language_filter)
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION search_embeddings TO anon;
