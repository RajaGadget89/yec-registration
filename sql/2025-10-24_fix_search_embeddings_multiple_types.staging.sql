-- Fix search_embeddings function to handle multiple content types
-- This allows searching across multiple content types in a single call

-- Drop the existing function
DROP FUNCTION IF EXISTS search_embeddings(vector(768), text, text, float, int);

-- Create new function that handles comma-separated content types
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
  language text,
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
    ce.language,
    1 - (ce.embedding <=> query_embedding) as similarity
  FROM cms_embeddings ce
  WHERE 
    -- Handle multiple content types (comma-separated)
    CASE 
      WHEN content_type LIKE '%,%' THEN 
        ce.type = ANY(string_to_array(content_type, ','))
      ELSE 
        ce.type = content_type
    END
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

-- Test the function with multiple content types
-- This should now work: search_embeddings(embedding, 'news,activities,faq,pages', null, 0.0, 100)
