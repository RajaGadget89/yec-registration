# Admin Management E2E Test Suite

This document describes the comprehensive E2E test suite for Admin Management Phase 1 flows, covering the complete invite → accept → role changes → suspend/activate workflow including negative cases and audit/event checks.

## Test Files

### 1. `admin-management.e2e.spec.ts` - Comprehensive API Testing
Complete API-first E2E test suite covering all admin management endpoints and workflows.

**Test Coverage:**
- ✅ Admin invitation creation with validation
- ✅ Duplicate invitation handling (409)
- ✅ Rate limiting enforcement (429)
- ✅ Validation error handling (422)
- ✅ Invitation acceptance with valid tokens
- ✅ Expired token handling (410)
- ✅ Invalid token handling (410)
- ✅ Admin user listing and filtering
- ✅ Admin role and status updates
- ✅ Activity log verification
- ✅ Unauthorized access prevention (403)
- ✅ Feature flag handling
- ✅ Email stub verification
- ✅ Test data cleanup

### 2. `admin-management-ui.e2e.spec.ts` - UI Smoke Testing
Frontend component testing for the admin management dashboard.

**Test Coverage:**
- ✅ Dashboard loading and layout
- ✅ Invitation form submission
- ✅ Pending invitations list and revoke functionality
- ✅ Admin users table and role updates
- ✅ Status toggle functionality
- ✅ Activity list display
- ✅ Unauthorized access redirection
- ✅ Feature flag handling
- ✅ Responsive design testing
- ✅ Error handling and validation
- ✅ Loading states

### 3. `admin-management-smoke.e2e.spec.ts` - Staging Smoke Test
Minimal smoke test for CI/CD environments that validates core functionality quickly.

**Test Coverage:**
- ✅ Complete admin management workflow
- ✅ Negative case handling
- ✅ Performance validation
- ✅ UI integration testing

## Test Environment Setup

### Required Environment Variables

```bash
# Base configuration
PLAYWRIGHT_BASE_URL=http://localhost:8080
CRON_SECRET=local-secret
DISPATCH_DRY_RUN=true

# Admin management specific
FEATURES_ADMIN_MANAGEMENT=true
ADMIN_EMAILS=raja.gadgets89@gmail.com

# Email configuration (for email stub testing)
EMAIL_MODE=DRY_RUN
RESEND_API_KEY=test-key
EMAIL_FROM=test@example.com

# Database configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Requirements

The tests require the following database tables and functions:

1. **admin_users** - Admin user management
2. **admin_invitations** - Invitation system
3. **admin_audit_logs** - Activity logging
4. **email_outbox** - Email verification
5. **audit.access_log** - Access logging
6. **audit.event_log** - Event logging

Required database functions:
- `generate_admin_invitation_token()`
- `validate_admin_invitation_token(p_token)`
- `accept_admin_invitation(p_token, p_admin_id)`
- `revoke_admin_invitation(p_invitation_id, p_revoked_by_admin_id)`

## Running the Tests

### Individual Test Suites

```bash
# Run comprehensive API tests
npm run test:admin-management

# Run UI smoke tests
npm run test:admin-management-ui

# Run staging smoke tests
npm run test:admin-management-smoke
```

### All Admin Management Tests

```bash
# Run all admin management tests
npx playwright test tests/e2e/admin-management*.e2e.spec.ts --reporter=line
```

### Specific Test Categories

```bash
# Run only invitation tests
npx playwright test tests/e2e/admin-management.e2e.spec.ts --grep='@invite' --reporter=line

# Run only acceptance tests
npx playwright test tests/e2e/admin-management.e2e.spec.ts --grep='@accept' --reporter=line

# Run only UI tests
npx playwright test tests/e2e/admin-management-ui.e2e.spec.ts --grep='@dashboard' --reporter=line

