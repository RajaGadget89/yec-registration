# Admin Job Assignment Test Suite

This test suite implements **RED-first** e2e tests for granular job permissions (User Profile, Payment Slip, TCC Card) without changing application code, schema, or config.

## Overview

These tests are intentionally **RED** (failing) because they document the expected behavior for the PATCH phase that will integrate database-driven job assignments, API enforcement, and UI updates.

## Test Files

### 1. `job-scope.payment-slip.spec.ts`
Tests payment slip scope enforcement:
- ❌ Admin without `payment_slip` scope cannot approve payment slips
- ❌ Admin without `payment_slip` scope cannot request payment updates
- ✅ Admin with `payment_slip` scope can approve payment slips (positive control)

### 2. `job-scope.user-profile.spec.ts`
Tests user profile scope enforcement:
- ❌ Admin without `user_profile` scope cannot edit profile fields
- ❌ Admin without `user_profile` scope cannot approve profiles
- ❌ Admin without `user_profile` scope cannot request profile updates
- ✅ Admin with `user_profile` scope can approve profiles (positive control)

### 3. `job-scope.tcc-card.spec.ts`
Tests TCC card scope enforcement:
- ❌ Admin without `tcc_card` scope cannot approve TCC cards
- ❌ Admin without `tcc_card` scope cannot view TCC card details
- ❌ Admin without `tcc_card` scope cannot access TCC API endpoints
- ✅ Admin with `tcc_card` scope can approve TCC cards (positive control)

### 4. `job-scope.ui-visibility.spec.ts`
Tests UI visibility of job scopes:
- ❌ Admin list should display job scopes per admin
- ❌ Admin management should show scope assignment interface
- ❌ Admin detail view should show assigned job scopes
- ❌ Admin invitation form should include job scope selection

## Running the Tests

### Prerequisites
- Ensure the application is running on `http://localhost:8080`
- Set up test environment variables (see main e2e README)
- Have test data available in the database

### Run All Job Assignment Tests
```bash
npx playwright test e2e/admin-job-assignment/
```

### Run Specific Test File
```bash
npx playwright test e2e/admin-job-assignment/job-scope.payment-slip.spec.ts
```

### Run with UI Mode
```bash
npx playwright test e2e/admin-job-assignment/ --ui
```

### Run with Debug Mode
```bash
npx playwright test e2e/admin-job-assignment/ --debug
```

## Expected Results

### Current State (RED Phase)
- **Total Tests**: 20
- **Failing Tests**: 16 ❌ (intentionally RED)
- **Passing Tests**: 4 ✅ (positive controls)
- **Success Rate**: 20%

### After PATCH Phase (GREEN Phase)
- **Total Tests**: 20
- **Failing Tests**: 0 ❌
- **Passing Tests**: 20 ✅
- **Success Rate**: 100%

## Test Infrastructure

### Authentication
- Uses `programmaticLogin` fixture from `../fixtures/auth.ts`
- Supports multiple test user types (super admin, regular admin, non-admin)
- Handles cookie-based authentication for API calls

### API Testing
- Uses Playwright's `request` API for direct API testing
- Includes proper headers (`X-E2E-RLS-BYPASS`, cookies)
- Tests both success and failure scenarios

### UI Testing
- Uses existing selectors from `../utils/selectors.ts`
- Tests both visible and hidden element scenarios
- Includes error message validation

## Test Accounts

Based on existing fixtures:
- **Super Admin**: `raja.gadgets89@gmail.com` (has all permissions)
- **Non-Admin**: `test@example.com` (should be blocked from admin actions)
- **TCC Admin**: `dave@yec.dev` (has TCC permissions in current system)

## PATCH Phase Requirements

To make these tests GREEN, implement:

1. **Database Schema**
   - `job_scopes` table with scope definitions
   - `admin_job_assignments` table for relationships
   - Database migrations

2. **API Enforcement**
   - Job scope validation in admin endpoints
   - 403 responses with specific scope requirements
   - Scope checking middleware

3. **UI Updates**
   - Job scope display in admin management
   - Scope assignment interface
   - Scope selection in admin invitation
   - Scope-based UI visibility

4. **Business Logic**
   - Job scope validation in admin actions
   - Scope-based action filtering
   - Scope-based statistics

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check that test accounts exist in the database
   - Verify `E2E_AUTH_SECRET` environment variable is set
   - Ensure application is running on correct port

2. **API Errors**
   - Verify `X-E2E-RLS-BYPASS` header is included
   - Check that test data exists in database
   - Ensure proper cookie authentication

3. **UI Element Not Found**
   - Check that selectors match current UI implementation
   - Verify page navigation is working correctly
   - Ensure proper wait conditions

### Debug Commands

```bash
# Run with verbose output
npx playwright test e2e/admin-job-assignment/ --reporter=line

# Run with trace
npx playwright test e2e/admin-job-assignment/ --trace=on

# Run specific test with debug
npx playwright test e2e/admin-job-assignment/job-scope.payment-slip.spec.ts --debug
```

## Artifacts

Test results and traces are stored in:
```
/artifacts/admin-job-assignment/{timestamp}/
├── findings.md
├── playwright-report/
└── traces/
```

## Integration with CI/CD

These tests should be integrated into the CI/CD pipeline:

1. **RED Phase**: Tests should fail (documenting gaps)
2. **PATCH Phase**: Tests should pass (validating implementation)
3. **Regression**: Tests should continue to pass (preventing regressions)

## Related Documentation

- [Main E2E Test README](../README.md)
- [Test Fixtures Documentation](../fixtures/auth.ts)
- [Selector Documentation](../utils/selectors.ts)
- [Core Services Anchor](../../docs/CORE_SERVICES_ANCHOR.md)
