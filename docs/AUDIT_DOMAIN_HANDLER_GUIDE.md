# Audit Domain Handler Guide

## Overview

The audit domain handler translates domain events to `logEvent()` calls, ensuring proper correlation with request IDs and PII-safe logging. It provides a comprehensive audit trail for all important workflow transitions in the YEC Registration System.

## Features

- ✅ **Event Translation**: Converts domain events to standardized audit events
- ✅ **Request Correlation**: Uses request_id as correlation_id for coherent audit chains
- ✅ **PII Safety**: Masks sensitive data (emails, phone numbers) automatically
- ✅ **Fire-and-Forget**: Never throws, swallows errors gracefully
- ✅ **Idempotent**: Handles duplicate events safely
- ✅ **Comprehensive Coverage**: Logs all major workflow transitions

## Event Mapping

The handler maps domain events to audit events as follows:

### 1. RegisterSubmitted
**Domain Event**: `registration.submitted`
**Audit Events**:
- `RegisterSubmitted` (User resource)
- `RegistrationCreated` (Registration resource)
- `StatusChanged` (waiting_for_review)

### 2. RegistrationCreated
**Domain Event**: `registration.batch_upserted`
**Audit Events**:
- `RegistrationCreated` (Registration resource)
- `StatusChanged` for each registration

### 3. StatusChanged
**Domain Events**: All status transitions
**Audit Events**:
- `StatusChanged` with appropriate status values:
  - `WaitingReview`
  - `WaitingUserUpdatePayment`
  - `WaitingUserUpdateProfile`
  - `WaitingUserUpdateTccCard`
  - `Accepted`
  - `Rejected`

### 4. AdminReviewed
**Domain Events**: `admin.request_update`, `admin.approved`, `admin.rejected`
**Audit Events**:
- `AdminReviewed` with decision and reason
- `StatusChanged` with new status

### 5. DocumentReuploaded
**Domain Event**: (Future implementation)
**Audit Events**:
- `DocumentReuploaded` with document type

### 6. BadgeIssued
**Domain Event**: `admin.approved` (when badge exists)
**Audit Events**:
- `BadgeIssued` (Badge resource)

## PII Safety

The handler automatically masks sensitive data:

### Email Masking
```typescript
// Input: "user@example.com"
// Output: "us**@example.com"

// Input: "a@example.com"
// Output: "**@example.com"
```

### Phone Masking
```typescript
// Input: "0812345678"
// Output: "08******78"

// Input: "+66812345678"
// Output: "+6******78"
```

### Safe Data Extraction
Only non-sensitive fields are included in audit logs:
- `registration_id`
- `status`
- `yec_province`
- `business_type`
- `hotel_choice`
- `travel_type`
- `created_at`
- `updated_at`

## Request Correlation

The handler uses request context to maintain correlation:

### API Routes
```typescript
// Request context is automatically set by audit wrapper
const requestContext = createRequestContext(request);
await withRequestContext(requestContext, async () => {
  // All events in this context will use the same correlation_id
  await EventService.emitRegistrationSubmitted(registration);
});
```

### Background Jobs
```typescript
// Set correlation ID for background jobs
setBackgroundContext(correlationId, adminEmail);
await EventService.emitAdminApproved(registration, adminEmail);
```

## Implementation Details

### Request Context System

The system uses AsyncLocalStorage to maintain request context:

```typescript
// Get current correlation ID
const correlationId = getCurrentCorrelationId();

// Get current admin email
const adminEmail = getCurrentAdminEmail();
```

### Event Handler Registration

The audit domain handler is automatically registered for all event types:

```typescript
// In eventBus.ts
const auditDomainHandler = new AuditDomainHandler();
eventTypes.forEach(eventType => {
  this.registerHandler(eventType, auditDomainHandler);
});
```

### Error Handling

The handler is designed to be fire-and-forget:

```typescript
try {
  await logEvent({...});
} catch (error) {
  // Never throw, only log in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('Audit domain handler error:', error);
  }
}
```

## Testing

### Test Endpoint

Use the test endpoint to verify audit domain handler functionality:

```bash
# Test registration submission and approval flow
curl -X POST http://localhost:8080/api/test-audit-events

# Test send-back scenario
curl -X PUT http://localhost:8080/api/test-audit-events

# Test rejection scenario
curl -X DELETE http://localhost:8080/api/test-audit-events
```

### Verification Queries

After testing, verify in Supabase:

```sql
-- Show latest events with local time
SELECT action, resource, resource_id, actor_role, result, reason, correlation_id,
       occurred_at_utc at time zone 'Asia/Bangkok' as th_time
FROM audit.event_log
ORDER BY occurred_at_utc DESC
LIMIT 20;

-- Inspect a single flow by correlation_id
SELECT *
FROM audit.event_log
WHERE correlation_id = '<paste-one-from-above>'
ORDER BY occurred_at_utc ASC;
```

