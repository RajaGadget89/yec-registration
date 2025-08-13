-- Create missing audit RPC functions
-- This script adds the audit.log_access and audit.log_event functions that are missing

-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS audit.log_access(JSONB);
DROP FUNCTION IF EXISTS audit.log_event(JSONB);

-- Create RPC function for logging access events
CREATE FUNCTION audit.log_access(p JSONB)
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
CREATE FUNCTION audit.log_event(p JSONB)
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
GRANT EXECUTE ON FUNCTION audit.log_access(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.log_event(JSONB) TO authenticated;

-- Grant permissions to service role
GRANT EXECUTE ON FUNCTION audit.log_access(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION audit.log_event(JSONB) TO service_role;

-- Test the functions
SELECT 'Testing audit.log_access function' as test_description;
SELECT audit.log_access('{
  "action": "test-function",
  "method": "GET",
  "resource": "/test",
  "result": "200",
  "request_id": "test-function-123",
  "src_ip": "127.0.0.1",
  "user_agent": "test-agent",
  "latency_ms": 100,
  "meta": {"test": true}
}'::jsonb);

SELECT 'Testing audit.log_event function' as test_description;
SELECT audit.log_event('{
  "action": "TestFunction",
  "resource": "Test",
  "resource_id": "test-123",
  "actor_id": "test-user-id",
  "actor_role": "system",
  "result": "success",
  "reason": "function test",
  "correlation_id": "test-function-123",
  "meta": {"test": true}
}'::jsonb);

-- Verify the test data was created
SELECT 
    'Function Test Results' as test_type,
    'access_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function working correctly'
        ELSE '❌ Function not working'
    END as result
FROM audit.access_log 
WHERE action = 'test-function'
UNION ALL
SELECT 
    'Function Test Results' as test_type,
    'event_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function working correctly'
        ELSE '❌ Function not working'
    END as result
FROM audit.event_log 
WHERE action = 'TestFunction';
