-- Initialize MCP Content Types for YEC Registration System
-- This script sets up the basic content types for the MCP RAG system

-- Insert basic content types for public access
INSERT INTO mcp_content_types (
  type_key, 
  type_name, 
  endpoint_path, 
  is_enabled, 
  access_level, 
  source_table, 
  schema_definition, 
  query_config
) VALUES 
(
  'news',
  'News Articles',
  '/api/mcp/public/news',
  true,
  'public',
  'cms_news',
  '{"id": "uuid", "headline": "text", "content": "text", "image_url": "text", "published_at": "timestamp", "language": "text"}',
  '{"fields": "id,headline,content,image_url,published_at,language", "limit": 10}'
),
(
  'activities',
  'Activities',
  '/api/mcp/public/activities', 
  true,
  'public',
  'cms_activity_cards',
  '{"id": "uuid", "title": "text", "summary": "text", "full_url": "text", "image_url": "text", "scheduled_at": "timestamp", "language": "text"}',
  '{"fields": "id,title,summary,full_url,image_url,scheduled_at,language", "limit": 10}'
),
(
  'faq',
  'FAQ Items',
  '/api/mcp/public/faq',
  true, 
  'public',
  'cms_faq_items',
  '{"id": "uuid", "question": "text", "answer": "text", "language": "text", "item_order": "integer"}',
  '{"fields": "id,question,answer,language,item_order", "limit": 10}'
),
(
  'pages',
  'Pages',
  '/api/mcp/public/pages',
  true,
  'public', 
  'cms_pages',
  '{"id": "uuid", "title": "text", "slug": "text", "full_url": "text", "meta_description": "text", "language": "text"}',
  '{"fields": "id,title,slug,full_url,meta_description,language", "limit": 10}'
)
ON CONFLICT (type_key, access_level) DO UPDATE SET
  type_name = EXCLUDED.type_name,
  endpoint_path = EXCLUDED.endpoint_path,
  is_enabled = EXCLUDED.is_enabled,
  source_table = EXCLUDED.source_table,
  schema_definition = EXCLUDED.schema_definition,
  query_config = EXCLUDED.query_config,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mcp_content_types_type_key ON mcp_content_types(type_key);
CREATE INDEX IF NOT EXISTS idx_mcp_content_types_access_level ON mcp_content_types(access_level);
CREATE INDEX IF NOT EXISTS idx_mcp_content_types_enabled ON mcp_content_types(is_enabled);

-- Verify the setup
SELECT 
  type_key, 
  type_name, 
  endpoint_path, 
  is_enabled, 
  access_level,
  source_table
FROM mcp_content_types 
WHERE access_level = 'public' 
ORDER BY type_key;
