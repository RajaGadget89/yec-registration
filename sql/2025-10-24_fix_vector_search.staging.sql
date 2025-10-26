-- Fix vector search function for MCP RAG system
-- This creates a proper vector similarity search function

-- Create the search_embeddings function for vector similarity search
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(384),
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

-- Create index for better vector search performance
CREATE INDEX IF NOT EXISTS idx_cms_embeddings_vector_search 
ON cms_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index for content type and language filtering
CREATE INDEX IF NOT EXISTS idx_cms_embeddings_type_language 
ON cms_embeddings (type, language, is_active);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION search_embeddings TO anon;
