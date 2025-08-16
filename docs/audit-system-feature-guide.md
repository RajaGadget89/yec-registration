# Audit System Feature & Configuration Guide

## Overview

The YEC Registration System includes a comprehensive audit logging system that tracks all system activities for security, compliance, and operational monitoring. This document provides a complete guide to the audit system features, configuration, and usage.

## 🎯 System Purpose

The audit system serves multiple critical purposes:
- **Security Monitoring**: Track all access attempts and system activities
- **Compliance**: Maintain detailed logs for regulatory requirements
- **Operational Monitoring**: Monitor system performance and user behavior
- **Troubleshooting**: Provide detailed context for debugging issues
- **Forensics**: Enable post-incident analysis and investigation
- **Production Ready**: ✅ Fully implemented and tested for production deployment

## 🏗️ Architecture Overview

### Dual-Layer Audit System

The audit system operates on two distinct layers:

1. **Access Layer** (`audit.access_log`)
   - Tracks all API requests and responses
   - Records HTTP method, path, status codes, latency
   - Captures client IP, user agent, request IDs
   - Provides request-level visibility

2. **Event Layer** (`audit.event_log`)
   - Tracks domain-specific business events
   - Records user actions, admin operations, system events
   - Captures actor information, resource changes, reasons
   - Provides business-level visibility

### Database Schema

```sql
-- Access Log Table
CREATE TABLE audit.access_log (
    id BIGSERIAL PRIMARY KEY,
    occurred_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,           -- e.g., "GET", "POST", "PUT"
    method TEXT,                    -- HTTP method
    resource TEXT,                  -- e.g., "api", "admin"
    result TEXT NOT NULL,           -- "success", "error", "unauthorized"
    request_id TEXT NOT NULL,       -- Unique request identifier
    src_ip INET,                    -- Client IP address
    user_agent TEXT,                -- Browser/client information
    latency_ms INTEGER,             -- Request processing time
    meta JSONB,                     -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Log Table
CREATE TABLE audit.event_log (
    id BIGSERIAL PRIMARY KEY,
    occurred_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,           -- e.g., "registration.submitted", "admin.approved"
    resource TEXT NOT NULL,         -- e.g., "registration", "user"
    resource_id TEXT,               -- ID of the affected resource
    actor_id TEXT,                  -- User ID performing the action
    actor_role TEXT NOT NULL,       -- "user", "admin", "system"
    result TEXT NOT NULL,           -- "success", "failed", "pending"
    reason TEXT,                    -- Optional reason for the action
    correlation_id TEXT NOT NULL,   -- Links related events
    meta JSONB,                     -- Additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Configuration

### Environment Variables

```bash
# Required for audit system
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Enable debug logging for tests
PLAYWRIGHT_TEST=1
```

### Database Setup

The audit system requires specific database schema and functions. Use the provided setup scripts:

```bash
# Primary setup script (recommended)
scripts/create-audit-schema-corrected.sql

# Alternative: Step-by-step setup
scripts/fix-audit-schema-step-by-step.sql

# Setup instructions
scripts/setup-audit.md
```

### RPC Functions

The system uses two PostgreSQL RPC functions for logging:

```sql
-- Log API access events
audit.log_access(p JSONB)

-- Log domain events
audit.log_event(p JSONB)
```

## 📊 Features

### 1. Automatic API Access Logging

**Implementation**: `app/lib/audit/withAuditAccess.ts`

All API routes are automatically wrapped with audit logging:

```typescript
import { withAuditLogging } from '@/lib/audit/withAuditAccess';

export const GET = withAuditLogging(async (request: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ success: true });
});
```

**Captured Data**:
- HTTP method and path
- Request ID for correlation
- Client IP address
- User agent string
- Response status and latency
- Request metadata

### 2. Domain Event Logging

**Implementation**: `app/lib/events/eventService.ts`

Business events are logged through the event system:

```typescript
import { EventService } from '@/lib/events/eventService';

// Log registration submission
await EventService.emitRegistrationSubmitted(registration);

// Log admin approval
await EventService.emitAdminApproved(registration, adminEmail);
```

**Event Types**:
- `registration.submitted` - New registration created
- `admin.approved` - Registration approved by admin
- `admin.rejected` - Registration rejected by admin
- `admin.request_update` - Admin requests user update

### 3. Request Context Correlation

**Implementation**: `app/lib/audit/requestContext.ts`

All events within a single request are correlated using request context:

```typescript
import { withRequestContext } from '@/lib/audit/requestContext';

