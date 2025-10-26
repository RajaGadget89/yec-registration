-- Create embedding_jobs table for manual embedding triggers
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  item_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_type ON embedding_jobs(type);
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_created_at ON embedding_jobs(created_at);
 
