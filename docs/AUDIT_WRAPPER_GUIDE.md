# Audit Wrapper Guide

## Overview

The audit wrapper provides a simple, reusable way to instrument API route handlers with automatic access logging. It ensures every handled request logs an `audit.access_log` entry with consistent request tracking, IP extraction, and latency measurement.

## Features

- ✅ **Simple Integration**: Apply with 1-2 lines of code
- ✅ **Automatic Request ID**: Uses existing headers or generates UUID
- ✅ **IP Extraction**: Handles x-forwarded-for, x-real-ip headers
- ✅ **Latency Measurement**: Tracks response time in milliseconds
- ✅ **Consistent Naming**: Standardized action and resource naming
- ✅ **Fire-and-Forget**: Never blocks responses or throws errors
- ✅ **Opt-out Support**: Easy configuration to skip logging
- ✅ **Request ID Propagation**: Exposes request ID for correlation

## Quick Start

### Basic Usage

```typescript
import { withAuditLogging } from '@/app/lib/audit-wrapper';
import { NextRequest, NextResponse } from 'next/server';

async function handlePOST(request: NextRequest) {
  // Your existing handler logic
  return NextResponse.json({ success: true });
}

// Apply audit logging
export const POST = withAuditLogging(handlePOST);
```

### With Custom Configuration

```typescript
export const POST = withAuditLogging(handlePOST, {
  resource: 'custom-resource',
  action: 'custom:action'
});
```

### Skip Logging

```typescript
export const GET = withAuditLogging(handleGET, {
  skipLogging: true
});
```

## API Reference

### withAuditLogging(handler, config?)

Wraps an API route handler with automatic audit logging.

**Parameters:**
- `handler`: The original route handler function
- `config`: Optional configuration object

**Returns:** Wrapped handler function

### AuditConfig

```typescript
interface AuditConfig {
  skipLogging?: boolean;    // Skip audit logging for this route
  resource?: string;        // Custom resource name
  action?: string;          // Custom action name
}
```

### Helper Functions

#### getRequestId(request: NextRequest): string

Extract or generate request ID from the request.

```typescript
import { getRequestId } from '@/app/lib/audit-wrapper';

async function handlePOST(request: NextRequest) {
  const requestId = getRequestId(request);
  // Use requestId as correlation_id in logEvent()
}
```

#### formatAction(method: string, path: string): string

Format action name consistently.

```typescript
formatAction('POST', '/api/register') // Returns: "api:POST /api/register"
```

#### formatResource(path: string): string

Format resource name from path.

```typescript
formatResource('/api/admin/registrations/[id]/approve') // Returns: "admin/approve"
formatResource('/api/register') // Returns: "register"
```

## Naming Conventions

### Action Names

Default format: `api:{METHOD} {PATH}`

Examples:
- `api:POST /api/register`
- `api:GET /api/admin/registrations`
- `api:PUT /api/admin/registrations/[id]/approve`

### Resource Names

Default format: Extracted from path

Examples:
- `/api/register` → `registration`
- `/api/admin/registrations/[id]/approve` → `admin/approve`
- `/api/admin/users` → `admin/users`

## Request ID Handling

The wrapper automatically handles request IDs:

1. **Existing Headers**: Checks `x-request-id` or `x-correlation-id`
2. **Generation**: Creates new UUID if no header found
3. **Propagation**: Adds `x-request-id` to response headers
4. **Access**: Use `getRequestId()` to access in handlers

## IP Address Extraction

The wrapper extracts client IP in this order:

1. `x-forwarded-for` (first item)
2. `x-real-ip`
3. Socket IP (not available in Next.js App Router)

## Error Handling

The wrapper is designed to be fire-and-forget:

- **Never throws**: All errors are caught and logged in development
- **Non-blocking**: Failed logging doesn't affect response
- **Graceful degradation**: System continues working if audit fails
- **Development logging**: Errors only logged in development mode

## Integration Examples

### Registration Endpoint

```typescript
import { withAuditLogging, getRequestId } from '@/app/lib/audit-wrapper';

async function handlePOST(request: NextRequest) {
  const requestId = getRequestId(request);
  
  // Your registration logic
  const result = await processRegistration(request);
  
  // Use requestId for event correlation
  await logEvent({
    action: 'registration_created',
    resource: 'registration',
    correlation_id: requestId, // Reuse request ID
    registration_id: result.id
  });
  
  return NextResponse.json(result);
}

export const POST = withAuditLogging(handlePOST, {
  resource: 'registration'
});
```

