# Audit Logging System Knowledge Base

## Overview

This document serves as a comprehensive knowledge base for the YEC Registration System's audit logging implementation. It covers the complete audit system architecture, implementation details, troubleshooting guides, and lessons learned from the development process.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Implementation Components](#implementation-components)
3. [Correlation ID Management](#correlation-id-management)
4. [E2E Testing Strategy](#e2e-testing-strategy)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)
8. [Performance Considerations](#performance-considerations)
9. [Security Considerations](#security-considerations)
10. [Production Deployment](#production-deployment)

## System Architecture

### Core Components

The audit logging system consists of several key components working together:

1. **Audit Client** (`app/lib/audit/auditClient.ts`)
   - Server-only client for calling Supabase RPC functions
   - Handles `logAccess` and `logEvent` operations
   - Uses service role key for secure database access

2. **Request Context** (`app/lib/audit/requestContext.ts`)
   - AsyncLocalStorage-based context propagation
   - Manages correlation ID across async operations
   - Provides fallback UUID generation

3. **Audit Wrapper** (`app/lib/audit/withAuditAccess.ts`)
   - Higher-order function for API route instrumentation
   - Automatically logs access events
   - Sets x-request-id response headers

4. **Audit Domain Handler** (`app/lib/events/handlers/auditDomainHandler.ts`)
   - Event subscriber for domain event translation
   - Converts domain events to audit events
   - Ensures PII safety and correlation consistency

### Data Flow

```
HTTP Request → Audit Wrapper → Request Context → Domain Events → Audit Domain Handler → Supabase RPC
     ↓              ↓              ↓                ↓                    ↓                ↓
  x-request-id   logAccess    correlation_id   event emission    logEvent calls    audit tables
```

## Implementation Components

### 1. Audit Client

**Purpose**: Secure server-only client for audit operations

**Key Features**:
- Node.js runtime only (prevents client-side exposure)
- Service role key authentication
- Fire-and-forget design
- Comprehensive error handling

**Usage**:
```typescript
import { logAccess, logEvent } from '@/lib/audit/auditClient';

// Log access event
await logAccess({
  action: 'api:POST /api/register',
  resource: 'api',
  result: '200',
  request_id: 'uuid-here'
});

// Log domain event
await logEvent({
  action: 'RegisterSubmitted',
  resource: 'User',
  actor_role: 'user',
  result: 'success',
  correlation_id: 'uuid-here',
  meta: { emailMasked: 'us**@example.com' }
});
```

### 2. Request Context

**Purpose**: Propagate correlation ID across async operations

**Key Features**:
- AsyncLocalStorage-based context
- Automatic UUID fallback
- Request-scoped correlation

**Usage**:
```typescript
import { getRequestId, withRequestContext } from '@/lib/audit/requestContext';

// Get current correlation ID
const correlationId = getRequestId();

// Wrap async operations
await withRequestContext(correlationId, async () => {
  // All operations within this scope share the same correlation ID
});
```

### 3. Audit Wrapper

**Purpose**: Automatic API route instrumentation

**Key Features**:
- Simple integration (1-2 lines of code)
- Automatic request ID extraction
- IP address and user agent logging
- Latency measurement

**Usage**:
```typescript
import { withAuditLogging } from '@/lib/audit/withAuditAccess';

async function handler(request: NextRequest): Promise<NextResponse> {
  // Your route logic here
  return NextResponse.json({ success: true });
}

export const POST = withAuditLogging(handler);
```

### 4. Audit Domain Handler

**Purpose**: Translate domain events to audit events

**Key Features**:
- Event-driven architecture
- PII safety enforcement
- Correlation ID consistency
- Comprehensive event mapping

**Event Mapping**:
- `RegisterSubmitted` → User resource, actor_role: user
- `RegistrationCreated` → Registration resource, actor_role: system
- `StatusChanged` → Registration resource, actor_role: system
- `LoginSubmitted` → User resource, actor_role: user
- `LoginSucceeded` → User resource, actor_role: system

## Correlation ID Management

### The Critical Issue

The most challenging aspect of the audit system was ensuring consistent correlation between request IDs and event correlation IDs.

### Problem Description

**Issue**: Playwright E2E tests were failing because `request_id` ≠ `correlation_id` in audit logs.

**Root Cause**: 
1. Playwright tests not sending `X-Request-ID` headers
2. Registration endpoint generating its own correlation ID
3. AsyncLocalStorage context not reliably propagating to async event emissions

### Solution Implementation

#### 1. Fixed Request ID Propagation

**Before**:
```typescript
// Test was not sending request ID
const response = await request.post('/api/register', {
  data: testContext.registrationData
});
```

**After**:
```typescript
// Test explicitly sends request ID
const response = await request.post('/api/register', {
  data: testContext.registrationData,
  headers: {
    'X-Request-ID': testContext.testId
  }
});
```

#### 2. Enhanced Registration Endpoint

**Before**:
```typescript
// No explicit request ID capture
await EventService.emitRegistrationSubmitted(registrationRecord);
```

**After**:
```typescript
// Explicit request ID capture and propagation
const requestId = req.headers.get('x-request-id') || 
                 req.headers.get('x-correlation-id') || 
                 `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

await EventService.emitRegistrationSubmitted(registrationRecord, undefined, requestId);
```

#### 3. Improved Event Service

**Before**:
```typescript
static async emitRegistrationSubmitted(registration: any, adminEmail?: string) {
  const event = EventFactory.createRegistrationSubmitted(registration, adminEmail);
  return await this.emitEvent(event);
}
```

**After**:
```typescript
static async emitRegistrationSubmitted(
  registration: any,
  adminEmail?: string,
  requestId?: string
) {
  const event = EventFactory.createRegistrationSubmitted(registration, adminEmail);
  if (requestId) {
    event.metadata = { ...event.metadata, requestId };
  }
  return await this.emitEvent(event);
}
```

#### 4. Fixed Audit Domain Handler

**Before**:
```typescript
const correlationId = getRequestId(); // Always used AsyncLocalStorage
```

**After**:
```typescript
const correlationId = event.metadata?.requestId || getRequestId(); // Prioritize event metadata
```

### Key Lessons Learned

1. **Explicit is Better Than Implicit**: Always explicitly pass correlation IDs rather than relying on context
2. **AsyncLocalStorage Limitations**: Context doesn't always propagate to async event emissions
3. **Test Headers Matter**: E2E tests must explicitly set request headers for proper correlation
4. **Event Metadata is Reliable**: Storing correlation ID in event metadata is more reliable than context

## E2E Testing Strategy

### Test Structure

The audit system uses a comprehensive E2E testing strategy:

1. **Diagnostic Tests** (`@audit @diag`)
   - Isolated endpoint testing
   - Basic audit plumbing verification
   - 1 access log + 1 event log expected

2. **Registration Tests** (`@audit @registration`)
   - Complete registration flow testing
   - 1 access log + 3 event logs expected
   - Events: RegisterSubmitted, RegistrationCreated, StatusChanged

3. **Login Tests** (`@audit @login`)
   - Complete login flow testing
   - 1 access log + 2 event logs expected
   - Events: LoginSubmitted, LoginSucceeded

### Test Infrastructure

#### Supabase Test Client

```typescript
// Secure database operations
const supabaseTestClient = new SupabaseTestClient();

// Query audit logs
const accessLogs = await supabaseTestClient.getAccessLogsByRequestId(requestId);
const eventLogs = await supabaseTestClient.getEventLogsByCorrelationId(requestId);
```

#### Log Polling

```typescript
// Wait for audit logs with retry logic
const { accessLogs, eventLogs } = await waitForLogs(requestId, expectedAccess, expectedEvents);
```

#### Test Data Generation

```typescript
// PII-safe test data
const testContext = createTestContext('test-tag');
```

### Test Commands

```bash
# Run all audit tests
npx playwright test -g "@audit" --reporter=line --timeout=60000

# Run specific test categories
npx playwright test -g "@audit @registration" --reporter=line
npx playwright test -g "@audit @login" --reporter=line
npx playwright test -g "@audit @diag" --reporter=line
```

## Troubleshooting Guide

### Common Issues

#### 1. Tests Timing Out Waiting for Audit Logs

**Symptoms**:
- `Timeout waiting for audit logs. Expected: 1 access, 3 events`
- `[poll] access rows=0; events rows=0`

**Causes**:
- Correlation ID mismatch
- Missing request ID headers
- Database schema issues
- Environment variable problems

**Solutions**:
1. Check request ID propagation in tests
2. Verify X-Request-ID headers are set
3. Confirm database schema exists
4. Validate environment variables

#### 2. Correlation ID Mismatch

**Symptoms**:
- `request_id` ≠ `correlation_id` in audit logs
- Tests finding access logs but not event logs

**Causes**:
- AsyncLocalStorage context not propagating
- Event emission happening outside request context
- Missing explicit correlation ID passing

**Solutions**:
1. Use explicit request ID passing in event service
2. Store correlation ID in event metadata
3. Prioritize event metadata over context in audit handler

#### 3. Environment Variable Issues

**Symptoms**:
- `Missing Supabase environment variables for audit client`
- RPC calls failing

**Causes**:
- Environment variables not loaded in test environment
- Missing .env.local file
- Incorrect variable names

**Solutions**:
1. Add `import 'dotenv/config'` to test files
2. Ensure .env.local exists with correct variables
3. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set

#### 4. Database Schema Issues

**Symptoms**:
- `relation "audit.access_log" does not exist`
- RPC function errors

**Causes**:
- Audit schema not created in database
- Missing RPC functions
- Incorrect table names

**Solutions**:
1. Run audit schema creation script
2. Verify RPC functions exist
3. Check table names and permissions

### Debug Commands

```bash
# Test database connectivity
node test-supabase-debug.js

# Test audit schema
node test-audit-tables.js

# Test audit endpoints
curl -X GET "http://localhost:8080/api/diag/audit-rpc" -H "X-Request-ID: test-123"

# Check recent audit logs
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'audit' } });
client.from('access_log').select('*').order('occurred_at_utc', { ascending: false }).limit(5).then(console.log);
"
```

## Best Practices

### 1. Request ID Management

- Always explicitly pass request IDs in tests
- Use consistent header names (`X-Request-ID`)
- Validate request ID propagation in responses

### 2. Event Correlation

- Store correlation ID in event metadata
- Prioritize explicit correlation over context
- Ensure correlation consistency across all events

### 3. PII Safety

- Never log raw email addresses or phone numbers
- Use masking patterns (e.g., `us**@example.com`)
- Validate PII safety in tests

### 4. Error Handling

- Use fire-and-forget design for audit logging
- Never let audit failures impact user responses
- Log errors in development mode only

### 5. Testing

- Use unique test identifiers
- Clean up test data after tests
- Validate both access and event logs
- Test correlation ID consistency

## Common Pitfalls

### 1. AsyncLocalStorage Context Loss

**Problem**: Context doesn't propagate to async event emissions

**Solution**: Use explicit correlation ID passing in event metadata

### 2. Missing Request Headers

**Problem**: Tests not sending X-Request-ID headers

**Solution**: Always explicitly set headers in Playwright tests

### 3. Timezone Issues

**Problem**: Database timestamps in UTC+7, tests in UTC

**Solution**: Remove time-based filtering, rely on request_id only

### 4. Environment Variable Loading

**Problem**: Environment variables not loaded in test environment

**Solution**: Add dotenv loading to test files and audit client

### 5. Schema Mismatches

**Problem**: Tests querying wrong schema or table names

**Solution**: Use correct schema references (`audit.access_log`, `audit.event_log`)

## Performance Considerations

### 1. Fire-and-Forget Design

- Audit logging never blocks user responses
- Async operations for all audit calls
- Graceful error handling

### 2. Database Optimization

- Use indexed columns for querying (request_id, correlation_id)
- Avoid time-based filtering when possible
- Use appropriate timeouts for polling

### 3. Memory Management

- Clean up test data after tests
- Use unique identifiers to prevent conflicts
- Limit query result sets

## Security Considerations

### 1. Service Role Key Protection

- Never expose service role key in client bundles
- Use Node.js runtime for audit operations
- Validate environment variable loading

### 2. PII Protection

- Automatic email and phone masking
- No raw PII in audit logs
- Validation in tests

### 3. Access Control

- Audit logs in separate schema
- Proper database permissions
- Service role key for audit operations only

## Production Deployment

### 1. Environment Setup

```bash
# Required environment variables
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Schema

Run the audit schema creation script in Supabase SQL Editor:

```sql
-- Create audit schema and tables
-- (See scripts/create-audit-schema.sql)
```

### 3. Verification

```bash
# Run all audit tests
npx playwright test -g "@audit" --reporter=line

# Verify audit endpoints
curl -X GET "https://your-domain.com/api/diag/audit-rpc" -H "X-Request-ID: test-123"
```

### 4. Monitoring

- Monitor audit log volume
- Check for failed RPC calls
- Validate correlation ID consistency
- Monitor PII safety compliance

## Conclusion

The audit logging system is now production-ready with comprehensive E2E test coverage. The key success factors were:

1. **Explicit correlation ID management**
2. **Comprehensive E2E testing**
3. **PII safety enforcement**
4. **Fire-and-forget design**
5. **Proper error handling**

The system provides complete audit trails for all user actions while maintaining performance and security standards.

---

## Quick Reference

### Test Commands
```bash
npx playwright test -g "@audit" --reporter=line --timeout=60000
```

### Key Files
- `app/lib/audit/auditClient.ts` - Audit client
- `app/lib/audit/withAuditAccess.ts` - Audit wrapper
- `app/lib/events/handlers/auditDomainHandler.ts` - Event handler
- `tests/e2e/audit.e2e.spec.ts` - Registration tests
- `tests/e2e/audit-login.e2e.spec.ts` - Login tests

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for audit operations

### Database Tables
- `audit.access_log` - API access logs
- `audit.event_log` - Domain event logs

### RPC Functions
- `log_access` - Log API access events
- `log_event` - Log domain events
