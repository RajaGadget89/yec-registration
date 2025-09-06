# API Smoke Test Suite - Auto-Login + Auto-REG_ID + One-Click5

## Overview

The API smoke test suite provides **end-to-end automated testing** with:
- ✅ **Auto-login** for 3 test actors (super_admin, payment_only, tcc_only)
- ✅ **Auto-REG_ID discovery** or seeding of valid registration IDs
- ✅ **One-click execution** with comprehensive RBAC enforcement checks
- ✅ **No Core Services changes** - only test-only routes guarded by flags

## Quick Start

### 1. Environment Setup

**Note**: The smoke tests are now integrated into the pre-CI/CD pipeline! Set the required environment variables and they will run automatically during CI/CD checks.

Copy the example environment file and configure:

```bash
cp e2e/smoke-env.example .env.local
# Edit .env.local with your actual values
```

**Required Environment Variables:**
```bash
# Test Mode Flags
E2E_TEST_MODE=true
TEST_HELPERS_ENABLED=1
E2E_AUTH_SECRET=your-secret-here

# Feature Flags
FEATURES_ADMIN_MANAGEMENT=true
FEATURES_ADMIN_JOB_ASSIGNMENT=true

# Test Actor Emails (must be valid admin emails in your system)
SUPER_ADMIN_EMAIL=super@example.com
PAYMENT_ONLY_EMAIL=payment@example.com
TCC_ONLY_EMAIL=tcc@example.com
```

### 2. Run Smoke Tests

**Option A: Integrated with Pre-CI/CD (Recommended)**
```bash
# Run the full pre-CI/CD pipeline including smoke tests
./pre-cicd-check.sh
```

**Option B: Standalone Execution**
```bash
# One-click execution
./run-smoke-tests.sh
```

**Option C: Manual Playwright**
```bash
npx playwright test e2e/smoke.api.enforcement.spec.ts --config=playwright.smoke.config.ts --reporter=line
```

**Option D: Skip Smoke Tests in CI/CD**
```bash
# Skip smoke tests during pre-CI/CD checks
SKIP_SMOKE_TESTS=1 ./pre-cicd-check.sh
```

## Test Architecture

### Global Setup (`e2e/global.setup.smoke.ts`)

**Auto-Login Process:**
1. Logs in all 3 test actors via `/api/test/auth/login` with HMAC authentication
2. Saves authentication state to `e2e/.auth/` directory
3. Discovers existing registration ID or seeds a new one via `/api/test/seed-registration`
4. Writes context file with REG_ID for test specs to use

**Authentication Flow:**
```typescript
// HMAC-signed requests to test login endpoint
const sign = (method, path, ts) => crypto.createHmac('sha256', secret).update(`${method}:${path}:${ts}`).digest('hex');
```

### Test Specifications (`e2e/smoke.api.enforcement.spec.ts`)

**RBAC Enforcement Tests:**
- **Super Admin**: Can perform all operations (mark-pass, request-update)
- **Payment Only**: Can mark-pass payment, forbidden from TCC operations
- **TCC Only**: Can request-update TCC, forbidden from payment operations

**Test Structure:**
```typescript
test.describe('super_admin', () => {
  test.use({ storageState: 'e2e/.auth/super_admin.json' });
  test('me ok + privileged pass', async ({ page }) => {
    // Test super admin permissions
  });
});
```

### Test-Only Seed Route (`app/api/test/seed-registration/route.ts`)

**Guarded by Flags:**
- Only available when `E2E_TEST_MODE=true` AND `TEST_HELPERS_ENABLED=1`
- Creates minimal registration with all required fields
- Returns registration ID for test use

**Minimal Payload:**
```typescript
const payload = {
  registration_id: `SMOKE-${Date.now()}`,
  title: 'Mr.',
  first_name: 'Smoke',
  // ... all required NOT NULL fields
  status: 'waiting_for_review',
  payment_review_status: 'pending',
  profile_review_status: 'pending',
  tcc_review_status: 'pending',
};
```

## Test Coverage

### Authentication Tests
- ✅ Auto-login for super_admin actor
- ✅ Auto-login for payment_only actor  
- ✅ Auto-login for tcc_only actor
- ✅ HMAC authentication validation
- ✅ Session state persistence

### RBAC Enforcement Tests
- ✅ Super admin can perform all operations
- ✅ Payment admin can mark-pass payment dimension
- ✅ Payment admin forbidden from TCC operations (403)
- ✅ TCC admin can request-update TCC dimension
- ✅ TCC admin forbidden from payment operations (403)

### Data Management Tests
- ✅ Auto-discovery of existing registration IDs
- ✅ Auto-seeding of new registration when none exist
- ✅ Valid registration data structure
- ✅ Proper status and review checklist initialization

## Artifacts & Reporting

### Generated Artifacts
- **HTML Report**: `artifacts/api-smoke-auth/<timestamp>/playwright-report/index.html`
- **JSON Results**: `artifacts/api-smoke-auth/<timestamp>/results.json`
- **Test Summary**: `artifacts/api-smoke-auth/<timestamp>/summary.md`

