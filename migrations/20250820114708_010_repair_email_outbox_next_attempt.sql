-- Migration: Repair Email Outbox Next Attempt
-- Version: 10.0
-- Description: Forward-only repair migration to ensure email_outbox.next_attempt column exists and correct index is created
-- Date: 2025-08-20

-- Forward-only repair migration for email_outbox.next_attempt column and index
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
  -- Ensure email_outbox table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_outbox'
  ) THEN
    -- Add next_attempt column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name = 'next_attempt'
    ) THEN
      ALTER TABLE public.email_outbox
        ADD COLUMN next_attempt timestamptz NULL;
      RAISE NOTICE 'Added next_attempt column to email_outbox table';
    ELSE
      RAISE NOTICE 'next_attempt column already exists in email_outbox table';
    END IF;

    -- Check if an index named idx_email_outbox_next_attempt exists but points to wrong column
    IF EXISTS (
      SELECT 1
      FROM pg_class i
      JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE i.relkind = 'i'
        AND i.relname = 'idx_email_outbox_next_attempt'
        AND n.nspname = 'public'
    ) THEN
      -- Check if the index points to the wrong column (next_attempt_at instead of next_attempt)
      IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_email_outbox_next_attempt'
          AND indexdef ILIKE '%(next_attempt_at)%'
      ) THEN
        DROP INDEX IF EXISTS public.idx_email_outbox_next_attempt;
        RAISE NOTICE 'Dropped incorrect index idx_email_outbox_next_attempt that pointed to next_attempt_at';
      END IF;
    END IF;

    -- Create the correct index on next_attempt column
    CREATE INDEX IF NOT EXISTS idx_email_outbox_next_attempt ON public.email_outbox (next_attempt);
    RAISE NOTICE 'Created/verified correct index idx_email_outbox_next_attempt on next_attempt column';
  ELSE
    RAISE NOTICE 'email_outbox table does not exist, skipping repair';
  END IF;
END $$;
