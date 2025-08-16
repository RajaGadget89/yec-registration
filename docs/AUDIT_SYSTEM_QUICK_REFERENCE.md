# Audit System Quick Reference

## 🚀 Quick Start

### Test Audit System
```bash
# Smoke test
curl -X GET http://localhost:8080/api/diag/audit-smoke -H "X-Request-ID: test-123"

# Test registration with audit
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-reg-123" \
  -d '{"title":"Mr.","firstName":"Test","lastName":"User","nickname":"testuser","phone":"0812345678","lineId":"testuser","email":"test@example.com","companyName":"Test Company","businessType":"technology","yecProvince":"bangkok","hotelChoice":"in-quota","roomType":"single","travelType":"private-car"}'
```

### Test File Utilities (Security Critical)
```bash
# Test file utility functions
npx tsx app/lib/filenameUtils.test.ts

# All tests should pass (security requirement)
```

### Run Audit Tests
```bash
# All audit tests
npx playwright test -g "@audit"

# Specific test categories
npx playwright test -g "@audit @registration"
npx playwright test -g "@audit @login"
npx playwright test -g "@audit @admin"
```

## 📊 Database Queries

### Check Recent Audit Logs
```sql
-- Recent access logs
SELECT action, method, resource, result, 
       occurred_at_utc AT TIME ZONE 'Asia/Bangkok' as th_time,
       latency_ms
FROM audit.access_log 
ORDER BY occurred_at_utc DESC 
LIMIT 20;

-- Recent event logs
SELECT action, resource, actor_role, result,
       occurred_at_utc AT TIME ZONE 'Asia/Bangkok' as th_time
FROM audit.event_log 
ORDER BY occurred_at_utc DESC 
LIMIT 20;
```

### Admin Actions Analysis
```sql
-- Admin actions in last 24 hours
SELECT action, resource, actor_role, result,
       occurred_at_utc AT TIME ZONE 'Asia/Bangkok' as th_time
FROM audit.event_log 
WHERE actor_role = 'admin' 
    AND occurred_at_utc > NOW() - INTERVAL '24 hours'
ORDER BY occurred_at_utc DESC;

-- Failed requests analysis
SELECT action, method, resource, COUNT(*) as error_count
FROM audit.access_log 
WHERE result = 'error' 
    AND occurred_at_utc > NOW() - INTERVAL '7 days'
GROUP BY action, method, resource
ORDER BY error_count DESC;
```

### Performance Monitoring
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

## 🔧 Configuration

### Environment Variables
```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Enable debug logging
PLAYWRIGHT_TEST=1
```

### Database Setup
```bash
# Primary setup script
scripts/create-audit-schema-corrected.sql

# Alternative: Step-by-step
scripts/fix-audit-schema-step-by-step.sql
```

## 🏗️ Architecture

### Dual-Layer System
- **Access Layer** (`audit.access_log`): API requests/responses
- **Event Layer** (`audit.event_log`): Business events

### Key Components
- `app/lib/audit/auditClient.ts` - Audit client for logging
- `app/lib/audit/withAuditAccess.ts` - API route wrapper
- `app/lib/audit/requestContext.ts` - Request correlation
- `app/lib/events/handlers/auditLogHandler.ts` - Event handler

## 📋 Event Types

### Access Events
- `GET`, `POST`, `PUT`, `DELETE` - HTTP methods
- `api`, `admin` - Resource types
- `success`, `error`, `unauthorized` - Results

### Business Events
- `registration.submitted` - New registration
- `admin.approved` - Registration approved
- `admin.rejected` - Registration rejected
- `admin.request_update` - Update requested

## 🛡️ Security

### RLS Policies
```sql
-- Service role: Full access
CREATE POLICY "Service role can access all audit logs" 
ON audit.access_log FOR ALL TO service_role USING (true);

-- Authenticated users: Read-only
CREATE POLICY "Authenticated users can read audit logs" 
ON audit.access_log FOR SELECT TO authenticated USING (true);
```

### Data Protection
- No PII logged in audit tables
- Immutable logs (append-only)
- UTC timestamps for consistency
- Request ID correlation

## 🔍 Troubleshooting

### Common Issues
```bash
# Missing environment variables
Error: Missing Supabase environment variables for audit client
Solution: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Database schema issues
Error: Function audit.log_access does not exist
Solution: Run audit schema setup scripts

# Permission issues
Error: Permission denied for schema audit
Solution: Verify RLS policies and user permissions
```

### Debug Mode
```bash
# Enable debug logging
export PLAYWRIGHT_TEST=1

# Check audit system health
curl -X GET http://localhost:8080/api/diag/audit-smoke
```

## 📈 Performance

### Indexes
```sql
-- Request correlation
CREATE INDEX idx_access_log_request_id ON audit.access_log(request_id);

-- Time-based queries
CREATE INDEX idx_access_log_occurred_at ON audit.access_log(occurred_at_utc);

-- Event correlation
CREATE INDEX idx_event_log_correlation_id ON audit.event_log(correlation_id);

-- Action filtering
CREATE INDEX idx_event_log_action ON audit.event_log(action);
```

### Retention Policy
```sql
-- Delete logs older than 1 year
DELETE FROM audit.access_log 
WHERE occurred_at_utc < NOW() - INTERVAL '1 year';

DELETE FROM audit.event_log 
WHERE occurred_at_utc < NOW() - INTERVAL '1 year';
```

## 🔗 Related Documentation

- **[Audit System Feature Guide](audit-system-feature-guide.md)** - Comprehensive guide
- **[Audit System Implementation Summary](AUDIT_SYSTEM_IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[Audit Client Guide](AUDIT_CLIENT_GUIDE.md)** - Client implementation
- **[Audit Wrapper Guide](AUDIT_WRAPPER_GUIDE.md)** - API wrapping
- **[Audit Domain Handler Guide](AUDIT_DOMAIN_HANDLER_GUIDE.md)** - Event handling
- **[Audit E2E Testing Guide](AUDIT_E2E_TESTING_GUIDE.md)** - Testing procedures
- **[Audit Smoke Test Guide](AUDIT_SMOKE_TEST_GUIDE.md)** - Health testing
- **[Audit Logging System Knowledge Base](AUDIT_LOGGING_SYSTEM_KNOWLEDGE_BASE.md)** - Troubleshooting

---

*Last updated: 2025-01-27*  
*Quick reference version: 1.0.0*  
*Audit System Status: ✅ Fully Operational*
