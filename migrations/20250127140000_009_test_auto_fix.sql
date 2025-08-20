-- Migration: Test Auto-Fix System
-- Version: 9.0
-- Description: Intentionally create a migration with errors to test auto-fix
-- Date: 2025-01-27

-- This migration intentionally has errors that should be caught by auto-fix:

-- 1. Try to create an index on a non-existent column (should be detected and fixed)
CREATE INDEX IF NOT EXISTS idx_email_outbox_next_attempt_test 
ON email_outbox (next_attempt_wrong_name);

-- 2. Try to add a column that should exist but with wrong name
ALTER TABLE IF EXISTS public.email_outbox
  ADD COLUMN IF NOT EXISTS next_retry TIMESTAMPTZ;

-- This should be corrected to:
-- CREATE INDEX IF NOT EXISTS idx_email_outbox_next_attempt 
-- ON email_outbox (next_attempt);
-- 
-- ALTER TABLE IF EXISTS public.email_outbox
--   ADD COLUMN IF NOT EXISTS next_attempt TIMESTAMPTZ;
