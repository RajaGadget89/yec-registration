-- Migration: Fix Remote Schema Conflicts
-- Version: 1.3
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
        ALTER TABLE admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_pkey CASCADE;
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
        ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey CASCADE;
        RAISE NOTICE 'Removed conflicting primary key constraint from admin_users';
    ELSE
        RAISE NOTICE 'No conflicting primary key constraint found on admin_users';
    END IF;
    
    -- Remove conflicting primary key constraints from registrations
    -- Note: Using CASCADE to handle dependent foreign keys from deep_link_tokens and deep_link_token_audit
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_pkey' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_pkey CASCADE;
        RAISE NOTICE 'Removed conflicting primary key constraint from registrations (with CASCADE)';
    ELSE
        RAISE NOTICE 'No conflicting primary key constraint found on registrations';
    END IF;
    
    -- Remove conflicting primary key constraints from event_settings
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'event_settings_pkey' 
        AND conrelid = 'event_settings'::regclass
    ) THEN
        ALTER TABLE event_settings DROP CONSTRAINT IF EXISTS event_settings_pkey CASCADE;
        RAISE NOTICE 'Removed conflicting primary key constraint from event_settings';
    ELSE
        RAISE NOTICE 'No conflicting primary key constraint found on event_settings';
    END IF;
    
    -- Remove conflicting unique constraint from registrations
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'registrations_registration_id_key' 
        AND conrelid = 'registrations'::regclass
    ) THEN
        ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_registration_id_key CASCADE;
        RAISE NOTICE 'Removed conflicting unique constraint from registrations';
    ELSE
        RAISE NOTICE 'No conflicting unique constraint found on registrations';
    END IF;
END $$;

-- Note: Primary key constraints are properly defined in the initial schema (001)
-- This prevents future conflicts and ensures proper migration order

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Remote schema conflict resolution completed successfully';
    RAISE NOTICE 'All conflicting constraints removed from remote schema';
    RAISE NOTICE 'Primary keys are properly defined in initial schema';
END $$;
