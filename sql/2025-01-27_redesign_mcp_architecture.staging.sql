-- =========================================================
-- MCP Architecture Redesign: API-Driven Content Fetching
-- Replace direct DB access with API endpoint calls
-- =========================================================

BEGIN;

-- 1) Add new columns to mcp_content_types for API-driven architecture
ALTER TABLE public.mcp_content_types 
ADD COLUMN IF NOT EXISTS data_source_type VARCHAR(20) DEFAULT 'database' CHECK (data_source_type IN ('database', 'external_api', 'internal_api')),
ADD COLUMN IF NOT EXISTS external_api_endpoint VARCHAR(500),
ADD COLUMN IF NOT EXISTS external_api_auth_key_id UUID REFERENCES public.mcp_api_keys(id),
ADD COLUMN IF NOT EXISTS external_api_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS data_mapping_config JSONB DEFAULT '{}';

-- 2) Create index for new columns
CREATE INDEX IF NOT EXISTS idx_mcp_content_types_data_source_type 
  ON public.mcp_content_types (data_source_type);

CREATE INDEX IF NOT EXISTS idx_mcp_content_types_external_api_endpoint 
  ON public.mcp_content_types (external_api_endpoint);

-- 3) Update existing content types to use internal API endpoints
UPDATE public.mcp_content_types 
SET 
  data_source_type = 'internal_api',
  external_api_endpoint = CASE 
    WHEN type_key = 'faq' THEN '/api/cms/faq'
    WHEN type_key = 'activities' THEN '/api/cms/activities' 
    WHEN type_key = 'news' THEN '/api/cms/news'
    WHEN type_key = 'pages' THEN '/api/cms/pages'
    ELSE external_api_endpoint
  END,
  data_mapping_config = '{
    "title": "title",
    "content": "content", 
    "language": "language",
    "published_at": "published_at",
    "image_url": "image_url"
  }'::jsonb
WHERE data_source_type = 'database';

-- 4) Add unified endpoint as a special content type
INSERT INTO public.mcp_content_types (
  type_key, 
  type_name, 
  description, 
  endpoint_path, 
  is_enabled, 
  access_level, 
  data_source_type,
  external_api_endpoint,
  data_mapping_config
)
SELECT 
  'unified',
  'Unified Endpoint',
  'Aggregated endpoint that combines all enabled content types into a single response',
  '/api/mcp/public/simple',
  TRUE,
  'public',
  'internal_api',
  '/api/mcp/public/aggregate',
  '{
    "aggregation": true,
    "include_system_info": true,
    "combines_content_types": ["faq", "activities", "news", "pages"]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.mcp_content_types WHERE type_key = 'unified'
);

COMMIT;
