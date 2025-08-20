-- Migration: Fix Remote Schema Conflicts - Final Resolution
-- Version: 1.4
-- Description: Final comprehensive resolution of all remote schema conflicts
-- Date: 2025-01-27

-- This migration provides the final comprehensive resolution of all conflicts
-- with the 20250818165159_remote_schema.sql file

-- Function to safely recreate primary key constraints
CREATE OR REPLACE FUNCTION safe_recreate_primary_keys()
RETURNS void AS $$
BEGIN
    -- Recreate primary key for registrations if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_pkey' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Recreated primary key constraint for registrations';
    END IF;
    
    -- Recreate primary key for event_settings if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'event_settings_pkey' 
        AND conrelid = 'event_settings'::regclass
    ) THEN
        ALTER TABLE event_settings ADD CONSTRAINT event_settings_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Recreated primary key constraint for event_settings';
    END IF;
    
    -- Recreate primary key for admin_users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_pkey' 
        AND conrelid = 'admin_users'::regclass
    ) THEN
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Recreated primary key constraint for admin_users';
    END IF;
    
    -- Recreate primary key for admin_audit_logs if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_audit_logs_pkey' 
        AND conrelid = 'admin_audit_logs'::regclass
    ) THEN
        ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Recreated primary key constraint for admin_audit_logs';
    END IF;
    
    -- Recreate primary key for deep_link_tokens if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deep_link_tokens_pkey' 
        AND conrelid = 'deep_link_tokens'::regclass
    ) THEN
        ALTER TABLE deep_link_tokens ADD CONSTRAINT deep_link_tokens_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Recreated primary key constraint for deep_link_tokens';
    END IF;
    
    -- Recreate primary key for deep_link_token_audit if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deep_link_token_audit_pkey' 
        AND conrelid = 'deep_link_token_audit'::regclass
    ) THEN
        ALTER TABLE deep_link_token_audit ADD CONSTRAINT deep_link_token_audit_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Recreated primary key constraint for deep_link_token_audit';
    END IF;
    
    -- Recreate primary key for email_outbox if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_outbox_pkey' 
        AND conrelid = 'email_outbox'::regclass
    ) THEN
        ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Recreated primary key constraint for email_outbox';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely recreate unique constraints
CREATE OR REPLACE FUNCTION safe_recreate_unique_constraints()
RETURNS void AS $$
BEGIN
    -- Recreate unique constraint for registrations.registration_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_registration_id_key' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations ADD CONSTRAINT registrations_registration_id_key UNIQUE (registration_id);
        RAISE NOTICE 'Recreated unique constraint for registrations.registration_id';
    END IF;
    
    -- Recreate unique constraint for admin_users.email if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_email_key' 
        AND conrelid = 'admin_users'::regclass
    ) THEN
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);
        RAISE NOTICE 'Recreated unique constraint for admin_users.email';
    END IF;
    
    -- Recreate unique constraint for deep_link_tokens.token_hash if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deep_link_tokens_token_hash_key' 
        AND conrelid = 'deep_link_tokens'::regclass
    ) THEN
        ALTER TABLE deep_link_tokens ADD CONSTRAINT deep_link_tokens_token_hash_key UNIQUE (token_hash);
        RAISE NOTICE 'Recreated unique constraint for deep_link_tokens.token_hash';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely recreate check constraints
