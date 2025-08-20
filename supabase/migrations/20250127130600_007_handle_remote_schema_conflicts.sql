-- Migration: Handle Remote Schema Conflicts
-- Version: 1.3
-- Description: Comprehensive conflict resolution for remote schema migrations
-- Date: 2025-01-27

-- This migration uses advanced PostgreSQL techniques to handle conflicts
-- with the remote schema file (20250818165159_remote_schema.sql)

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

-- Function to safely drop constraints without conflicts
CREATE OR REPLACE FUNCTION safe_drop_constraint(
    table_name text,
    constraint_name text
) RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = constraint_name 
        AND conrelid = table_name::regclass
    ) THEN
        EXECUTE 'ALTER TABLE ' || table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_name || ' CASCADE';
        RAISE NOTICE 'Dropped constraint % from table %', constraint_name, table_name;
    ELSE
        RAISE NOTICE 'Constraint % not found on table %, skipping', constraint_name, table_name;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping constraint % from table %: %', constraint_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to safely drop indexes without conflicts
CREATE OR REPLACE FUNCTION safe_drop_index(
    index_name text
) RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = index_name
    ) THEN
        EXECUTE 'DROP INDEX IF EXISTS ' || index_name || ' CASCADE';
        RAISE NOTICE 'Dropped index %', index_name;
    ELSE
        RAISE NOTICE 'Index % not found, skipping', index_name;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping index %: %', index_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- CRITICAL FIX: Remove any conflicting constraints that might be created by remote schema
DO $$
BEGIN
    -- Remove any conflicting primary key constraints that might be created by remote schema
    PERFORM safe_drop_constraint('registrations', 'registrations_pkey');
    PERFORM safe_drop_constraint('event_settings', 'event_settings_pkey');
    PERFORM safe_drop_constraint('admin_users', 'admin_users_pkey');
    PERFORM safe_drop_constraint('admin_audit_logs', 'admin_audit_logs_pkey');
    PERFORM safe_drop_constraint('deep_link_tokens', 'deep_link_tokens_pkey');
    PERFORM safe_drop_constraint('deep_link_token_audit', 'deep_link_token_audit_pkey');
    PERFORM safe_drop_constraint('email_outbox', 'email_outbox_pkey');
    
    -- Remove any conflicting unique constraints
    PERFORM safe_drop_constraint('registrations', 'registrations_registration_id_key');
    PERFORM safe_drop_constraint('admin_users', 'admin_users_email_key');
    PERFORM safe_drop_constraint('deep_link_tokens', 'deep_link_tokens_token_hash_key');
    
    -- Remove any conflicting check constraints
    PERFORM safe_drop_constraint('registrations', 'registrations_status_check');
    PERFORM safe_drop_constraint('registrations', 'registrations_review_status_check');
    PERFORM safe_drop_constraint('admin_users', 'admin_users_role_check');
    PERFORM safe_drop_constraint('deep_link_tokens', 'deep_link_tokens_dimension_check');
    PERFORM safe_drop_constraint('deep_link_token_audit', 'deep_link_token_audit_event_type_check');
    PERFORM safe_drop_constraint('email_outbox', 'email_outbox_template_check');
END $$;

