-- Migration: Fix Remote Schema Conflicts
-- Version: 1.1
-- Description: Removes conflicting constraints from remote schema file
-- Date: 2025-01-27

-- This migration specifically addresses conflicts in the 20250818165159_remote_schema.sql file
-- by removing the problematic primary key constraints that cause migration failures

-- CRITICAL FIX: Remove all conflicting primary key constraints from tables
-- These constraints are added by the remote schema file and conflict with our local migrations
DO $$
BEGIN
    -- Remove conflicting primary key constraints from admin_audit_logs
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_audit_logs_pkey' 
        AND conrelid = 'admin_audit_logs'::regclass
    ) THEN
        ALTER TABLE admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_pkey;
        RAISE NOTICE 'Removed conflicting primary key constraint from admin_audit_logs';
    ELSE
        RAISE NOTICE 'No conflicting primary key constraint found on admin_audit_logs';
    END IF;
    
    -- Remove conflicting primary key constraints from admin_users
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_pkey' 
        AND conrelid = 'admin_users'::regclass
    ) THEN
        ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;
        RAISE NOTICE 'Removed conflicting primary key constraint from admin_users';
    ELSE
        RAISE NOTICE 'No conflicting primary key constraint found on admin_users';
    END IF;
    
    -- Remove conflicting primary key constraints from registrations
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_pkey' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_pkey;
        RAISE NOTICE 'Removed conflicting primary key constraint from registrations';
    ELSE
        RAISE NOTICE 'No conflicting primary key constraint found on registrations';
    END IF;
END $$;

-- Re-add the primary key constraints properly
DO $$
BEGIN
    -- Add primary key constraint to admin_audit_logs if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_audit_logs_pkey' 
        AND conrelid = 'admin_audit_logs'::regclass
    ) THEN
        ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key constraint to admin_audit_logs';
    ELSE
        RAISE NOTICE 'Primary key constraint already exists on admin_audit_logs';
    END IF;
    
    -- Add primary key constraint to admin_users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_pkey' 
        AND conrelid = 'admin_users'::regclass
    ) THEN
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key constraint to admin_users';
    ELSE
        RAISE NOTICE 'Primary key constraint already exists on admin_users';
    END IF;
    
    -- Add primary key constraint to registrations if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_pkey' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key constraint to registrations';
    ELSE
        RAISE NOTICE 'Primary key constraint already exists on registrations';
    END IF;
END $$;

-- Ensure all required columns exist in email_outbox
DO $$
BEGIN
    -- Add idempotency_key column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' 
        AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE email_outbox ADD COLUMN idempotency_key TEXT;
        RAISE NOTICE 'Added idempotency_key column to email_outbox';
    ELSE
        RAISE NOTICE 'idempotency_key column already exists in email_outbox';
    END IF;
    
    -- Add dedupe_key column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' 
        AND column_name = 'dedupe_key'
    ) THEN
        ALTER TABLE email_outbox ADD COLUMN dedupe_key TEXT;
        RAISE NOTICE 'Added dedupe_key column to email_outbox';
    ELSE
        RAISE NOTICE 'dedupe_key column already exists in email_outbox';
    END IF;
    
    -- Add subject column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' 
        AND column_name = 'subject'
    ) THEN
        ALTER TABLE email_outbox ADD COLUMN subject TEXT;
        RAISE NOTICE 'Added subject column to email_outbox';
    ELSE
        RAISE NOTICE 'subject column already exists in email_outbox';
    END IF;
END $$;

-- Add indexes for email_outbox if they don't exist
DO $$
BEGIN
    -- Add index for idempotency_key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_email_outbox_idempotency_key'
        AND tablename = 'email_outbox'
    ) THEN
        CREATE INDEX idx_email_outbox_idempotency_key 
        ON email_outbox (idempotency_key) 
        WHERE idempotency_key IS NOT NULL;
        RAISE NOTICE 'Added idempotency_key index to email_outbox';
    ELSE
        RAISE NOTICE 'idempotency_key index already exists in email_outbox';
    END IF;
    
    -- Add unique constraint for idempotency_key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'email_outbox_idempotency_key_uidx'
        AND tablename = 'email_outbox'
    ) THEN
        CREATE UNIQUE INDEX email_outbox_idempotency_key_uidx 
        ON email_outbox (idempotency_key) 
        WHERE idempotency_key IS NOT NULL;
        RAISE NOTICE 'Added idempotency_key unique constraint to email_outbox';
    ELSE
        RAISE NOTICE 'idempotency_key unique constraint already exists in email_outbox';
    END IF;
    
    -- Add index for dedupe_key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_email_outbox_dedupe_key'
        AND tablename = 'email_outbox'
    ) THEN
        CREATE INDEX idx_email_outbox_dedupe_key 
        ON email_outbox (dedupe_key) 
        WHERE dedupe_key IS NOT NULL;
        RAISE NOTICE 'Added dedupe_key index to email_outbox';
    ELSE
        RAISE NOTICE 'dedupe_key index already exists in email_outbox';
    END IF;
END $$;

-- Update the fn_enqueue_email function to handle idempotency_key
CREATE OR REPLACE FUNCTION fn_enqueue_email(
  p_template TEXT,
  p_to_email TEXT,
  p_subject TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_dedupe_key TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- If idempotency key provided, try to find existing record
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id FROM email_outbox WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_id;
    END IF;
  END IF;

  -- If dedupe key provided, try to find existing record (fallback)
  IF p_dedupe_key IS NOT NULL THEN
    SELECT id INTO v_id FROM email_outbox WHERE dedupe_key = p_dedupe_key;
    IF FOUND THEN
      RETURN v_id;
    END IF;
  END IF;

  -- Insert new email record
  INSERT INTO email_outbox (
    template, 
    to_email, 
    subject,
    payload, 
    dedupe_key,
    idempotency_key,
    scheduled_at
  ) VALUES (
    p_template,
    p_to_email,
    p_subject,
    COALESCE(p_payload, '{}'::jsonb),
    p_dedupe_key,
    p_idempotency_key,
    p_scheduled_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments to document the changes
COMMENT ON COLUMN email_outbox.idempotency_key IS 'Unique key for idempotent email processing to prevent duplicate sends';
COMMENT ON COLUMN email_outbox.dedupe_key IS 'Legacy deduplication key for backward compatibility';
COMMENT ON COLUMN email_outbox.subject IS 'Email subject line for the queued email';

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Remote schema conflict resolution completed successfully';
    RAISE NOTICE 'Primary key conflicts resolved for admin_audit_logs, admin_users, and registrations';
    RAISE NOTICE 'All required columns ensured in email_outbox';
    RAISE NOTICE 'Email function updated to handle idempotency';
END $$;
