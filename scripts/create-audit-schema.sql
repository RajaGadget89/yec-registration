-- Create audit schema and tables for YEC Registration system
-- This script creates the audit infrastructure needed for the audit logging system

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Create audit.access_log table
CREATE TABLE IF NOT EXISTS audit.access_log (
    id BIGSERIAL PRIMARY KEY,
    occurred_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,
    method TEXT,
    resource TEXT,
    result TEXT NOT NULL,
    request_id TEXT NOT NULL,
    src_ip INET,
    user_agent TEXT,
    latency_ms INTEGER,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit.event_log table
CREATE TABLE IF NOT EXISTS audit.event_log (
    id BIGSERIAL PRIMARY KEY,
    occurred_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    actor_id TEXT,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'admin', 'system')),
    result TEXT NOT NULL,
    reason TEXT,
    correlation_id TEXT NOT NULL,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_log_request_id ON audit.access_log(request_id);
CREATE INDEX IF NOT EXISTS idx_access_log_occurred_at ON audit.access_log(occurred_at_utc);
CREATE INDEX IF NOT EXISTS idx_event_log_correlation_id ON audit.event_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_event_log_occurred_at ON audit.event_log(occurred_at_utc);
CREATE INDEX IF NOT EXISTS idx_event_log_action ON audit.event_log(action);

-- Create RPC function for logging access events
CREATE OR REPLACE FUNCTION audit.log_access(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit.access_log (
        action,
        method,
        resource,
        result,
        request_id,
        src_ip,
        user_agent,
        latency_ms,
        meta
    ) VALUES (
        p->>'action',
        p->>'method',
        p->>'resource',
        p->>'result',
        p->>'request_id',
        (p->>'src_ip')::INET,
        p->>'user_agent',
        (p->>'latency_ms')::INTEGER,
        p->'meta'
    );
END;
$$;

-- Create RPC function for logging event events
CREATE OR REPLACE FUNCTION audit.log_event(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit.event_log (
        action,
        resource,
        resource_id,
        actor_id,
        actor_role,
        result,
        reason,
        correlation_id,
        meta
    ) VALUES (
        p->>'action',
        p->>'resource',
        p->>'resource_id',
        p->>'actor_id',
        p->>'actor_role',
        p->>'result',
        p->>'reason',
        p->>'correlation_id',
        p->'meta'
    );
END;
$$;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO authenticated;
GRANT EXECUTE ON FUNCTION audit.log_access(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.log_event(JSONB) TO authenticated;

-- Grant permissions to service role
GRANT USAGE ON SCHEMA audit TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO service_role;
GRANT EXECUTE ON FUNCTION audit.log_access(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION audit.log_event(JSONB) TO service_role;

-- Create row level security policies
ALTER TABLE audit.access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.event_log ENABLE ROW LEVEL SECURITY;

-- Policy for service role to access all audit logs
CREATE POLICY "Service role can access all audit logs" ON audit.access_log
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all audit logs" ON audit.event_log
    FOR ALL TO service_role USING (true);

-- Policy for authenticated users to read audit logs (for admin dashboard)
CREATE POLICY "Authenticated users can read audit logs" ON audit.access_log
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read audit logs" ON audit.event_log
    FOR SELECT TO authenticated USING (true);

