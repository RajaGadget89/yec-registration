-- Enable pgvector extension if not exists
create extension if not exists vector;

-- Embeddings table for MCP search
create table if not exists cms_embeddings (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'faq' | 'activities' | 'news' | 'pages'
  item_id uuid not null,
  language text default 'all',
  chunk_id int default 0,
  content text not null,
  embedding vector(384) not null,
  published_at timestamptz,
  is_active boolean default true,
  updated_at timestamptz default now()
);

create index if not exists idx_cms_embeddings_type_item on cms_embeddings(type, item_id);
create index if not exists idx_cms_embeddings_lang on cms_embeddings(language);
-- ivfflat index for fast ANN search (requires analyzed list size tuning)
create index if not exists idx_cms_embeddings_embed on cms_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);


