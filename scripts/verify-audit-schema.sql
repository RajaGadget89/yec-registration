-- Verification script for audit schema
-- Run this in Supabase SQL Editor to check if audit schema is properly set up

-- Check if audit schema exists
SELECT 
    'Schema Check' as check_type,
    CASE 
        WHEN schema_name = 'audit' THEN '✅ audit schema exists'
        ELSE '❌ audit schema not found'
    END as result
FROM information_schema.schemata 
WHERE schema_name = 'audit';

-- Check if audit tables exist
SELECT 
    'Table Check' as check_type,
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ ' || table_name || ' table exists'
        ELSE '❌ ' || table_name || ' table not found'
    END as result
FROM information_schema.tables 
WHERE table_schema = 'audit' 
ORDER BY table_name;

-- Check if audit functions exist
SELECT 
    'Function Check' as check_type,
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ ' || routine_name || ' function exists'
        ELSE '❌ ' || routine_name || ' function not found'
    END as result
FROM information_schema.routines 
WHERE routine_schema = 'audit' 
ORDER BY routine_name;

-- Check if indexes exist
SELECT 
    'Index Check' as check_type,
    indexname,
    CASE 
        WHEN indexname IS NOT NULL THEN '✅ ' || indexname || ' index exists'
        ELSE '❌ ' || indexname || ' index not found'
    END as result
FROM pg_indexes 
WHERE schemaname = 'audit' 
ORDER BY indexname;

-- Check permissions
SELECT 
    'Permission Check' as check_type,
    grantee,
    privilege_type,
    CASE 
        WHEN privilege_type IS NOT NULL THEN '✅ ' || grantee || ' has ' || privilege_type || ' permission'
        ELSE '❌ ' || grantee || ' missing permissions'
    END as result
FROM information_schema.role_table_grants 
WHERE table_schema = 'audit' 
ORDER BY grantee, privilege_type;

-- Test audit logging functions (this will create test data)
SELECT 
    'Function Test' as check_type,
    'Testing audit.log_access function' as test_description;

-- Test the log_access function
SELECT audit.log_access('{
  "action": "test",
  "method": "GET",
  "resource": "test",
  "result": "200",
  "request_id": "test-verification-123",
  "src_ip": "127.0.0.1",
  "user_agent": "test-agent",
  "latency_ms": 100,
  "meta": {"test": true}
}'::jsonb);

-- Test the log_event function
SELECT audit.log_event('{
  "action": "TestEvent",
  "resource": "Test",
  "resource_id": "test-123",
  "actor_id": "test-user-id",
  "actor_role": "system",
  "result": "success",
  "reason": "verification",
  "correlation_id": "test-verification-123",
  "meta": {"test": true}
}'::jsonb);

-- Check if test data was created
SELECT 
    'Data Test' as check_type,
    'access_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Test data created successfully'
        ELSE '❌ No test data found'
    END as result
FROM audit.access_log 
WHERE request_id = 'test-verification-123'
UNION ALL
SELECT 
    'Data Test' as check_type,
    'event_log' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Test data created successfully'
        ELSE '❌ No test data found'
    END as result
FROM audit.event_log 
WHERE correlation_id = 'test-verification-123';

-- Show recent audit logs (last 5 minutes)
SELECT 
    'Recent Logs' as check_type,
    'access_log' as table_name,
    action,
    result,
    request_id,
    occurred_at_utc
FROM audit.access_log 
WHERE occurred_at_utc > NOW() - INTERVAL '5 minutes'
ORDER BY occurred_at_utc DESC
LIMIT 5;

SELECT 
    'Recent Logs' as check_type,
    'event_log' as table_name,
    action,
    resource,
    actor_role,
    result,
    correlation_id,
    occurred_at_utc
FROM audit.event_log 
WHERE occurred_at_utc > NOW() - INTERVAL '5 minutes'
ORDER BY occurred_at_utc DESC
LIMIT 5;
