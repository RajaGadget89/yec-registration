# Registration Email Dispatch Workflow E2E Test

This test validates the complete email dispatch workflow during user registration, following the real workflow described in `CORE_SERVICES_ANCHOR.md`.

## Test Overview

The test covers the complete flow from user registration submission through email dispatch:

1. **User Registration**: Complete form submission via UI
2. **Domain Event Emission**: `registration.submitted` event creation
3. **Email Processing**: EmailNotificationHandler processing
4. **Email Queuing**: Email queued in `email_outbox` table
5. **Email Dispatch**: Cron job processing the queue
6. **Audit Logging**: Comprehensive audit trail validation

## Test Scenarios

### 1. Full Registration Workflow with Email Dispatch
- Complete UI registration flow
- Domain event validation
- Email outbox verification
- Email dispatch execution
- Audit log verification

### 2. DRY_RUN Mode Testing
- Safe-Send Gate validation
- Non-production environment behavior
- Email configuration verification

### 3. Email Allowlist Restrictions
- Safe-Send Gate allowlist functionality
- Blocked email handling
- Configuration validation

### 4. Audit Trail Validation
- Access log verification
- Event log verification
- Correlation ID tracking

### 5. Email Dispatch Authentication
- CRON_SECRET validation
- Multiple authentication methods
- Unauthorized access handling

### 6. Email Dispatch Idempotency
- Multiple dispatch execution
- Duplicate prevention
- State consistency

## Prerequisites

### Environment Variables
```bash
# Required for test execution
CRON_SECRET=your-test-secret
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional for email testing
EMAIL_MODE=DRY_RUN
EMAIL_ALLOWLIST=test@example.com
RESEND_API_KEY=your-resend-key
```

### Database Setup
- `registrations` table with proper schema
- `email_outbox` table with proper schema
- `audit.event_log` and `audit.access_log` tables
- Proper RLS policies and RPC functions

## Running the Test

### Single Test
```bash
npx playwright test tests/e2e/registration-email-dispatch-workflow.e2e.spec.ts
```

### Specific Test Case
```bash
npx playwright test tests/e2e/registration-email-dispatch-workflow.e2e.spec.ts -g "should complete full registration workflow with email dispatch"
```

### With Debug Output
```bash
npx playwright test tests/e2e/registration-email-dispatch-workflow.e2e.spec.ts --debug
```

## Test Endpoints Used

### Test Helper Endpoints
- `DELETE /api/test/cleanup-registration` - Clean up test data
- `GET /api/test/peek-registration` - View registration details
- `GET /api/test/check-outbox` - Check email outbox status

### Diagnostic Endpoints
- `GET /api/diag/audit-query` - Query audit logs
- `GET /api/admin/email-status` - Email configuration status
- `GET /api/admin/dispatch-emails` - Email dispatch execution

### Core Endpoints
- `POST /api/register` - Registration submission
- `GET /api/admin/dispatch-emails` - Email dispatch job

## Test Data Management

### Test Email Addresses
- `test-registration-email@example.com` - Main test email
- `dryrun-test@example.com` - DRY_RUN mode test
- `non-allowlisted@example.com` - Allowlist test
- `audit-test@example.com` - Audit trail test
- `idempotency-test@example.com` - Idempotency test

### Cleanup
- Test data is automatically cleaned up before each test
- Uses `DELETE /api/test/cleanup-registration` endpoint
- Removes both registration and email outbox entries

## Validation Points

### Domain Events
- ✅ `registration.submitted` event emitted
- ✅ Event processed by EmailNotificationHandler
- ✅ Event logged to audit.event_log

### Email Processing
- ✅ Email queued in email_outbox table
- ✅ Email configuration validated
- ✅ Safe-Send Gate enforced
- ✅ Email dispatch job executed

### Audit Logging
- ✅ Access logs created for API calls
- ✅ Event logs created for business actions
- ✅ Correlation IDs maintained
- ✅ Request IDs tracked

### Authentication
- ✅ CRON_SECRET required for admin endpoints
- ✅ Multiple authentication methods supported
- ✅ Unauthorized access properly rejected

### Idempotency
- ✅ Multiple dispatch runs don't create duplicates
- ✅ Database state remains consistent
- ✅ Email status properly tracked

## Troubleshooting

### Common Issues

1. **Test Environment Not Set Up**
   ```
   Error: Test configuration validation failed
   ```
   - Ensure all required environment variables are set
   - Check that Supabase connection is working

2. **Authentication Failures**
   ```
   Error: Invalid token
   ```
   - Verify CRON_SECRET is set correctly
   - Check that test headers are being sent

3. **Database Connection Issues**
   ```
   Error: Database error
   ```
   - Verify Supabase URL and service role key
   - Check that required tables exist

4. **Email Configuration Issues**
   ```
   Error: Email configuration not available
   ```
   - Check EMAIL_MODE and related configuration
   - Verify email outbox table exists

### Debug Mode
Run with debug output to see detailed test execution:
```bash
npx playwright test tests/e2e/registration-email-dispatch-workflow.e2e.spec.ts --debug
```

### Manual Verification
You can manually verify the test endpoints:
```bash
# Check email status
curl -H "Authorization: Bearer $CRON_SECRET" \
     -H "X-Test-Helpers-Enabled: 1" \
     http://localhost:8080/api/admin/email-status

# Check audit logs
curl -H "Authorization: Bearer $CRON_SECRET" \
     -H "X-Test-Helpers-Enabled: 1" \
     "http://localhost:8080/api/diag/audit-query?action=registration.submit"
```

## Integration with CI/CD

This test should be included in your CI/CD pipeline to ensure email dispatch functionality works correctly in all environments.

### GitHub Actions Example
```yaml
- name: Run Email Dispatch Tests
  run: |
    npx playwright test tests/e2e/registration-email-dispatch-workflow.e2e.spec.ts
  env:
    CRON_SECRET: ${{ secrets.CRON_SECRET }}
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Related Documentation

- [Core Services Anchor](../docs/CORE_SERVICES_ANCHOR.md) - Main architecture documentation
- [Email Dispatch Policy](../docs/CORE_SERVICES_ANCHOR.md#email-dispatch-policy-core-adjacent) - Email configuration details
- [Domain Events](../docs/CORE_SERVICES_ANCHOR.md#domain-events--authoritative-map) - Event system documentation
- [Audit Logs](../docs/CORE_SERVICES_ANCHOR.md#audit-log-contract) - Audit system documentation
