-- Migration: Enable Required Extensions
-- Date: 2025-01-27
-- Description: Enable citext and pgcrypto extensions required for admin_management migration

-- Enable extensions (idempotent)
-- For Supabase, specify the schema explicitly
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Verify extensions are enabled
DO $$
BEGIN
    -- Check if citext extension exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'citext'
    ) THEN
        RAISE EXCEPTION 'citext extension could not be enabled';
    END IF;
    
    -- Check if pgcrypto extension exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'pgcrypto'
    ) THEN
        RAISE EXCEPTION 'pgcrypto extension could not be enabled';
    END IF;
    
    RAISE NOTICE 'Extensions enabled successfully: citext and pgcrypto';
END $$;
