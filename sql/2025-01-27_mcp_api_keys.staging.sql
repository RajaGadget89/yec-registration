-- =========================================================
-- MCP API Keys Table for Supabase (Staging SQL)
-- Safe to run multiple times (IF NOT EXISTS guards)
-- =========================================================

BEGIN;

-- 0) Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create mcp_api_keys table
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(255) NOT NULL,
  key_type VARCHAR(50) NOT NULL DEFAULT 'public',
  access_level VARCHAR(50) NOT NULL DEFAULT 'public',
  api_key VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  updated_by TEXT
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_active
  ON public.mcp_api_keys (is_active);

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_access_level
  ON public.mcp_api_keys (access_level);

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_created_at
  ON public.mcp_api_keys (created_at DESC);

-- 3) Trigger to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mcp_api_keys_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION public.fn_touch_updated_at() RETURNS trigger AS $f$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;$f$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_mcp_api_keys_updated_at
      BEFORE UPDATE ON public.mcp_api_keys
      FOR EACH ROW EXECUTE PROCEDURE public.fn_touch_updated_at();
  END IF;
END$$;

-- 4) Row Level Security (RLS)
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- 4.1 service_role can do everything
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mcp_api_keys' AND policyname='service_role_full_access_mcp_api_keys'
  ) THEN
    CREATE POLICY service_role_full_access_mcp_api_keys
      ON public.mcp_api_keys
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

-- 5) Seed initial API keys (only if they don't exist)
INSERT INTO public.mcp_api_keys (key_name, key_type, access_level, api_key, is_active)
SELECT 'Default Public Key', 'public', 'public', 'mcp_public_' || encode(gen_random_bytes(16), 'hex'), TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_api_keys WHERE key_name = 'Default Public Key');

INSERT INTO public.mcp_api_keys (key_name, key_type, access_level, api_key, is_active)
SELECT 'Default Admin Key', 'admin', 'admin', 'mcp_admin_' || encode(gen_random_bytes(16), 'hex'), TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_api_keys WHERE key_name = 'Default Admin Key');

COMMIT;
