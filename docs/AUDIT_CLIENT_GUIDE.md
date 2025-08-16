# Audit Client Guide

## Overview

The audit client provides secure, server-only logging to Supabase using RPC functions `log_access` and `log_event`. It's designed to be fire-and-forget, never blocking request flow, and ensures the service role key never appears in client bundles.

## Features

- ✅ **Server-only**: Uses service role key, never bundled in client
- ✅ **Fire-and-forget**: Never throws, swallows errors gracefully
- ✅ **Type-safe**: Full TypeScript support with proper types
- ✅ **RPC-based**: Uses Supabase RPC functions for secure logging
- ✅ **Request correlation**: Supports request_id and correlation_id tracking
- ✅ **Minimal metadata**: Avoids raw PII, prefers hashed/masked data

## Installation

The audit client is already included in the project. No additional installation required.

## Environment Variables

Ensure these environment variables are set:

```bash
# Required for audit client
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage

### Basic Import

```typescript
import { logAccess, logEvent } from '@/app/lib/audit-client';
```

### Logging Access Events

```typescript
await logAccess({
  action: 'user_login',
  request_id: 'req-123456789',
  user_agent: 'Mozilla/5.0...',
  ip_address: '192.168.1.1',
  path: '/admin/dashboard',
  method: 'GET',
  status_code: 200,
  response_time_ms: 150,
  metadata: {
    user_type: 'admin',
    session_id: 'sess-123'
  }
});
```

### Logging Domain Events

```typescript
await logEvent({
  action: 'registration_approved',
  resource: 'registration',
  correlation_id: 'corr-123456789',
  user_id: 'user-123',
  admin_email: 'admin@example.com',
  registration_id: 'YEC-1234567890-abc12345',
  before_state: { status: 'waiting_for_review' },
  after_state: { status: 'approved' },
  metadata: {
    approval_reason: 'All documents verified',
    badge_generated: true
  }
});
```

## API Reference

### logAccess(input: LogAccessInput)

Logs access events using the `log_access` RPC function.

**Parameters:**
- `action` (string, required): The action being performed
- `request_id` (string, required): Unique request identifier
- `user_agent` (string, optional): User agent string
- `ip_address` (string, optional): Client IP address
- `path` (string, optional): Request path
- `method` (string, optional): HTTP method
- `status_code` (number, optional): HTTP status code
- `response_time_ms` (number, optional): Response time in milliseconds
- `metadata` (object, optional): Additional metadata

### logEvent(input: LogEventInput)

Logs domain events using the `log_event` RPC function.

**Parameters:**
- `action` (string, required): The action being performed
- `resource` (string, required): The resource being acted upon
- `correlation_id` (string, required): Unique correlation identifier
- `user_id` (string, optional): User identifier
- `admin_email` (string, optional): Admin email for admin actions
- `registration_id` (string, optional): Registration identifier
- `before_state` (object, optional): Previous state
- `after_state` (object, optional): New state
- `metadata` (object, optional): Additional metadata

## Error Handling

The audit client is designed to be fire-and-forget:

- **Never throws**: All errors are caught and logged in development
- **Silent in production**: Errors are not logged in production
- **Non-blocking**: Failed logging doesn't affect request flow
- **Graceful degradation**: System continues working even if audit fails

## Testing

### Smoke Test Endpoint

Test the audit client via HTTP:

```bash
curl http://localhost:8080/api/diag/audit-smoke
```

### Manual Testing

Run the test script:

```bash
node scripts/test-audit.js
```

### Verification Queries

After running tests, verify in Supabase:

```sql
-- Check access logs
SELECT action, request_id, occurred_at_utc at time zone 'Asia/Bangkok' as th_time
FROM audit.access_log
ORDER BY occurred_at_utc DESC
LIMIT 5;

-- Check event logs
SELECT action, resource, correlation_id, occurred_at_utc at time zone 'Asia/Bangkok' as th_time
FROM audit.event_log
ORDER BY occurred_at_utc DESC
LIMIT 5;
```

## Integration Examples

### Middleware Integration

```typescript
// In middleware.ts
import { logAccess } from '@/app/lib/audit-client';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();
  
  // ... existing middleware logic ...
  
  // Log access after response
  logAccess({
    action: 'page_access',
    request_id: requestId,
    user_agent: request.headers.get('user-agent'),
    ip_address: request.headers.get('x-forwarded-for') || request.ip,
    path: request.nextUrl.pathname,
    method: request.method,
    status_code: 200,
    response_time_ms: Date.now() - startTime
  });
}
```

### API Route Integration

```typescript
// In API route
import { logEvent } from '@/app/lib/audit-client';

