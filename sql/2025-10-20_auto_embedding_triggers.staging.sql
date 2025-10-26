-- Auto-embedding triggers for CMS content changes
-- These triggers will automatically generate embeddings when content is created/updated

-- Function to trigger embedding generation
CREATE OR REPLACE FUNCTION trigger_embedding_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a job record to be processed by background worker
  INSERT INTO embedding_jobs (
    type, 
    item_id, 
    action, 
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'delete'
      WHEN TG_OP = 'UPDATE' THEN 'update' 
      ELSE 'create'
    END,
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create embedding jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  item_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' -- 'pending', 'processing', 'completed', 'failed'
);

-- Create indexes for the jobs table
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_type ON embedding_jobs(type);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_news_embedding ON cms_news;
DROP TRIGGER IF EXISTS trigger_activities_embedding ON cms_activity_cards;
DROP TRIGGER IF EXISTS trigger_pages_embedding ON cms_pages;
DROP TRIGGER IF EXISTS trigger_faq_embedding ON cms_faq_items;

-- Create triggers for each content type
CREATE TRIGGER trigger_news_embedding
  AFTER INSERT OR UPDATE OR DELETE ON cms_news
  FOR EACH ROW EXECUTE FUNCTION trigger_embedding_generation();

CREATE TRIGGER trigger_activities_embedding
  AFTER INSERT OR UPDATE OR DELETE ON cms_activity_cards
  FOR EACH ROW EXECUTE FUNCTION trigger_embedding_generation();

CREATE TRIGGER trigger_pages_embedding
  AFTER INSERT OR UPDATE OR DELETE ON cms_pages
  FOR EACH ROW EXECUTE FUNCTION trigger_embedding_generation();

CREATE TRIGGER trigger_faq_embedding
  AFTER INSERT OR UPDATE OR DELETE ON cms_faq_items
  FOR EACH ROW EXECUTE FUNCTION trigger_embedding_generation();

