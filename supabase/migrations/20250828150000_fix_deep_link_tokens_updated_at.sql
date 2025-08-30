-- Migration: Fix deep_link_tokens missing updated_at field
-- Date: 2025-08-28
-- Purpose: Add missing updated_at field to deep_link_tokens table

-- Add the missing updated_at field to deep_link_tokens table
ALTER TABLE deep_link_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_deep_link_tokens_updated_at ON deep_link_tokens;
CREATE TRIGGER update_deep_link_tokens_updated_at
    BEFORE UPDATE ON deep_link_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added updated_at field and trigger to deep_link_tokens table';
END $$;
