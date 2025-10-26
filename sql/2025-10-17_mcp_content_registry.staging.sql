-- =========================================================
-- MCP Content Registry Schema for Supabase (Staging SQL)
-- Safe to run multiple times (IF NOT EXISTS guards)
-- =========================================================

BEGIN;

-- 0) Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tables
-- 1.1 mcp_content_types
CREATE TABLE IF NOT EXISTS public.mcp_content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key VARCHAR(100) UNIQUE NOT NULL,
  type_name VARCHAR(255) NOT NULL,
  description TEXT,
  endpoint_path VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  access_level VARCHAR(50) NOT NULL DEFAULT 'public',
  source_table VARCHAR(255),
  schema_definition JSONB,
  query_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- 1.2 mcp_content_exposure
CREATE TABLE IF NOT EXISTS public.mcp_content_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID NOT NULL REFERENCES public.mcp_content_types(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  is_exposed BOOLEAN NOT NULL DEFAULT TRUE,
  exposure_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT mcp_content_exposure_unique UNIQUE (content_type_id, content_id)
);

-- 1.3 mcp_access_logs
CREATE TABLE IF NOT EXISTS public.mcp_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID REFERENCES public.mcp_content_types(id),
  api_key_type VARCHAR(50),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  query_params JSONB,
  response_size INTEGER,
  response_time_ms INTEGER,
  status_code INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  correlation_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_mcp_content_types_enabled
  ON public.mcp_content_types (is_enabled, access_level);

CREATE INDEX IF NOT EXISTS idx_mcp_content_exposure_lookup
  ON public.mcp_content_exposure (content_type_id, content_id, is_exposed);

CREATE INDEX IF NOT EXISTS idx_mcp_access_logs_timestamp
  ON public.mcp_access_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_access_logs_endpoint
  ON public.mcp_access_logs (endpoint);

-- 3) Triggers to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mcp_content_types_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION public.fn_touch_updated_at() RETURNS trigger AS $f$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;$f$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_mcp_content_types_updated_at
      BEFORE UPDATE ON public.mcp_content_types
      FOR EACH ROW EXECUTE PROCEDURE public.fn_touch_updated_at();

    CREATE TRIGGER trg_mcp_content_exposure_updated_at
      BEFORE UPDATE ON public.mcp_content_exposure
      FOR EACH ROW EXECUTE PROCEDURE public.fn_touch_updated_at();
  END IF;
END$$;

-- 4) Row Level Security (RLS)
ALTER TABLE public.mcp_content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_content_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_access_logs ENABLE ROW LEVEL SECURITY;

-- 4.1 service_role can do everything
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mcp_content_types' AND policyname='service_role_full_access_mcp_content_types'
  ) THEN
    CREATE POLICY service_role_full_access_mcp_content_types
      ON public.mcp_content_types
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mcp_content_exposure' AND policyname='service_role_full_access_mcp_content_exposure'
  ) THEN
    CREATE POLICY service_role_full_access_mcp_content_exposure
      ON public.mcp_content_exposure
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mcp_access_logs' AND policyname='service_role_full_access_mcp_access_logs'
  ) THEN
    CREATE POLICY service_role_full_access_mcp_access_logs
      ON public.mcp_access_logs
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

-- 5) Seed initial content types (only if they don't exist)
INSERT INTO public.mcp_content_types (type_key, type_name, description, endpoint_path, is_enabled, access_level, source_table, schema_definition)
SELECT 'faq', 'FAQ', 'Published FAQs exposed to public MCP', '/api/mcp/public/faq', TRUE, 'public', 'cms_faq_groups', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_content_types WHERE type_key = 'faq');

INSERT INTO public.mcp_content_types (type_key, type_name, description, endpoint_path, is_enabled, access_level, source_table, schema_definition)
SELECT 'activities', 'Activities', 'Activity cards exposed to public MCP', '/api/mcp/public/activities', TRUE, 'public', 'cms_activity_cards', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_content_types WHERE type_key = 'activities');

INSERT INTO public.mcp_content_types (type_key, type_name, description, endpoint_path, is_enabled, access_level, source_table, schema_definition)
SELECT 'news', 'News', 'News posts exposed to public MCP', '/api/mcp/public/news', TRUE, 'public', 'cms_news', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_content_types WHERE type_key = 'news');

INSERT INTO public.mcp_content_types (type_key, type_name, description, endpoint_path, is_enabled, access_level, source_table, schema_definition)
SELECT 'pages', 'Pages', 'CMS pages exposed by slug to public MCP', '/api/mcp/public/pages', TRUE, 'public', 'cms_pages', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_content_types WHERE type_key = 'pages');

COMMIT;


