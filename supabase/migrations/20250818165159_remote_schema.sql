-- Migration: Remote Schema (Auto-generated)
-- Version: 1.1
-- Description: Auto-generated schema from Supabase - Cleaned to prevent conflicts
-- Date: 2025-08-18

-- This file contains auto-generated schema definitions from Supabase
-- All conflicting definitions have been removed to prevent migration conflicts
-- Primary keys, unique constraints, indexes, functions, and triggers are handled by local migrations

-- Extensions (already handled by 001_initial_schema.sql)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Audit schema and tables (unique to this file)
CREATE SCHEMA IF NOT EXISTS "audit";

CREATE TABLE IF NOT EXISTS "audit"."access_log" (
    "id" bigint NOT NULL,
    "occurred_at_utc" timestamp with time zone DEFAULT "now"(),
    "action" "text" NOT NULL,
    "method" "text",
    "resource" "text",
    "result" "text" NOT NULL,
    "request_id" "text" NOT NULL,
    "src_ip" "inet",
    "user_agent" "text",
    "latency_ms" integer,
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "audit"."event_log" (
    "id" bigint NOT NULL,
    "occurred_at_utc" timestamp with time zone DEFAULT "now"(),
    "event_type" "text" NOT NULL,
    "event_data" "jsonb",
    "user_id" "uuid",
    "session_id" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- Sequences
CREATE SEQUENCE IF NOT EXISTS "audit"."access_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "audit"."event_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Primary keys for audit tables
ALTER TABLE ONLY "audit"."access_log"
    ADD CONSTRAINT "access_log_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "audit"."event_log"
    ADD CONSTRAINT "event_log_pkey" PRIMARY KEY ("id");

-- Sequences owned by tables
ALTER SEQUENCE "audit"."access_log_id_seq" OWNED BY "audit"."access_log"."id";
ALTER SEQUENCE "audit"."event_log_id_seq" OWNED BY "audit"."event_log"."id";

-- Default values for audit tables
ALTER TABLE ONLY "audit"."access_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"audit"."access_log_id_seq"'::"regclass");
ALTER TABLE ONLY "audit"."event_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"audit"."event_log_id_seq"'::"regclass");

-- Indexes for audit tables
CREATE INDEX IF NOT EXISTS "idx_access_log_occurred_at" ON "audit"."access_log" USING "btree" ("occurred_at_utc");
CREATE INDEX IF NOT EXISTS "idx_event_log_occurred_at" ON "audit"."event_log" USING "btree" ("occurred_at_utc");

-- RLS Policies for audit tables
CREATE POLICY IF NOT EXISTS "Authenticated users can access all audit logs" ON "audit"."access_log" TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can access all audit logs" ON "audit"."event_log" TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role can access all audit logs" ON "audit"."access_log" TO "service_role" USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role can access all audit logs" ON "audit"."event_log" TO "service_role" USING (true) WITH CHECK (true);

-- Enable RLS on audit tables
ALTER TABLE "audit"."access_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit"."event_log" ENABLE ROW LEVEL SECURITY;

-- Ownership
ALTER TABLE "audit"."access_log" OWNER TO "postgres";
ALTER TABLE "audit"."event_log" OWNER TO "postgres";
ALTER SCHEMA "audit" OWNER TO "postgres";
ALTER SEQUENCE "audit"."access_log_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "audit"."event_log_id_seq" OWNER TO "postgres";

-- Migration completed successfully
