# Audit Schema Troubleshooting Guide

## Current Issue

The diagnostic test shows that the audit tables are not accessible:
```json
{
  "tables": {
    "access_log": false,
    "event_log": false
  }
}
```

**ROOT CAUSE IDENTIFIED**: The audit schema tables exist, but the **RPC functions** (`audit.log_access` and `audit.log_event`) are missing, causing 404 errors when the application tries to log audit events.

**Error from E2E tests**:
```
Could not find the function audit.log_access(p) in the schema cache
Could not find the function audit.log_event(p) in the schema cache
```

## Step-by-Step Resolution

### 1. Verify Schema Creation

Run this in Supabase SQL Editor to check if the schema was created properly:

```sql
-- Check if audit schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'audit';

-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'audit';

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'audit' AND table_name = 'access_log'
ORDER BY ordinal_position;
```

### 2. Check Permissions

Run this to verify permissions:

```sql
-- Check permissions for service_role
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants 
WHERE table_schema = 'audit' AND grantee = 'service_role';

-- Check permissions for authenticated users
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants 
WHERE table_schema = 'audit' AND grantee = 'authenticated';
```

### 3. Create Missing RPC Functions

**This is the critical fix!** Run this script to create the missing RPC functions:

```sql
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
```

### 4. Test Schema Access

After running the setup script, test with this:

```sql
-- Test insert into access_log
INSERT INTO audit.access_log (
    action, method, resource, result, request_id, src_ip, user_agent, latency_ms, meta
) VALUES (
    'test', 'GET', '/test', '200', 'test-123', '127.0.0.1', 'test-agent', 100, '{"test": true}'::jsonb
);

-- Test insert into event_log
INSERT INTO audit.event_log (
    action, resource, actor_role, result, correlation_id, meta
) VALUES (
    'TestEvent', 'Test', 'system', 'success', 'test-123', '{"test": true}'::jsonb
);

-- Verify inserts
SELECT COUNT(*) FROM audit.access_log;
SELECT COUNT(*) FROM audit.event_log;
```

### 5. Environment Variables Check

Ensure your `.env.local` has the correct service role key:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # This is crucial!
```

### 6. Restart Development Server

After making changes:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### 7. Test the Fix

After completing the above steps:

```bash
# Test the diagnostic endpoint
curl -X GET http://localhost:8080/api/diag/audit-schema-test

# Test audit logging
curl -X GET http://localhost:8080/api/diag/audit-smoke -H "X-Request-ID: test-123"

# Check the dashboard
# Navigate to /admin/audit
```

## Expected Results

After fixing the permissions:

```json
{
  "ok": true,
  "results": {
    "tables": {
      "access_log": true,
      "event_log": true
    },
    "table_access": {
      "access_log": true,
      "event_log": true
    },
    "insert_test": true
  }
}
```

## Common Issues

1. **Service Role Key Missing**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
2. **Incorrect Permissions**: The service_role needs ALL permissions on audit tables
3. **RLS Policies**: Make sure policies allow service_role access
4. **Schema Not Created**: Verify the schema creation script ran successfully

## Next Steps

1. Run the complete setup script above
2. Verify permissions are correct
3. Restart your development server
4. Test the diagnostic endpoint
5. Check the audit dashboard

If you still have issues after following these steps, please share the output of the diagnostic endpoint and any error messages you see.
