-- Enable required extensions for Supabase
-- This fixes the citext type error

-- Enable extensions (idempotent)
-- For Supabase, specify the schema explicitly
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Verify extensions are enabled
SELECT 
    extname as extension_name,
    extversion as version,
    extnamespace::regnamespace as schema
FROM pg_extension 
WHERE extname IN ('citext', 'pgcrypto')
ORDER BY extname;