### Test Output
```
🚀 Starting API Smoke Tests...
✅ Environment variables validated
📁 Artifacts will be saved to: artifacts/api-smoke-auth/20250127_143022
🧪 Running smoke tests...
✅ Smoke tests completed!
📁 Results saved to: artifacts/api-smoke-auth/20250127_143022
🌐 Open HTML report: artifacts/api-smoke-auth/20250127_143022/playwright-report/index.html
```

## Troubleshooting

### Common Issues

**1. Login 401 Errors**
- Verify `E2E_AUTH_SECRET` matches server configuration
- Check that test actor emails are in admin allowlist
- Ensure `E2E_TEST_MODE=true` and `TEST_HELPERS_ENABLED=1`

**2. Seed Route 404**
- Verify test helper flags are enabled
- Check that `/api/test/seed-registration` endpoint is accessible
- Ensure Supabase service role key is configured

**3. RBAC 403 Mismatches**
- Verify business roles are assigned to test actors
- Check environment variables for role assignments
- Ensure `FEATURES_ADMIN_MANAGEMENT=true` and `FEATURES_ADMIN_JOB_ASSIGNMENT=true`

**4. REG_ID Discovery Fails**
- Check that `/api/admin/registrations` endpoint is accessible
- Verify admin authentication is working
- Ensure seed route can create new registrations

### Debug Mode

Enable debug logging by setting:
```bash
AUTH_TRACE=1
E2E_DEBUG=true
```

## CI/CD Integration

### Pre-CI/CD Pipeline Integration

The smoke tests are now **fully integrated** into the pre-CI/CD pipeline:

**Automatic Execution:**
- Smoke tests run automatically during `./pre-cicd-check.sh`
- Positioned after CI Health Check E2E and before Full Test Suite
- Only runs when test actor emails are configured

**Smart Detection:**
- ✅ **File Detection**: Checks for `run-smoke-tests.sh` and `e2e/smoke.api.enforcement.spec.ts`
- ✅ **Environment Validation**: Verifies `SUPER_ADMIN_EMAIL`, `PAYMENT_ONLY_EMAIL`, `TCC_ONLY_EMAIL`
- ✅ **Graceful Skipping**: Warns and skips if configuration is missing

**Control Options:**
```bash
# Skip smoke tests entirely
SKIP_SMOKE_TESTS=1 ./pre-cicd-check.sh

# Run with full test suite
RUN_FULL=1 ./pre-cicd-check.sh
```

**Pipeline Output:**
```
🚀 API Smoke Tests (RBAC Enforcement)
--------------------------------
Running API smoke tests with auto-login and RBAC validation...
✅ Smoke test files found
✅ Test actor emails configured
API Smoke Tests (RBAC Enforcement)
🚀 Starting API Smoke Tests...
✅ Environment variables validated
🧪 Running smoke tests...
✅ Smoke tests completed!
```

## Integration with Core Services

### No Core Services Impact
- ✅ **No changes** to domain events, audit logs, or email dispatch
- ✅ **No changes** to business logic or AC1-AC6 workflows
- ✅ **Test-only routes** guarded by environment flags
- ✅ **Isolated test data** that doesn't affect production

### Guardrails Compliance
- ✅ Uses existing `/api/test/auth/login` endpoint
- ✅ Respects existing RBAC and business role system
- ✅ Follows existing authentication patterns
- ✅ Maintains audit logging for test actions

## Environment Requirements

### Runtime Flags (Required)
```bash
FEATURES_ADMIN_MANAGEMENT=true
FEATURES_ADMIN_JOB_ASSIGNMENT=true
```

### Test Flags (Required)
```bash
E2E_TEST_MODE=true
TEST_HELPERS_ENABLED=1
E2E_AUTH_SECRET=<same as server>
```

### Test Actors (Required)
```bash
SUPER_ADMIN_EMAIL=<valid super admin email>
PAYMENT_ONLY_EMAIL=<valid payment admin email>
TCC_ONLY_EMAIL=<valid TCC admin email>
```

### Application URL (Required)
```bash
NEXT_PUBLIC_APP_URL=<running instance URL>
```

## Done Criteria ✅

The smoke test suite successfully:

- ✅ **Logs in all 3 actors** via `/api/test/auth/login` with HMAC authentication
- ✅ **Obtains valid REG_ID** automatically through discovery or seeding
- ✅ **Asserts in-scope 2xx** responses for allowed operations
- ✅ **Asserts out-of-scope 403** responses for forbidden operations
- ✅ **Writes comprehensive artifacts** under `artifacts/api-smoke-auth/<timestamp>/`
- ✅ **No app code changes** outside flag-guarded test routes
- ✅ **One-click execution** with `./run-smoke-tests.sh`

## Files Created

1. **`app/api/test/seed-registration/route.ts`** - Test-only registration seeding
2. **`e2e/global.setup.smoke.ts`** - Auto-login and REG_ID discovery
3. **`e2e/smoke.api.enforcement.spec.ts`** - RBAC enforcement tests
4. **`playwright.smoke.config.ts`** - Playwright configuration
5. **`run-smoke-tests.sh`** - One-click test runner
6. **`e2e/smoke-env.example`** - Environment configuration template
7. **`API_SMOKE_TESTS_SUMMARY.md`** - This documentation

The smoke test suite is now ready for **end-to-end automated testing** with comprehensive RBAC validation and zero impact on core services.