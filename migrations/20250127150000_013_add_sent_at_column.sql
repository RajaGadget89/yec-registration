-- Migration: Add sent_at column to email_outbox table
-- Version: 13.0
-- Description: Add missing sent_at column to email_outbox table for proper email dispatch tracking
-- Date: 2025-01-27
-- Issue: Email dispatch system failing because sent_at column is missing from staging database

-- Add sent_at column to email_outbox table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_outbox' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.email_outbox ADD COLUMN sent_at TIMESTAMPTZ;
    RAISE NOTICE 'Added sent_at column to email_outbox table';
  ELSE
    RAISE NOTICE 'sent_at column already exists in email_outbox table';
  END IF;
END $$;

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_outbox' 
    AND column_name = 'sent_at'
  ) THEN
    RAISE NOTICE 'sent_at column verification: SUCCESS';
  ELSE
    RAISE EXCEPTION 'sent_at column verification: FAILED - column was not added';
  END IF;
END $$;

-- Update the fn_mark_email_sent function to use the sent_at column
CREATE OR REPLACE FUNCTION fn_mark_email_sent(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE email_outbox 
  SET 
    status = 'sent',
    sent_at = now(),
    last_attempt_at = now(),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Update the fn_mark_email_failed function to handle sent_at properly
CREATE OR REPLACE FUNCTION fn_mark_email_failed(p_id UUID, p_error TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_record RECORD;
  next_attempt TIMESTAMPTZ;
BEGIN
  -- Get current record
  SELECT * INTO current_record FROM email_outbox WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate next attempt time with exponential backoff
  IF current_record.attempts < current_record.max_attempts THEN
    -- Exponential backoff: 1min, 2min, 4min, 8min, 16min
    next_attempt := now() + (POWER(2, current_record.attempts) || ' minutes')::interval;
    
    UPDATE email_outbox 
    SET 
      status = 'pending',
      attempts = attempts + 1,
      last_error = p_error,
      next_attempt = next_attempt,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = p_id;
  ELSE
    -- Max attempts reached, mark as failed
    UPDATE email_outbox 
    SET 
      status = 'failed',
      last_error = p_error,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = p_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add index on sent_at column for better performance
CREATE INDEX IF NOT EXISTS idx_email_outbox_sent_at 
  ON public.email_outbox (sent_at);

-- Add index on status and sent_at for common queries
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_sent_at 
  ON public.email_outbox (status, sent_at);

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250127150000_013_add_sent_at_column completed successfully';
  RAISE NOTICE 'Added sent_at column to email_outbox table';
  RAISE NOTICE 'Updated fn_mark_email_sent and fn_mark_email_failed functions';
  RAISE NOTICE 'Added performance indexes for sent_at column';
END $$;
