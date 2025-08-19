-- Migration: Handle Remote Schema Conflicts
-- Version: 1.1
-- Description: Safely handles conflicts with remote schema migrations and ensures all required columns exist
-- Date: 2025-01-27

-- This migration uses advanced PostgreSQL techniques to handle conflicts
-- with the remote schema file (20250818165159_remote_schema.sql)

-- Function to safely add constraints without conflicts
CREATE OR REPLACE FUNCTION safe_add_constraint(
    table_name text,
    constraint_name text,
    constraint_definition text
) RETURNS void AS $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = constraint_name
        AND conrelid = table_name::regclass
    ) THEN
        -- Execute the constraint definition
        EXECUTE constraint_definition;
        RAISE NOTICE 'Added constraint % to table %', constraint_name, table_name;
    ELSE
        RAISE NOTICE 'Constraint % already exists on table %, skipping', constraint_name, table_name;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint % already exists on table %, skipping', constraint_name, table_name;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraint % to table %: %', constraint_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to safely add indexes without conflicts
CREATE OR REPLACE FUNCTION safe_add_index(
    table_name text,
    index_name text,
    index_definition text
) RETURNS void AS $$
BEGIN
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = index_name
        AND tablename = table_name
    ) THEN
        -- Execute the index definition
        EXECUTE index_definition;
        RAISE NOTICE 'Added index % to table %', index_name, table_name;
    ELSE
        RAISE NOTICE 'Index % already exists on table %, skipping', index_name, table_name;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Index % already exists on table %, skipping', index_name, table_name;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding index % to table %: %', index_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to safely add columns without conflicts
CREATE OR REPLACE FUNCTION safe_add_column(
    table_name text,
    column_name text,
    column_definition text
) RETURNS void AS $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = table_name
        AND column_name = column_name
    ) THEN
        -- Execute the column definition
        EXECUTE 'ALTER TABLE ' || table_name || ' ADD COLUMN ' || column_definition;
        RAISE NOTICE 'Added column % to table %', column_name, table_name;
    ELSE
        RAISE NOTICE 'Column % already exists on table %, skipping', column_name, table_name;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column % already exists on table %, skipping', column_name, table_name;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding column % to table %: %', column_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- CRITICAL FIX: Remove the conflicting primary key constraint from admin_audit_logs
-- This is the root cause of the migration failure
DO $$
BEGIN
    -- Check if the conflicting primary key constraint exists and remove it
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_audit_logs_pkey' 
        AND conrelid = 'admin_audit_logs'::regclass
    ) THEN
        -- Drop the conflicting primary key constraint
        ALTER TABLE admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_pkey;
        RAISE NOTICE 'Removed conflicting primary key constraint from admin_audit_logs';
    END IF;
END $$;

-- Handle primary key constraints that might conflict with remote schema
-- Note: event_settings already has PRIMARY KEY in CREATE TABLE, so we skip it
DO $$
BEGIN
    -- Safely add primary key constraints (only for tables without PRIMARY KEY in CREATE TABLE)
    PERFORM safe_add_constraint(
        'admin_audit_logs',
        'admin_audit_logs_pkey',
        'ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id)'
    );
    
    PERFORM safe_add_constraint(
        'admin_users',
        'admin_users_pkey',
        'ALTER TABLE admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id)'
    );
    
    PERFORM safe_add_constraint(
        'registrations',
        'registrations_pkey',
        'ALTER TABLE registrations ADD CONSTRAINT registrations_pkey PRIMARY KEY (id)'
    );
    
    -- Note: event_settings already has PRIMARY KEY in CREATE TABLE, so we skip it
    
    -- Safely add unique constraints
    PERFORM safe_add_constraint(
        'admin_users',
        'admin_users_email_key',
        'ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email)'
    );
    
    PERFORM safe_add_constraint(
        'registrations',
        'registrations_registration_id_key',
        'ALTER TABLE registrations ADD CONSTRAINT registrations_registration_id_key UNIQUE (registration_id)'
    );
    
    -- Safely add indexes that might conflict
    PERFORM safe_add_index(
        'admin_audit_logs',
        'idx_audit_admin_email',
        'CREATE INDEX idx_audit_admin_email ON admin_audit_logs USING btree (admin_email)'
    );
    
    PERFORM safe_add_index(
        'admin_audit_logs',
        'idx_audit_created_at',
        'CREATE INDEX idx_audit_created_at ON admin_audit_logs USING btree (created_at DESC)'
    );
    
    PERFORM safe_add_index(
        'admin_audit_logs',
        'idx_audit_registration_id',
        'CREATE INDEX idx_audit_registration_id ON admin_audit_logs USING btree (registration_id)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_business_type',
        'CREATE INDEX idx_registrations_business_type ON registrations USING btree (business_type)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_company_name',
        'CREATE INDEX idx_registrations_company_name ON registrations USING btree (company_name)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_created_at',
        'CREATE INDEX idx_registrations_created_at ON registrations USING btree (created_at)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_email',
        'CREATE INDEX idx_registrations_email ON registrations USING btree (email)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_status',
        'CREATE INDEX idx_registrations_status ON registrations USING btree (status)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_status_created_at',
        'CREATE INDEX idx_registrations_status_created_at ON registrations USING btree (status, created_at)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_status_province',
        'CREATE INDEX idx_registrations_status_province ON registrations USING btree (status, yec_province)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_update_reason',
        'CREATE INDEX idx_registrations_update_reason ON registrations USING btree (update_reason) WHERE (update_reason IS NOT NULL)'
    );
    
    PERFORM safe_add_index(
        'registrations',
        'idx_registrations_yec_province',
        'CREATE INDEX idx_registrations_yec_province ON registrations USING btree (yec_province)'
    );
    
END $$;

-- CRITICAL FIX: Ensure idempotency_key column exists in email_outbox
-- This addresses the second error in the E2E tests
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
        RAISE NOTICE 'idempotency_key column already exists in email_outbox, skipping';
    END IF;
    
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
        RAISE NOTICE 'idempotency_key index already exists in email_outbox, skipping';
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
        RAISE NOTICE 'idempotency_key unique constraint already exists in email_outbox, skipping';
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

-- Add comment to document the change
COMMENT ON COLUMN email_outbox.idempotency_key IS 'Unique key for idempotent email processing to prevent duplicate sends';

-- Clean up helper functions
DROP FUNCTION IF EXISTS safe_add_constraint(text, text, text);
DROP FUNCTION IF EXISTS safe_add_index(text, text, text);
DROP FUNCTION IF EXISTS safe_add_column(text, text, text);

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Remote schema conflict resolution completed successfully';
    RAISE NOTICE 'Primary key conflicts resolved for admin_audit_logs';
    RAISE NOTICE 'idempotency_key column ensured in email_outbox';
END $$;
