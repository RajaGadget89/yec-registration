-- =========================================================
-- Add Unified Endpoint as Content Type
-- This makes the unified endpoint manageable through the UI
-- =========================================================

BEGIN;

-- Add unified endpoint as a special content type
INSERT INTO public.mcp_content_types (
  type_key, 
  type_name, 
  description, 
  endpoint_path, 
  is_enabled, 
  access_level, 
  source_table, 
  schema_definition,
  query_config
)
SELECT 
  'unified',
  'Unified Endpoint',
  'Aggregated endpoint that combines all enabled content types into a single response',
  '/api/mcp/public/simple',
  TRUE,
  'public',
  NULL, -- No single source table - aggregates from multiple
  '{"type": "aggregated", "combines": ["faq", "activities", "news", "pages"]}',
  '{"aggregation": true, "include_system_info": true}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.mcp_content_types WHERE type_key = 'unified'
);

COMMIT;
