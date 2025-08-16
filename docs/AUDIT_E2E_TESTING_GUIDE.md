# Audit E2E Testing Guide

## Overview

This guide covers the comprehensive E2E testing system for the YEC Registration audit logging functionality. The tests verify that the audit system correctly logs both access events (`audit.access_log`) and domain events (`audit.event_log`) with consistent correlation between `request_id` and `correlation_id`.

## Test Architecture

### Components

1. **Test Suite**: `tests/e2e/audit.spec.ts` - Main test scenarios
2. **Supabase Helper**: `tests/e2e/helpers/supabaseTestClient.ts` - Database operations
3. **Log Polling**: `tests/e2e/helpers/logPoller.ts` - Wait for audit logs with retries
4. **Test Data**: `tests/e2e/helpers/testData.ts` - PII-safe test data generation
5. **Configuration**: `tests/e2e/test-config.ts` - Environment and test setup
6. **Test Runner**: `tests/e2e/run-audit-tests.sh` - Automated test execution

### Test Scenarios

#### 1. Smoke Test (`@audit smoke`)
- **Purpose**: Verify basic audit wrapper functionality
- **Flow**: Hit `/api/test-audit` endpoint
- **Expected**: 1 access log entry, no domain events
- **Verification**: Request ID propagation, latency measurement

#### 2. Registration Happy Path (`@audit registration`)
- **Purpose**: Test complete registration flow with audit logging
- **Flow**: Submit registration → verify events
- **Expected**: 1 access log + 2 domain events (RegisterSubmitted, RegistrationCreated)
- **Verification**: Correlation consistency, event data integrity

#### 3. Send-Back Flow (`@audit sendback`)
- **Purpose**: Test admin send-back workflow
- **Flow**: Admin flags issue → user re-uploads → verify status changes
- **Expected**: 1 access log + 1 domain event (StatusChanged)
- **Verification**: Status transition tracking, admin action logging

#### 4. Admin Approval (`@audit approve`)
- **Purpose**: Test admin approval workflow
- **Flow**: Admin approves registration → verify approval events
- **Expected**: 1 access log + 1+ domain events (AdminReviewed, optional BadgeIssued)
- **Verification**: Admin action tracking, badge generation events

#### 5. Comprehensive Workflow (`@audit comprehensive`)
- **Purpose**: Test full workflow with correlation consistency
- **Flow**: Registration → Send-back → Approval
- **Expected**: Multiple request IDs with consistent correlation
- **Verification**: End-to-end audit trail integrity

## Setup Requirements

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:8080

# Test Configuration
TEST_ADMIN_EMAIL=test-admin@example.com
ADMIN_EMAILS=test-admin@example.com
```

### Database Requirements

Ensure your Supabase project has:

1. **Audit Tables**: `audit.access_log` and `audit.event_log`
2. **RPC Functions**: `log_access()` and `log_event()`
3. **Registrations Table**: `registrations` with proper schema
4. **Admin Users**: Test admin account for authentication

### Application Setup

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Verify Health Endpoint**:
   ```bash
   curl http://localhost:8080/api/health
   ```

## Running Tests

### Quick Start

```bash
# Run all audit tests
./tests/e2e/run-audit-tests.sh

# Run specific scenario
./tests/e2e/run-audit-tests.sh -s smoke
./tests/e2e/run-audit-tests.sh -s registration
./tests/e2e/run-audit-tests.sh -s sendback
./tests/e2e/run-audit-tests.sh -s approve
./tests/e2e/run-audit-tests.sh -s comprehensive

# Run in specific browser
./tests/e2e/run-audit-tests.sh -s all -b firefox
```

### Manual Playwright Commands

```bash
# Run all audit tests
npx playwright test -g "@audit"

# Run specific test file
npx playwright test tests/e2e/audit.spec.ts

# Run with specific browser
npx playwright test -g "@audit" --project=firefox

# Run with debug output
npx playwright test -g "@audit" --debug

# Show test report
npx playwright show-report
```

### CI/CD Integration

```bash
# Run in CI environment
npx playwright test -g "@audit" --reporter=html --project=chromium
```

## Test Data Management

### PII Safety

- **No Raw PII**: Tests use masked email addresses and phone numbers
- **Unique Identifiers**: Each test run uses unique test IDs
- **Cleanup**: Test data is tagged for easy cleanup

### Test Data Generation

```typescript
// Generate unique test context
const testContext = createTestContext('registration-test');

// Use masked data
const registrationData = {
  email: `test-${testContext.testId}@example.com`,
  phone: '0812345678', // Will be masked in audit logs
  // ... other fields
};
```

### Data Cleanup

Tests automatically clean up data using:
- **Test Tags**: All test data is tagged with unique identifiers
- **Automatic Cleanup**: `supabaseTestClient.cleanupTestData()`
- **Manual Cleanup**: SQL queries for manual cleanup

## Audit Log Verification

### Access Log Verification

```typescript
// Verify access log entry
const accessLog = logResult.accessLogs[0];
expect(accessLog.action).toBe('api:POST /api/register');
expect(accessLog.resource).toBe('registration');
expect(accessLog.request_id).toBe(requestId);
expect(accessLog.status_code).toBe(200);
expect(accessLog.latency_ms).toBeGreaterThan(0);
```

### Event Log Verification

```typescript
// Verify domain events
const eventActions = logResult.eventLogs.map(log => log.action);
expect(eventActions).toContain('RegisterSubmitted');
expect(eventActions).toContain('RegistrationCreated');