# Run only smoke tests
npx playwright test tests/e2e/admin-management-smoke.e2e.spec.ts --grep='@smoke' --reporter=line
```

## Test Data Management

### Test Context Creation

Each test uses a unique test context with:
- Unique test ID for data isolation
- Tagged test data for cleanup
- Consistent headers and request IDs
- Audit correlation tracking

### Cleanup Strategy

Tests automatically clean up:
- Admin invitations created during tests
- Admin users created during tests
- Email outbox entries
- Audit logs (via test context tagging)

### Data Isolation

Tests use:
- Unique email addresses with test tags
- Timestamped request IDs
- Correlation IDs for audit tracking
- Isolated test contexts

## API Endpoints Tested

### 1. POST /api/admin/management/invite
- **Auth**: super_admin only
- **Rate Limits**: 5 req/min/IP + 20 req/day/account
- **Validation**: Email format, role validation
- **Response**: 200 (success), 409 (duplicate), 422 (validation), 429 (rate limit)

### 2. POST /api/admin/management/invitations/[token]/accept
- **Auth**: Public (token-guarded)
- **Validation**: Token validity, expiration
- **Response**: 200 (success), 410 (expired/invalid)

### 3. GET /api/admin/management/admins
- **Auth**: super_admin only
- **Features**: Pagination, filtering, search
- **Response**: 200 (success), 403 (unauthorized)

### 4. PUT /api/admin/management/admins/[id]
- **Auth**: super_admin only
- **Features**: Role assignment, status updates
- **Response**: 200 (success), 403 (unauthorized), 404 (not found)

### 5. GET /api/admin/management/activity
- **Auth**: super_admin only
- **Features**: Activity log with filtering
- **Response**: 200 (success), 403 (unauthorized)

## Audit and Event Verification

### Access Logging
All API endpoints log access via `logAccess()` with:
- Request ID correlation
- Action and resource identification
- Result status
- IP and user agent information

### Event Logging
Domain events are logged via `logEvent()` for:
- `admin.invitation.created`
- `admin.invitation.accepted`
- `admin.role.assigned`
- `admin.suspended`
- `admin.activated`

### Activity Logging
Admin actions are logged to `admin_audit_logs` with:
- Admin email identification
- Action performed
- Resource affected
- Before/after state changes

## Email Verification

### Email Stub Testing
Tests verify that invitation emails are:
- Queued in `email_outbox` table
- Sent to correct recipient
- Contain proper subject (EN/TH)
- Include accept URL with token
- Use correct template (`admin.invitation`)

### Email Content Validation
- Subject line verification
- Accept URL token matching
- Language detection (EN/TH)
- Template payload validation

## Negative Case Testing

### Authentication & Authorization
- Non-super-admin access attempts (403)
- Missing authentication (401)
- Invalid admin allowlist (403)

### Validation Errors
- Invalid email format (422)
- Invalid role selection (422)
- Missing required fields (422)

### Business Logic Errors
- Duplicate invitations (409)
- Expired tokens (410)
- Invalid tokens (410)
- Rate limit exceeded (429)

### Feature Flag Testing
- Disabled feature handling (404)
- Graceful degradation

## Performance Testing

### Response Time Validation
- API endpoints complete within 5 seconds
- UI interactions respond within 2 seconds
- Total test suite completes within 15 seconds

### Load Testing
- Rate limiting enforcement
- Concurrent request handling
- Database query optimization

## Integration with Existing Tests

### No Regression Guarantee
The admin management tests are designed to:
- Use existing test helpers and patterns
- Follow established audit logging patterns
- Maintain compatibility with AC1-AC6 test suite
- Use consistent test data management

### Test Isolation
- Unique test contexts prevent interference
- Proper cleanup ensures test independence
- Correlation IDs prevent audit log conflicts

## CI/CD Integration

### Staging Smoke Test
The smoke test (`admin-management-smoke.e2e.spec.ts`) is designed for:
- Quick execution in CI environments
- Core functionality validation
- Performance benchmarking
- Integration testing

### Environment Configuration
Tests automatically adapt to:
- Local development environment
- Staging environment
- CI/CD pipeline environment
- Production-like testing

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify `ADMIN_EMAILS` includes test email
   - Check admin cookie configuration
   - Ensure super admin role assignment

2. **Database Connection Issues**
   - Verify Supabase environment variables
   - Check database routing configuration
   - Ensure required tables exist

3. **Email Verification Failures**
   - Check email outbox table access
   - Verify email template configuration
   - Ensure email dispatch is enabled

4. **Audit Log Issues**
   - Verify audit schema exists
   - Check RPC function permissions
   - Ensure correlation ID propagation

### Debug Commands

```bash
# Run tests with debug output
npx playwright test tests/e2e/admin-management.e2e.spec.ts --debug

# Run specific test with headed browser
npx playwright test tests/e2e/admin-management-ui.e2e.spec.ts --headed

# Run with verbose logging
DEBUG=pw:api npx playwright test tests/e2e/admin-management.e2e.spec.ts
```

## Future Enhancements

### Planned Improvements
1. **Multi-language Testing**: Enhanced Thai language support
2. **Advanced Role Testing**: Complex role hierarchy validation
3. **Bulk Operations**: Batch invitation and management testing
4. **Advanced Audit**: Detailed audit trail validation
5. **Performance Benchmarking**: Load testing and optimization

### Integration Opportunities
1. **Notification Testing**: Telegram/email integration
2. **Workflow Testing**: End-to-end admin onboarding
3. **Security Testing**: Penetration testing scenarios
4. **Accessibility Testing**: UI accessibility compliance

## Contributing

When adding new tests:
1. Follow existing patterns and conventions
2. Use test context for data isolation
3. Include proper cleanup in afterAll hooks
4. Add comprehensive audit verification
5. Document new test scenarios
6. Update this README with new information