## Integration Examples

### Registration Submission

```typescript
// In API route
async function handlePOST(request: NextRequest) {
  const registration = await createRegistration(data);
  
  // Event will automatically generate:
  // - RegisterSubmitted (User resource)
  // - RegistrationCreated (Registration resource)
  // - StatusChanged (waiting_for_review)
  await EventService.emitRegistrationSubmitted(registration);
  
  return NextResponse.json({ success: true });
}
```

### Admin Approval

```typescript
// In admin API route
async function handlePOST(request: NextRequest, { params }: { params: { id: string } }) {
  const registration = await getRegistration(params.id);
  
  // Event will automatically generate:
  // - AdminReviewed (decision: approved)
  // - StatusChanged (approved)
  // - BadgeIssued (if badge exists)
  await EventService.emitAdminApproved(registration, adminEmail, reason);
  
  return NextResponse.json({ success: true });
}
```

### Send-Back Scenario

```typescript
// In admin API route
async function handlePOST(request: NextRequest, { params }: { params: { id: string } }) {
  const registration = await getRegistration(params.id);
  
  // Event will automatically generate:
  // - AdminReviewed (decision: sendback)
  // - StatusChanged (pending)
  await EventService.emitAdminRequestUpdate(registration, adminEmail, reason);
  
  return NextResponse.json({ success: true });
}
```

## Audit Event Structure

### Standard Fields

All audit events include these standard fields:

```typescript
{
  action: string,           // Event action (e.g., "RegisterSubmitted")
  resource: string,         // Resource type (e.g., "User", "Registration")
  correlation_id: string,   // Request correlation ID
  registration_id?: string, // Registration ID (when applicable)
  admin_email?: string,     // Admin email (for admin actions)
  before_state?: object,    // Previous state
  after_state?: object,     // New state
  metadata: {
    event_id: string,       // Domain event ID
    actor_role: string,     // "user", "admin", or "system"
    result: string,         // "success" or "fail"
    reason?: string,        // Reason for action
    data?: object          // Additional data
  }
}
```

### Event-Specific Data

#### RegisterSubmitted
```typescript
{
  action: 'RegisterSubmitted',
  resource: 'User',
  user_id: 'user@example.com',
  data: {
    email_masked: 'us**@example.com'
  }
}
```

#### AdminReviewed
```typescript
{
  action: 'AdminReviewed',
  resource: 'Registration',
  admin_email: 'admin@example.com',
  data: {
    decision: 'approved' | 'rejected' | 'sendback',
    reason: 'All documents verified'
  }
}
```

#### StatusChanged
```typescript
{
  action: 'StatusChanged',
  resource: 'Registration',
  before_state: { status: 'waiting_for_review' },
  after_state: { status: 'approved' },
  reason: 'Registration approved'
}
```

## Migration from Legacy Audit

### Replace Direct Database Writes

**Before:**
```typescript
// Direct database write
await supabase.from('admin_audit_logs').insert([{
  admin_email: adminEmail,
  action: 'approve',
  registration_id: registration.registration_id
}]);
```

**After:**
```typescript
// Use event system
await EventService.emitAdminApproved(registration, adminEmail);
```

### Benefits

1. **Automatic Correlation**: All events in a request share the same correlation_id
2. **PII Safety**: Sensitive data is automatically masked
3. **Consistent Structure**: All audit events follow the same format
4. **Comprehensive Coverage**: Multiple audit events per domain event
5. **Error Resilience**: Failed audit logging doesn't break the system

## Best Practices

1. **Use Event System**: Always emit domain events instead of direct audit writes
2. **Maintain Correlation**: Ensure request context is properly set
3. **Handle Background Jobs**: Set correlation ID for background operations
4. **Monitor Performance**: Ensure audit logging doesn't impact response times
5. **Review Audit Logs**: Regularly check audit logs for completeness

## Troubleshooting

### Common Issues

1. **Missing Correlation**: Ensure request context is set before emitting events
2. **PII Exposure**: Check that sensitive data is properly masked
3. **Duplicate Events**: Verify idempotency is working correctly
4. **Performance Impact**: Monitor that audit logging doesn't slow responses

### Debug Mode

Enable debug logging in development:

```typescript
// Check console for audit-related messages
// Verify correlation IDs are consistent
// Ensure PII is properly masked
```

### Verification Checklist

- [ ] Events are emitted for all workflow transitions
- [ ] Correlation IDs are consistent within requests
- [ ] PII is properly masked in audit logs
- [ ] Error responses don't break the system
- [ ] Background jobs have proper correlation
- [ ] Audit logs are complete and accurate

---

**Last Updated**: 2025-01-27  
**Version**: 1.0.0