await withRequestContext(requestContext, async () => {
  // All events in this context share the same correlation ID
  await EventService.emitRegistrationSubmitted(registration);
  await EventService.emitEmailSent(registration.email);
});
```

### 4. Admin Action Tracking

**Implementation**: `app/lib/events/handlers/auditLogHandler.ts`

All admin actions are automatically logged:

- Registration approvals/rejections
- User role changes
- Bulk operations
- System configuration changes

### 5. Performance Monitoring

The audit system tracks:
- Request latency (response time)
- API endpoint performance
- Database query performance
- Error rates and patterns

## 🔍 Monitoring & Analysis

### Query Examples

```sql
-- Recent API access logs
SELECT 
    action, method, resource, result, 
    occurred_at_utc AT TIME ZONE 'Asia/Bangkok' as th_time,
    latency_ms
FROM audit.access_log 
ORDER BY occurred_at_utc DESC 
LIMIT 20;

-- Admin actions in the last 24 hours
SELECT 
    action, resource, actor_role, result,
    occurred_at_utc AT TIME ZONE 'Asia/Bangkok' as th_time
FROM audit.event_log 
WHERE actor_role = 'admin' 
    AND occurred_at_utc > NOW() - INTERVAL '24 hours'
ORDER BY occurred_at_utc DESC;

-- Failed requests analysis
SELECT 
    action, method, resource, COUNT(*) as error_count
FROM audit.access_log 
WHERE result = 'error' 
    AND occurred_at_utc > NOW() - INTERVAL '7 days'
GROUP BY action, method, resource
ORDER BY error_count DESC;

-- Performance analysis
SELECT 
    resource, 
    AVG(latency_ms) as avg_latency,
    MAX(latency_ms) as max_latency,
    COUNT(*) as request_count
FROM audit.access_log 
WHERE occurred_at_utc > NOW() - INTERVAL '1 hour'
GROUP BY resource
ORDER BY avg_latency DESC;
```

### Dashboard Queries

```sql
-- System health overview
SELECT 
    'access_logs' as metric,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE result = 'error') as errors
FROM audit.access_log 
WHERE occurred_at_utc > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'event_logs' as metric,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE result = 'failed') as errors
FROM audit.event_log 
WHERE occurred_at_utc > NOW() - INTERVAL '1 hour';
```

## 🛡️ Security Features

### Row Level Security (RLS)

The audit tables implement RLS policies:

```sql
-- Service role has full access
CREATE POLICY "Service role can access all audit logs" 
ON audit.access_log FOR ALL TO service_role USING (true);

-- Authenticated users can read audit logs (for admin dashboard)
CREATE POLICY "Authenticated users can read audit logs" 
ON audit.access_log FOR SELECT TO authenticated USING (true);
```

### Immutable Logs

- Audit logs are append-only and cannot be modified
- All timestamps are in UTC for consistency
- Request IDs ensure traceability across systems

### Data Protection

- PII (Personally Identifiable Information) is not logged in audit tables
- Sensitive data is hashed or omitted from logs
- Audit logs are separate from application data

## 🧪 Testing

### Test Endpoints

```bash
# Smoke test for audit system
curl -X GET http://localhost:8080/api/diag/audit-smoke \
  -H "X-Request-ID: test-123"

# Test registration with audit logging
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-reg-123" \
  -d '{"title":"Mr.","firstName":"Test","lastName":"User",...}'
```

### Playwright Tests

```bash
# Run audit-specific tests
npx playwright test -g "@audit @registration"
npx playwright test -g "@audit @login"
npx playwright test -g "@audit @admin"
```

### Verification Queries

```sql
-- Verify audit logs were created
SELECT COUNT(*) FROM audit.access_log WHERE request_id = 'test-123';
SELECT COUNT(*) FROM audit.event_log WHERE correlation_id LIKE 'test-%';
```

## 🔧 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing Supabase environment variables for audit client
   Solution: Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
   ```

2. **Database Schema Issues**
   ```
   Error: Function audit.log_access does not exist
   Solution: Run the audit schema setup scripts
   ```