// Verify event details
const registrationEvent = logResult.eventLogs.find(log => log.action === 'RegistrationCreated');
expect(registrationEvent?.correlation_id).toBe(requestId);
```

### Correlation Consistency

```typescript
// Verify request_id ↔ correlation_id consistency
const consistency = verifyAuditLogConsistency(accessLogs, eventLogs, requestId);
expect(consistency.valid).toBe(true);
```

## Log Polling System

### Polling Configuration

```typescript
const DEFAULT_CONFIG = {
  timeoutMs: 30000,    // 30 seconds
  intervalMs: 1000,    // 1 second intervals
  maxRetries: 30       // Maximum retry attempts
};
```

### Polling Functions

```typescript
// Wait for specific log counts
const result = await waitForLogs(requestId, {
  access: 1,    // Expect 1 access log
  events: 2     // Expect 2 event logs
});

// Wait for specific events
const result = await waitForSpecificEvents(requestId, [
  'RegisterSubmitted',
  'RegistrationCreated'
]);
```

### Error Handling

```typescript
if (!result.success) {
  console.error('Log polling failed:', result.error);
  console.log('Found access logs:', result.accessLogs.length);
  console.log('Found event logs:', result.eventLogs.length);
}
```

## Troubleshooting

### Common Issues

#### 1. Environment Configuration
```
Error: Missing Supabase environment variables
```
**Solution**: Ensure all required environment variables are set in `.env.local`

#### 2. Application Not Running
```
Error: Application does not appear to be running
```
**Solution**: Start the development server with `npm run dev`

#### 3. Database Connection
```
Error: Failed to query access logs
```
**Solution**: Verify Supabase credentials and RPC function existence

#### 4. Test Timeouts
```
Error: Timeout waiting for logs
```
**Solution**: 
- Check if audit system is working
- Increase timeout in test configuration
- Verify event handlers are properly wired

#### 5. Authentication Issues
```
Error: Admin authentication failed
```
**Solution**: 
- Verify admin user exists in Supabase
- Check admin email configuration
- Ensure auth cookies are properly set

### Debug Commands

```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('audit.access_log').select('count').then(console.log);
"

# Check application health
curl -v http://localhost:8080/api/health

# Test audit endpoint
curl -X POST http://localhost:8080/api/test-audit \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-123" \
  -d '{"test": "data"}'
```

### Manual Verification Queries

```sql
-- Check recent access logs
SELECT action, resource, result, request_id,
       occurred_at_utc at time zone 'Asia/Bangkok' as th_time
FROM audit.access_log
ORDER BY occurred_at_utc DESC
LIMIT 20;

-- Check recent event logs
SELECT action, resource, correlation_id,
       occurred_at_utc at time zone 'Asia/Bangkok' as th_time
FROM audit.event_log
ORDER BY occurred_at_utc DESC
LIMIT 20;

-- Group by correlation
SELECT correlation_id, count(*) as events
FROM audit.event_log
WHERE occurred_at_utc > now() - interval '2 hours'
GROUP BY correlation_id
ORDER BY events DESC
LIMIT 10;

-- Find test data
SELECT * FROM registrations 
WHERE email LIKE '%test-%'
ORDER BY created_at DESC
LIMIT 10;
```

## Performance Considerations

### Test Execution Time

- **Individual Tests**: 30-60 seconds per scenario
- **Full Suite**: 3-5 minutes for all tests
- **Polling Overhead**: 1-2 seconds per log check

### Database Impact

- **Read Operations**: Tests query audit logs frequently
- **Write Operations**: Minimal test data creation
- **Cleanup**: Automatic cleanup after each test

### Optimization Tips

1. **Parallel Execution**: Tests can run in parallel with different test IDs
2. **Polling Intervals**: Adjust polling intervals for faster/slower systems
3. **Timeout Configuration**: Increase timeouts for slower environments
4. **Browser Selection**: Use headless browsers for faster execution

## Security Considerations

### Service Role Key

- **Server-Only**: Service role key is never exposed to browser
- **Test Isolation**: Each test uses unique identifiers
- **Cleanup**: Test data is automatically cleaned up

### PII Protection

- **Masking**: All PII is masked in test data
- **No Persistence**: Test data is not persisted in logs
- **Unique IDs**: Test identifiers prevent data leakage

### Authentication

- **Test Users**: Dedicated test admin accounts
- **Session Isolation**: Each test uses separate sessions
- **Cookie Management**: Proper cookie handling in tests

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Audit E2E Tests
on: [push, pull_request]

jobs:
  audit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start application
        run: npm run dev &
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Wait for application
        run: sleep 30
      
      - name: Run audit tests
        run: ./tests/e2e/run-audit-tests.sh -s all
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_APP_URL: http://localhost:8080
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### Test Design

1. **Isolation**: Each test is independent and self-contained
2. **Deterministic**: Tests produce consistent results
3. **Fast**: Tests complete within reasonable timeframes
4. **Reliable**: Tests handle flaky conditions gracefully

### Data Management

1. **Unique Identifiers**: Use unique test IDs for all data
2. **Cleanup**: Always clean up test data
3. **PII Safety**: Never store raw PII in tests
4. **Tagging**: Tag all test data for easy identification

### Error Handling

1. **Graceful Degradation**: Tests handle system failures gracefully
2. **Clear Diagnostics**: Failed tests provide actionable error messages
3. **Retry Logic**: Implement retry logic for eventual consistency
4. **Timeout Management**: Use appropriate timeouts for different operations

### Maintenance

1. **Regular Updates**: Keep tests updated with system changes
2. **Documentation**: Maintain comprehensive test documentation
3. **Monitoring**: Monitor test performance and reliability
4. **Review**: Regularly review and refactor test code

---

**Last Updated**: 2025-01-27  
**Version**: 1.0.0