CREATE OR REPLACE FUNCTION safe_recreate_check_constraints()
RETURNS void AS $$
BEGIN
    -- Recreate check constraint for registrations.status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_status_check' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations ADD CONSTRAINT registrations_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected', 'needs_update', 'waiting_for_review', 'waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc'));
        RAISE NOTICE 'Recreated check constraint for registrations.status';
    END IF;
    
    -- Recreate check constraint for registrations.review_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_review_status_check' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations ADD CONSTRAINT registrations_review_status_check 
        CHECK (
            payment_review_status IN ('pending', 'needs_update', 'passed', 'rejected') AND
            profile_review_status IN ('pending', 'needs_update', 'passed', 'rejected') AND
            tcc_review_status IN ('pending', 'needs_update', 'passed', 'rejected')
        );
        RAISE NOTICE 'Recreated check constraint for registrations.review_status';
    END IF;
    
    -- Recreate check constraint for admin_users.role if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_role_check' 
        AND conrelid = 'admin_users'::regclass
    ) THEN
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
        CHECK (role IN ('admin', 'super_admin'));
        RAISE NOTICE 'Recreated check constraint for admin_users.role';
    END IF;
    
    -- Recreate check constraint for deep_link_tokens.dimension if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deep_link_tokens_dimension_check' 
        AND conrelid = 'deep_link_tokens'::regclass
    ) THEN
        ALTER TABLE deep_link_tokens ADD CONSTRAINT deep_link_tokens_dimension_check 
        CHECK (dimension IN ('payment', 'profile', 'tcc'));
        RAISE NOTICE 'Recreated check constraint for deep_link_tokens.dimension';
    END IF;
    
    -- Recreate check constraint for deep_link_token_audit.event_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deep_link_token_audit_event_type_check' 
        AND conrelid = 'deep_link_token_audit'::regclass
    ) THEN
        ALTER TABLE deep_link_token_audit ADD CONSTRAINT deep_link_token_audit_event_type_check 
        CHECK (event_type IN ('created', 'used', 'expired', 'invalid_attempt'));
        RAISE NOTICE 'Recreated check constraint for deep_link_token_audit.event_type';
    END IF;
    
    -- Recreate check constraint for email_outbox.template if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_outbox_template_check' 
        AND conrelid = 'email_outbox'::regclass
    ) THEN
        ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_template_check 
        CHECK (template IN ('tracking', 'update-payment', 'update-info', 'update-tcc', 'approval-badge', 'rejection'));
        RAISE NOTICE 'Recreated check constraint for email_outbox.template';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- CRITICAL FIX: Recreate all primary key constraints
SELECT safe_recreate_primary_keys();

-- CRITICAL FIX: Recreate all unique constraints
SELECT safe_recreate_unique_constraints();

-- CRITICAL FIX: Recreate all check constraints
SELECT safe_recreate_check_constraints();

-- CRITICAL FIX: Ensure all indexes are properly created
DO $$
BEGIN
    -- Recreate indexes for registrations table
    CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
    CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
    CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
    CREATE INDEX IF NOT EXISTS idx_registrations_company_name ON registrations(company_name);
    CREATE INDEX IF NOT EXISTS idx_registrations_business_type ON registrations(business_type);
    CREATE INDEX IF NOT EXISTS idx_registrations_yec_province ON registrations(yec_province);
    CREATE INDEX IF NOT EXISTS idx_registrations_status_created_at ON registrations(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_registrations_status_province ON registrations(status, yec_province);
    CREATE INDEX IF NOT EXISTS idx_registrations_update_reason ON registrations(update_reason) WHERE update_reason IS NOT NULL;
    
    -- Recreate indexes for admin_audit_logs table
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON admin_audit_logs(admin_email);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_registration_id ON admin_audit_logs(registration_id);
    
    -- Recreate indexes for deep_link_tokens table
    CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_token_hash ON deep_link_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_registration_id ON deep_link_tokens(registration_id);
    CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_expires_at ON deep_link_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_used_at ON deep_link_tokens(used_at);
    
    -- Recreate indexes for deep_link_token_audit table
    CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_token_id ON deep_link_token_audit(token_id);
    CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_registration_id ON deep_link_token_audit(registration_id);
    CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_event_type ON deep_link_token_audit(event_type);
    CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_created_at ON deep_link_token_audit(created_at);
    
    -- Recreate indexes for email_outbox table
    CREATE INDEX IF NOT EXISTS idx_email_outbox_status_scheduled ON email_outbox (status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_email_outbox_template ON email_outbox (template);
    CREATE INDEX IF NOT EXISTS idx_email_outbox_to_email ON email_outbox (to_email);
    CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at ON email_outbox (created_at);
    -- Only create index if the column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'email_outbox' 
      AND column_name = 'next_attempt'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_email_outbox_next_attempt ON email_outbox (next_attempt);
    END IF;
    CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_dedupe_key_uidx ON email_outbox (dedupe_key) WHERE dedupe_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_email_outbox_idempotency_key ON email_outbox (idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_idempotency_key_uidx ON email_outbox (idempotency_key) WHERE idempotency_key IS NOT NULL;
    
    RAISE NOTICE 'All indexes recreated successfully';
END $$;

-- Clean up helper functions
DROP FUNCTION IF EXISTS safe_recreate_primary_keys();
DROP FUNCTION IF EXISTS safe_recreate_unique_constraints();
DROP FUNCTION IF EXISTS safe_recreate_check_constraints();

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Final remote schema conflict resolution completed successfully';
    RAISE NOTICE 'All primary key constraints recreated';
    RAISE NOTICE 'All unique constraints recreated';
    RAISE NOTICE 'All check constraints recreated';
    RAISE NOTICE 'All indexes recreated';
    RAISE NOTICE 'Schema is now consistent and conflict-free';
END $$;
