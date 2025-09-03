# E2E Test Suite - YEC Registration System

## Overview

This E2E test suite simulates real user/admin flows with **exactly one manual cycle** (no cron). The tests cover complete registration workflows, admin invitation flows, and validate email dispatch functionality with secure, controlled testing.

## Test Coverage

### UAT-04S: Admin Invitation & Role Management Tests

#### 1. Invitation Acceptance Flow (`uat04s.invitation.spec.ts`)
- **Flow**: Send invitation → Accept link valid once → Replay returns 410
- **Actions**: 
  - Send admin invitation via real API endpoint
  - Retrieve accept URL from email outbox/token table
  - Test first acceptance (should succeed with 200/3xx)
  - Test replay acceptance (should fail with 410)
  - Verify invalid tokens return 410
  - Confirm accept endpoint is publicly accessible
- **Expected**: Accept link works exactly once, replay fails correctly

#### 2. Role-Based Navigation (`uat04s.role.nav.spec.ts`)
- **Flow**: Accept invitation → Magic link login → Verify role constraints
- **Actions**:
  - Accept admin invitation (creates admin user)
  - Login via magic link (UI-based, not bypass)
  - Verify `/api/admin/me` returns 200 with role=admin
  - Check top bar shows "Admin" role chip
  - Verify "Admin Management Team" is hidden for admin users
  - Confirm direct access to super-admin routes returns 401/403
  - Test logout clears authentication state
- **Expected**: Proper role-based access control and navigation

### Workflow Tests

#### 3. Happy Path (`workflow.happy-path.spec.ts`)
- **Flow**: Public Form → `waiting_for_review` → PASS all → `approved`
- **Actions**: 
  - Fill registration form with required fields
  - Upload 3 images (profile, TCC card, payment slip)
  - Navigate through Preview → PDPA → Submit
  - Admin review: mark all dimensions PASS → Approve
  - Manual email dispatch call
- **Expected**: Final status `approved` with proper email counters

#### 4. Update Loop - Payment (`workflow.update-loop.payment.spec.ts`)
- **Flow**: Registration → Request Update (payment) → Deep-link → Resubmit → `approved`
- **Actions**:
  - Create registration (same as happy path)
  - Admin requests payment update → status to `waiting_for_update_payment`
  - Fetch deep-link via test helper endpoint
  - User resubmits via deep-link with new payment slip
  - Admin approves remaining dimensions
  - Manual email dispatch call
- **Expected**: Final status `approved` with proper email counters
- **Note**: Skipped in capped real-send mode to maintain single email send

### Dispatch Tests

#### 5. Single Cycle Capped (`dispatch.single-cycle.capped.spec.ts`)
- **Purpose**: Perform exactly one real email send with cap enforcement
- **Mode**: Only runs when `DISPATCH_DRY_RUN=false` and `EMAIL_MODE=CAPPED`
- **Expected**: `sent=1`, `blocked≈2`, `capped≥1` (per report schema)

## Environment Configuration

### Required Environment Variables

```bash
# Base configuration
PLAYWRIGHT_BASE_URL=http://localhost:8080
CRON_SECRET=local-secret
DISPATCH_DRY_RUN=true

# For UAT-04S tests
E2E_TEST_MODE=true
SUPER_ADMIN_EMAIL=raja.gadgets89@gmail.com

# For capped real-send mode
EMAIL_MODE=CAPPED
EMAIL_CAP_MAX_PER_RUN=1
EMAIL_THROTTLE_MS=500
EMAIL_RETRY_ON_429=1
BLOCK_NON_ALLOWLIST=true
EMAIL_ALLOWLIST=raja.gadgets89@gmail.com
```

### Test Modes

#### Dry-Run Mode (Default)
- **Safety**: 100% safe - no real emails sent
- **Counters**: `dryRun=true`, `sent=0`, `wouldSend ≥ 2`
- **Use Case**: Development and CI/CD testing

#### Capped Real-Send Mode
- **Safety**: Controlled - exactly 1 email sent to allowlisted address
- **Counters**: `sent=1`, `blocked≈2`, `capped≥1`
- **Use Case**: Production email validation

## Running Tests

### Prerequisites

1. **Start the application**:
   ```bash
   PORT=8080 npm run dev
   ```

2. **Install Playwright** (if not already installed):
   ```bash
   npm run e2e:install
   ```

3. **Set E2E environment**:
   ```bash
   export E2E_TEST_MODE=true
   export SUPER_ADMIN_EMAIL=raja.gadgets89@gmail.com
   ```

