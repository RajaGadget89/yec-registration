-- Migration: Repair Missing Email Outbox Columns
-- Version: 12.0
-- Description: Forward-only repair migration to ensure email_outbox.attempts and max_attempts columns exist
-- Date: 2025-01-27

-- Forward-only repair migration for missing email_outbox columns
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
  -- Ensure email_outbox table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_outbox'
  ) THEN
    RAISE NOTICE 'email_outbox table exists, checking for missing columns...';
    
    -- Add attempts column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name = 'attempts'
    ) THEN
      ALTER TABLE public.email_outbox
        ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
      RAISE NOTICE 'Added attempts column to email_outbox table';
    ELSE
      RAISE NOTICE 'attempts column already exists in email_outbox table';
    END IF;

    -- Add max_attempts column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name = 'max_attempts'
    ) THEN
      ALTER TABLE public.email_outbox
        ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5;
      RAISE NOTICE 'Added max_attempts column to email_outbox table';
    ELSE
      RAISE NOTICE 'max_attempts column already exists in email_outbox table';
    END IF;

    -- Verify all required email_outbox columns exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name = 'attempts'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name = 'max_attempts'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name = 'next_attempt'
    ) THEN
      RAISE NOTICE 'All required email_outbox columns now exist: attempts, max_attempts, next_attempt';
    ELSE
      RAISE WARNING 'Some required email_outbox columns are still missing';
    END IF;

  ELSE
    RAISE NOTICE 'email_outbox table does not exist, skipping repair';
  END IF;
END $$;

-- Add a helpful comment for future reference
COMMENT ON TABLE public.email_outbox IS 'Email outbox table for reliable email delivery with retry logic. Repaired missing columns in migration 012.';