3. **Permission Issues**
   ```
   Error: Permission denied for schema audit
   Solution: Verify RLS policies and user permissions
   ```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export PLAYWRIGHT_TEST=1
```

This enables detailed logging in:
- `app/lib/audit/auditClient.ts`
- `app/lib/audit/withAuditAccess.ts`
- `app/lib/audit/requestContext.ts`

### Health Checks

```bash
# Check audit system health
curl -X GET http://localhost:8080/api/diag/audit-smoke

# Verify database connectivity
curl -X GET http://localhost:8080/api/health
```

## 📈 Performance Considerations

### Indexing Strategy

The audit system uses strategic indexes for optimal performance:

```sql
-- Request ID lookup (for correlation)
CREATE INDEX idx_access_log_request_id ON audit.access_log(request_id);

-- Time-based queries (for reporting)
CREATE INDEX idx_access_log_occurred_at ON audit.access_log(occurred_at_utc);

-- Event correlation
CREATE INDEX idx_event_log_correlation_id ON audit.event_log(correlation_id);

-- Action-based filtering
CREATE INDEX idx_event_log_action ON audit.event_log(action);
```

### Retention Policy

Consider implementing a retention policy for audit logs:

```sql
-- Example: Delete logs older than 1 year
DELETE FROM audit.access_log 
WHERE occurred_at_utc < NOW() - INTERVAL '1 year';

DELETE FROM audit.event_log 
WHERE occurred_at_utc < NOW() - INTERVAL '1 year';
```

### Performance Monitoring

Monitor audit system performance:

```sql
-- Check audit table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'audit';

-- Monitor insert performance
SELECT 
    COUNT(*) as inserts_per_minute,
    AVG(latency_ms) as avg_insert_time
FROM audit.access_log 
WHERE occurred_at_utc > NOW() - INTERVAL '1 minute';
```

## 🔄 Integration Points

### Event System Integration

The audit system integrates with the event-driven architecture:

```typescript
// Event handlers automatically log to audit
export class AuditLogHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    // Automatically logs admin actions
    if (event.type.startsWith('admin.')) {
      await this.logAdminAction(event);
    }
  }
}
```

### Admin Dashboard Integration

Audit logs are accessible through the admin dashboard for:
- User activity monitoring
- System health overview
- Security incident investigation
- Performance analysis

### External System Integration

The audit system can integrate with:
- SIEM (Security Information and Event Management) systems
- Log aggregation platforms (ELK Stack, Splunk)
- Monitoring and alerting systems
- Compliance reporting tools

## 📋 Best Practices

### Implementation Guidelines

1. **Always use request context** for correlation
2. **Include meaningful metadata** in audit logs
3. **Use consistent naming** for actions and resources
4. **Implement proper error handling** in audit functions
5. **Monitor audit system performance** regularly

### Security Guidelines

1. **Never log sensitive data** (passwords, tokens, PII)
2. **Use appropriate access controls** for audit data
3. **Implement log retention policies**
4. **Monitor for suspicious audit patterns**
5. **Regularly review audit access permissions**

### Operational Guidelines

1. **Set up automated monitoring** for audit system health
2. **Implement alerting** for audit system failures
3. **Regular backup** of audit data
4. **Performance tuning** based on usage patterns
5. **Document audit procedures** for incident response

## 🔗 Related Documentation

- **[Audit System Implementation Summary](AUDIT_SYSTEM_IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[Audit Client Guide](AUDIT_CLIENT_GUIDE.md)** - Client-side audit logging
- **[Audit Wrapper Guide](AUDIT_WRAPPER_GUIDE.md)** - API route audit wrapping
- **[Audit Domain Handler Guide](AUDIT_DOMAIN_HANDLER_GUIDE.md)** - Event-based audit logging
- **[Audit E2E Testing Guide](AUDIT_E2E_TESTING_GUIDE.md)** - End-to-end testing procedures
- **[Audit Smoke Test Guide](AUDIT_SMOKE_TEST_GUIDE.md)** - System health testing
- **[Audit Logging System Knowledge Base](AUDIT_LOGGING_SYSTEM_KNOWLEDGE_BASE.md)** - Troubleshooting and lessons learned

---

*Last updated: 2025-01-27*  
*Documentation version: 1.0.0*  
*Audit System Status: ✅ Fully Operational*