### Test Commands

#### UAT-04S Tests (New)
```bash
# Run invitation acceptance tests
E2E_TEST_MODE=true pnpm playwright test tests/e2e/uat04s.invitation.spec.ts

# Run role navigation tests
E2E_TEST_MODE=true pnpm playwright test tests/e2e/uat04s.role.nav.spec.ts

# Run all UAT-04S tests
E2E_TEST_MODE=true pnpm playwright test tests/e2e/uat04s
```

#### Option A: Dry-Run Tests (Recommended)
```bash
# Run all workflow tests in dry-run mode
npm run test:e2e:dryrun
```

#### Option B: Single Real-Send Test
```bash
# Start app with capped email mode
PORT=8080 EMAIL_MODE=CAPPED EMAIL_CAP_MAX_PER_RUN=1 \
BLOCK_NON_ALLOWLIST=true EMAIL_ALLOWLIST=raja.gadgets89@gmail.com \
DISPATCH_DRY_RUN=false npm run dev

# Run single capped dispatch test
```

## Test Architecture

### Helper Functions

#### `invite-helpers.ts`
- `sendAdminInvite()` - Send admin invitation via real API
- `getAcceptUrl()` - Retrieve accept URL from email outbox/token table
- `waitForInvitationEmail()` - Poll for invitation email creation

#### `email-helpers.ts`
- `waitForOutboxLink()` - Wait for specific email link types
- `getLatestOutboxLink()` - Get latest email link without waiting
- `cleanupTestEmails()` - Clean up test email data

#### `auth-helpers.ts`
- `loginViaMagicLink()` - Complete magic link authentication flow
- `checkAuthStatus()` - Verify authentication state
- `logout()` - Clear authentication state
- `waitForAuthComplete()` - Wait for auth completion

### Database Access

Tests use `supabaseTestClient` with service role key for:
- Reading email outbox entries
- Querying admin invitations
- Checking admin user records
- Cleanup operations

### E2E RBAC Header

For test endpoints requiring E2E bypass:
- Set `E2E_TEST_MODE=true`
- Include header `x-e2e-rbac: 1`
- Only used for test helper endpoints, not main app routes

## Test Data Management

### Email Generation
- Uses timestamp-based emails: `uat04s-admin-${Date.now()}@example.com`
- Prevents conflicts between test runs
- Automatic cleanup after each test

### Cleanup Strategy
- `afterEach` hooks clean up test data
- Removes email outbox entries
- Cleans up admin invitations and users
- Uses pattern matching for safe cleanup

## Troubleshooting

### Common Issues

1. **Rate Limiting**: Magic link requests may be rate limited
   - Tests automatically wait for cooldown period
   - Retry logic handles rate limit responses

2. **Email Delivery**: Invitation emails may not appear immediately
   - Tests poll email outbox with configurable timeout
   - Fallback to direct database queries

3. **Authentication State**: Session management issues
   - Tests use fresh browser contexts for isolation
   - Explicit logout and cleanup between tests

### Debug Information

Tests include comprehensive logging:
- Step-by-step progress indicators
- API response status codes
- Authentication state verification
- Error details for failed assertions

### Screenshots on Failure

Playwright automatically captures screenshots on test failures:
- Stored in `playwright-report/` directory
- Includes page state at failure point
- Helps debug UI-related issues

## Security Considerations

### Test Isolation
- Each test uses unique email addresses
- Fresh browser contexts prevent session leakage
- Automatic cleanup removes test data

### Production Safety
- Tests only run in local/dev/staging environments
- No schema modifications or production data access
- E2E bypass requires explicit header + environment flag

### Guardrail Compliance
- No git operations or snapshots
- No global E2E bypass activation
- Tests respect existing RBAC and security controls

## Integration with CI/CD

### Environment Requirements
- `E2E_TEST_MODE=true` for test execution
- Valid Supabase service role key
- Application running on test URL
- Email system configured for testing

### Test Execution
- Tests can run in parallel (isolated data)
- Configurable timeouts for CI environments
- Artifact collection for debugging
- Exit codes for CI integration

## Future Enhancements

### Planned Features
- Enhanced test endpoint for email retrieval
- Better rate limit handling
- Performance optimization for CI environments
- Additional role-based test scenarios

### Test Coverage Expansion
- Super-admin invitation flows
- Admin role promotion/demotion
- Bulk invitation scenarios
- Audit log verification

---

*This E2E test suite provides comprehensive coverage of the YEC Registration System's admin workflows while maintaining security and production safety.*
