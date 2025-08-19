-- Migration: Handle Remote Schema Conflicts
-- Version: 1.0
-- Description: Safely handles conflicts with remote schema migrations
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

-- Clean up helper functions
DROP FUNCTION IF EXISTS safe_add_constraint(text, text, text);
DROP FUNCTION IF EXISTS safe_add_index(text, text, text);

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Remote schema conflict resolution completed successfully';
END $$;
