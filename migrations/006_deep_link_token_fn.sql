-- Deep Link Token Function Migration
-- Version: 1.0
-- Description: Creates secure deep-link token system for user update workflows

-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Create deep_link_tokens table
create table if not exists public.deep_link_tokens (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null,
  dimension text not null check (dimension in ('payment','profile','tcc')),
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists idx_dlt_reg on public.deep_link_tokens(registration_id);
create index if not exists idx_dlt_token on public.deep_link_tokens(token);
create index if not exists idx_dlt_expires on public.deep_link_tokens(expires_at);

-- Create secure token generation function
create or replace function public.generate_secure_deep_link_token(
  admin_email text,
  dimension text,
  reg_id uuid,
  ttl_seconds int
) returns text language plpgsql as $$
declare 
  raw text; 
  tok text; 
  exp timestamptz;
begin
  -- Set default TTL to 24 hours if not specified
  if ttl_seconds is null or ttl_seconds <= 0 then 
    ttl_seconds := 86400; 
  end if;
  
  -- Calculate expiration time
  exp := now() + make_interval(secs => ttl_seconds);
  
  -- Generate raw string for hashing
  raw := reg_id::text || '-' || dimension || '-' || now()::text || '-' || gen_random_uuid()::text;
  
  -- Create SHA256 hash as token
  tok := encode(digest(raw, 'sha256'), 'hex');
  
  -- Insert token record
  insert into public.deep_link_tokens (registration_id, dimension, token, expires_at, created_by)
  values (reg_id, dimension, tok, exp, admin_email);
  
  return tok;
end $$;