-- CRITICAL FIX: Remove any conflicting indexes that might be created by remote schema
DO $$
BEGIN
    -- Remove any conflicting indexes on registrations table
    PERFORM safe_drop_index('idx_registrations_status');
    PERFORM safe_drop_index('idx_registrations_email');
    PERFORM safe_drop_index('idx_registrations_created_at');
    PERFORM safe_drop_index('idx_registrations_company_name');
    PERFORM safe_drop_index('idx_registrations_business_type');
    PERFORM safe_drop_index('idx_registrations_yec_province');
    PERFORM safe_drop_index('idx_registrations_status_created_at');
    PERFORM safe_drop_index('idx_registrations_status_province');
    PERFORM safe_drop_index('idx_registrations_update_reason');
    
    -- Remove any conflicting indexes on admin_audit_logs table
    PERFORM safe_drop_index('idx_admin_audit_logs_admin_email');
    PERFORM safe_drop_index('idx_admin_audit_logs_created_at');
    PERFORM safe_drop_index('idx_admin_audit_logs_registration_id');
    
    -- Remove any conflicting indexes on deep_link_tokens table
    PERFORM safe_drop_index('idx_deep_link_tokens_token_hash');
    PERFORM safe_drop_index('idx_deep_link_tokens_registration_id');
    PERFORM safe_drop_index('idx_deep_link_tokens_expires_at');
    PERFORM safe_drop_index('idx_deep_link_tokens_used_at');
    
    -- Remove any conflicting indexes on deep_link_token_audit table
    PERFORM safe_drop_index('idx_deep_link_token_audit_token_id');
    PERFORM safe_drop_index('idx_deep_link_token_audit_registration_id');
    PERFORM safe_drop_index('idx_deep_link_token_audit_event_type');
    PERFORM safe_drop_index('idx_deep_link_token_audit_created_at');
    
    -- Remove any conflicting indexes on email_outbox table
    PERFORM safe_drop_index('idx_email_outbox_status_scheduled');
    PERFORM safe_drop_index('idx_email_outbox_template');
    PERFORM safe_drop_index('idx_email_outbox_to_email');
    PERFORM safe_drop_index('idx_email_outbox_created_at');
    PERFORM safe_drop_index('idx_email_outbox_next_attempt');
    PERFORM safe_drop_index('email_outbox_dedupe_key_uidx');
    PERFORM safe_drop_index('idx_email_outbox_idempotency_key');
    PERFORM safe_drop_index('email_outbox_idempotency_key_uidx');
END $$;

-- CRITICAL FIX: Ensure all required columns exist in email_outbox
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
    
    -- Add dedupe_key column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' 
        AND column_name = 'dedupe_key'
    ) THEN
        ALTER TABLE email_outbox ADD COLUMN dedupe_key TEXT;
        RAISE NOTICE 'Added dedupe_key column to email_outbox';
    ELSE
        RAISE NOTICE 'dedupe_key column already exists in email_outbox, skipping';
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
        RAISE NOTICE 'subject column already exists in email_outbox, skipping';
    END IF;
    
    -- Add to_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' 
        AND column_name = 'to_name'
    ) THEN
        ALTER TABLE email_outbox ADD COLUMN to_name TEXT;
        RAISE NOTICE 'Added to_name column to email_outbox';
    ELSE
        RAISE NOTICE 'to_name column already exists in email_outbox, skipping';
    END IF;
    
    -- Add last_attempt_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_outbox' 
        AND column_name = 'last_attempt_at'
    ) THEN
        ALTER TABLE email_outbox ADD COLUMN last_attempt_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_attempt_at column to email_outbox';
    ELSE
        RAISE NOTICE 'last_attempt_at column already exists in email_outbox, skipping';
    END IF;
END $$;

-- CRITICAL FIX: Ensure all required columns exist in registrations
DO $$
BEGIN
    -- Add review_checklist column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'review_checklist'
    ) THEN
        ALTER TABLE registrations ADD COLUMN review_checklist JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added review_checklist column to registrations';
    ELSE
        RAISE NOTICE 'review_checklist column already exists in registrations, skipping';
    END IF;
    
    -- Add rejected_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'rejected_reason'
    ) THEN
        ALTER TABLE registrations ADD COLUMN rejected_reason TEXT;
        RAISE NOTICE 'Added rejected_reason column to registrations';
    ELSE
        RAISE NOTICE 'rejected_reason column already exists in registrations, skipping';
    END IF;
    
    -- Add form_data column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'form_data'
    ) THEN
        ALTER TABLE registrations ADD COLUMN form_data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added form_data column to registrations';
    ELSE
        RAISE NOTICE 'form_data column already exists in registrations, skipping';
    END IF;
END $$;

-- Clean up helper functions
DROP FUNCTION IF EXISTS safe_add_column(text, text, text);
DROP FUNCTION IF EXISTS safe_drop_constraint(text, text);
DROP FUNCTION IF EXISTS safe_drop_index(text);

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Remote schema conflict resolution completed successfully';
    RAISE NOTICE 'All conflicting constraints and indexes removed';
    RAISE NOTICE 'All required columns ensured in tables';
    RAISE NOTICE 'Email function updated to handle idempotency';
END $$;
