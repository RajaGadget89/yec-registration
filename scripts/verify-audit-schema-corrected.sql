-- Verification script for audit schema (CORRECTED VERSION)
-- Run this after creating the audit schema to verify everything is working

-- Check if audit schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'audit';

-- Check if audit tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'audit' ORDER BY table_name;

-- Check if audit functions exist
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'audit' ORDER BY routine_name;

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

-- Test the log_event function (using TEXT for actor_id, not UUID)
SELECT audit.log_event('{
  "action": "TestEvent",
  "resource": "Test",
  "resource_id": "test-123",
  "actor_id": "test-user-id",  -- TEXT value, not UUID
  "actor_role": "system",
  "result": "success",
  "reason": "verification",
  "correlation_id": "test-verification-123",
  "meta": {"test": true}
}'::jsonb);

-- Check if the test logs were created
SELECT 
  'access_log' as table_name,
  COUNT(*) as row_count
FROM audit.access_log 
WHERE request_id = 'test-verification-123'
UNION ALL
SELECT 
  'event_log' as table_name,
  COUNT(*) as row_count
FROM audit.event_log 
WHERE correlation_id = 'test-verification-123';

-- Show recent audit logs (last 5 minutes)
SELECT 
  'access_log' as table_name,
  action,
  resource,
  result,
  request_id,
  occurred_at_utc
FROM audit.access_log 
WHERE occurred_at_utc > NOW() - INTERVAL '5 minutes'
ORDER BY occurred_at_utc DESC
LIMIT 5;

SELECT 
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
