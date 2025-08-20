-- Migration: Test Auto-Fix System
-- Version: 9.0
-- Description: Test migration for auto-fix system validation
-- Date: 2025-01-27

-- This migration creates a test index on the correct column:

-- 1. Create a test index on the correct next_attempt column
CREATE INDEX IF NOT EXISTS idx_email_outbox_next_attempt_test 
ON email_outbox (next_attempt);

-- 2. Add a test column for additional functionality
ALTER TABLE IF EXISTS public.email_outbox
  ADD COLUMN IF NOT EXISTS test_metadata JSONB DEFAULT '{}'::jsonb;