export async function POST(request: Request) {
  const correlationId = randomUUID();
  
  try {
    // ... business logic ...
    
    // Log successful operation
    logEvent({
      action: 'registration_created',
      resource: 'registration',
      correlation_id: correlationId,
      registration_id: registration.registration_id,
      after_state: registration
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error
    logEvent({
      action: 'registration_failed',
      resource: 'registration',
      correlation_id: correlationId,
      metadata: { error: error.message }
    });
    
    throw error;
  }
}
```

### Event Handler Integration

```typescript
// In event handler
import { logEvent } from '@/app/lib/audit-client';

export class AuditLogHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    logEvent({
      action: event.type,
      resource: 'registration',
      correlation_id: event.id,
      admin_email: event.payload.adminEmail,
      registration_id: event.payload.registration.registration_id,
      before_state: event.payload.registration,
      after_state: { ...event.payload.registration, status: newStatus }
    });
  }
}
```

## Security Considerations

### Service Role Key Protection

- ✅ **Server-only**: Service role key only used in server-side code
- ✅ **No client bundling**: Import path prevents client inclusion
- ✅ **Environment variables**: Keys stored in server environment only
- ✅ **RPC functions**: Database operations through secure RPC calls

### Data Privacy

- ✅ **Minimal metadata**: Avoid raw PII in logs
- ✅ **Hashed identifiers**: Use hashed user IDs when possible
- ✅ **Masked data**: Sensitive data should be masked upstream
- ✅ **UTC timestamps**: All timestamps stored in UTC

### Error Handling

- ✅ **No sensitive data in errors**: Error messages don't expose secrets
- ✅ **Development-only logging**: Sensitive errors only logged in dev
- ✅ **Graceful degradation**: System continues working if audit fails

## Database Schema

The audit client expects these RPC functions to exist in Supabase:

### log_access RPC

```sql
CREATE OR REPLACE FUNCTION log_access(
  p_action TEXT,
  p_request_id TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_path TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit.access_log (
    action,
    request_id,
    user_agent,
    ip_address,
    path,
    method,
    status_code,
    response_time_ms,
    metadata,
    occurred_at_utc
  ) VALUES (
    p_action,
    p_request_id,
    p_user_agent,
    p_ip_address,
    p_path,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_metadata,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;
```

### log_event RPC

```sql
CREATE OR REPLACE FUNCTION log_event(
  p_action TEXT,
  p_resource TEXT,
  p_correlation_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL,
  p_registration_id TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit.event_log (
    action,
    resource,
    correlation_id,
    user_id,
    admin_email,
    registration_id,
    before_state,
    after_state,
    metadata,
    occurred_at_utc
  ) VALUES (
    p_action,
    p_resource,
    p_correlation_id,
    p_user_id,
    p_admin_email,
    p_registration_id,
    p_before_state,
    p_after_state,
    p_metadata,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;
```

## Troubleshooting

### Common Issues

1. **Missing environment variables**
   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Check that variables are available in server environment

2. **RPC function not found**
   - Verify RPC functions exist in Supabase
   - Check function names match exactly: `log_access`, `log_event`

3. **Permission denied**
   - Ensure service role key has permission to call RPC functions
   - Check RPC function permissions in Supabase

4. **No logs appearing**
   - Check development console for warnings
   - Verify RPC functions are working in Supabase
   - Check audit tables exist and are accessible

### Debug Mode

Enable debug logging in development:

```typescript
// The client automatically logs in development mode
// Check console for audit-related messages
```

## Best Practices

1. **Use meaningful actions**: Choose descriptive action names
2. **Include correlation IDs**: Link related events together
3. **Minimize metadata**: Only include necessary information
4. **Test thoroughly**: Verify logging works in your environment
5. **Monitor performance**: Ensure logging doesn't impact response times
6. **Review logs regularly**: Check audit logs for security and compliance

## Migration from Existing Audit

If migrating from existing audit logging:

1. **Replace direct database calls** with audit client functions
2. **Update event handlers** to use new logging methods
3. **Test thoroughly** to ensure no logging is lost
4. **Monitor performance** to ensure no impact on response times
5. **Verify data integrity** by comparing old and new logs

---

**Last Updated**: 2025-01-27  
**Version**: 1.0.0
