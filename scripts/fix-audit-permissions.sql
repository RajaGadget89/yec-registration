-- Comprehensive Audit Schema Permission Fix
-- This script fixes all permission issues that might prevent the application from accessing audit tables

-- 1. First, let's check what we have
SELECT 'Current Schema Status' as check_type;
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'audit';

SELECT 'Current Tables Status' as check_type;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'audit';

SELECT 'Current Functions Status' as check_type;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'audit';

-- 2. Grant ALL permissions to service_role on the entire audit schema
GRANT USAGE ON SCHEMA audit TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA audit TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA audit TO service_role;

-- 3. Grant ALL permissions to authenticated users (for admin dashboard)
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA audit TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA audit TO authenticated;

-- 4. Grant ALL permissions to postgres role (superuser)
GRANT USAGE ON SCHEMA audit TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA audit TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA audit TO postgres;

-- 5. Ensure RLS is properly configured
ALTER TABLE audit.access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.event_log ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies and recreate them
DROP POLICY IF EXISTS "Service role can access all audit logs" ON audit.access_log;
DROP POLICY IF EXISTS "Service role can access all audit logs" ON audit.event_log;
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON audit.access_log;
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON audit.event_log;

-- 7. Create comprehensive policies for service_role
CREATE POLICY "Service role can access all audit logs" ON audit.access_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can access all audit logs" ON audit.event_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Create comprehensive policies for authenticated users
CREATE POLICY "Authenticated users can access all audit logs" ON audit.access_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access all audit logs" ON audit.event_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Create comprehensive policies for postgres
CREATE POLICY "Postgres can access all audit logs" ON audit.access_log
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "Postgres can access all audit logs" ON audit.event_log
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- 10. Test direct table access
SELECT 'Testing Direct Table Access' as test_type;

-- Test access_log table
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
    'permission-test',
    'GET',
    '/test',
    '200',
    'permission-test-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    '127.0.0.1',
    'permission-test-agent',
    100,
    '{"test": "permission-fix"}'::jsonb
);

-- Test event_log table
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
    'PermissionTest',
    'Test',
    'permission-test-123',
    'permission-test-user-id',
    'system',
    'success',
    'permission fix test',
    'permission-test-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    '{"test": "permission-fix"}'::jsonb
);

-- 11. Test function access
SELECT 'Testing Function Access' as test_type;

-- Test log_access function
SELECT audit.log_access('{
  "action": "function-permission-test",
  "method": "GET",
  "resource": "/test",
  "result": "200",
  "request_id": "function-test-' || EXTRACT(EPOCH FROM NOW())::TEXT || '",
  "src_ip": "127.0.0.1",
  "user_agent": "function-test-agent",
  "latency_ms": 100,
  "meta": {"test": "function-permission-fix"}
}'::jsonb);

-- Test log_event function
SELECT audit.log_event('{
  "action": "FunctionPermissionTest",
  "resource": "Test",
  "resource_id": "function-test-123",
  "actor_id": "function-test-user-id",
  "actor_role": "system",
  "result": "success",
  "reason": "function permission fix test",
  "correlation_id": "function-test-' || EXTRACT(EPOCH FROM NOW())::TEXT || '",
  "meta": {"test": "function-permission-fix"}
}'::jsonb);

-- 12. Verify all permissions
SELECT 'Permission Verification' as check_type;
SELECT 
    grantee,
    privilege_type,
    table_name
FROM information_schema.role_table_grants 
WHERE table_schema = 'audit' 
ORDER BY grantee, privilege_type;

-- 13. Final verification
SELECT 'Final Test Results' as test_type;
SELECT 
    'Direct Insert Test' as test_name,
    'access_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Direct insert working'
        ELSE '❌ Direct insert failed'
    END as result
FROM audit.access_log 
WHERE action = 'permission-test'
UNION ALL
SELECT 
    'Direct Insert Test' as test_name,
    'event_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Direct insert working'
        ELSE '❌ Direct insert failed'
    END as result
FROM audit.event_log 
WHERE action = 'PermissionTest'
UNION ALL
SELECT 
    'Function Test' as test_name,
    'access_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function working'
        ELSE '❌ Function failed'
    END as result
FROM audit.access_log 
WHERE action = 'function-permission-test'
UNION ALL
SELECT 
    'Function Test' as test_name,
    'event_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function working'
        ELSE '❌ Function failed'
    END as result
FROM audit.event_log 
WHERE action = 'FunctionPermissionTest';