### Admin Action Endpoint

```typescript
async function handlePOST(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  
  // Admin authentication and action
  const result = await approveRegistration(params.id);
  
  // Log admin action
  await logEvent({
    action: 'registration_approved',
    resource: 'registration',
    correlation_id: requestId,
    admin_email: user.email,
    registration_id: params.id
  });
  
  return NextResponse.json(result);
}

export const POST = withAuditLogging(handlePOST, {
  resource: 'admin/approve'
});
```

### Health Check (Skip Logging)

```typescript
async function handleGET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' });
}

export const GET = withAuditLogging(handleGET, {
  skipLogging: true
});
```

## Configuration

### Skip Audit Paths

The wrapper includes a predefined list of paths that should skip audit logging:

```typescript
export const SKIP_AUDIT_PATHS = [
  '/api/health',
  '/api/diag',
  '/api/_diag',
  '/api/test',
  '/api/debug',
  '/api/test-diagnostic',
  '/api/test-email',
  '/api/test-badge',
  '/api/fix-timezone'
];
```

### Check Skip Paths

```typescript
import { shouldSkipAudit } from '@/app/lib/audit-wrapper';

if (shouldSkipAudit(request.nextUrl.pathname)) {
  // Skip audit logging for this path
}
```

## Testing

### Test Endpoint

Use the test endpoint to verify audit logging:

```bash
# Test GET request
curl http://localhost:8080/api/test-audit

# Test POST request
curl -X POST http://localhost:8080/api/test-audit \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test error response
curl -X PUT http://localhost:8080/api/test-audit

# Test server error
curl -X DELETE http://localhost:8080/api/test-audit
```

### Verification Queries

After testing, verify in Supabase:

```sql
-- Check recent access logs
SELECT action, resource, result, request_id,
       occurred_at_utc at time zone 'Asia/Bangkok' as th_time,
       src_ip, user_agent, latency_ms
FROM audit.access_log
ORDER BY occurred_at_utc DESC
LIMIT 10;

-- Check specific endpoint
SELECT action, resource, result, request_id, latency_ms
FROM audit.access_log
WHERE path = '/api/test-audit'
ORDER BY occurred_at_utc DESC
LIMIT 5;
```

## Migration Guide

### From Direct Response Objects

**Before:**
```typescript
export async function POST(req: Request) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**After:**
```typescript
async function handlePOST(req: NextRequest) {
  return NextResponse.json(data);
}

export const POST = withAuditLogging(handlePOST);
```

### From Existing Handlers

1. **Import the wrapper**:
   ```typescript
   import { withAuditLogging, getRequestId } from '@/app/lib/audit-wrapper';
   ```

2. **Convert to NextRequest**:
   ```typescript
   // Change from Request to NextRequest
   async function handlePOST(request: NextRequest) {
   ```

3. **Use NextResponse**:
   ```typescript
   // Change from new Response() to NextResponse.json()
   return NextResponse.json(data, { status: 200 });
   ```

4. **Apply wrapper**:
   ```typescript
   export const POST = withAuditLogging(handlePOST, {
     resource: 'your-resource'
   });
   ```

## Best Practices

1. **Consistent Resource Names**: Use descriptive, consistent resource names
2. **Request ID Correlation**: Reuse request ID as correlation ID in event logs
3. **Skip Health Checks**: Don't log health check and diagnostic endpoints
4. **Custom Actions**: Use custom actions for complex operations
5. **Error Handling**: Let the wrapper handle audit errors gracefully
6. **Performance**: Monitor that logging doesn't impact response times

## Troubleshooting

### Common Issues

1. **Type Errors**: Ensure using `NextRequest` instead of `Request`
2. **Missing Exports**: Check that wrapped handlers are properly exported
3. **No Logs**: Verify RPC functions exist in Supabase
4. **Performance Impact**: Monitor response times with and without logging

### Debug Mode

Enable debug logging in development:

```typescript
// The wrapper automatically logs in development mode
// Check console for audit-related messages
```

### Verification Checklist

- [ ] Request ID is generated and propagated
- [ ] IP address is extracted correctly
- [ ] Latency is measured accurately
- [ ] Action and resource names are consistent
- [ ] Error responses are logged
- [ ] Skip paths work correctly
- [ ] No performance impact on responses

---

**Last Updated**: 2025-01-27  
**Version**: 1.0.0
