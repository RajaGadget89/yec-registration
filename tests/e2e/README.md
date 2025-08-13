# Comprehensive Authentication Testing

This directory contains comprehensive Playwright tests for the YEC Registration authentication system, specifically focusing on the magic link authentication flow and cookie management issues.

## Problem Solved

The original issue was with the `next.config.ts` CORS headers causing authentication problems. The CORS headers for `/api/auth/callback` were removed because:

1. **Same-Origin Requests**: The callback API is called from the same origin (`localhost:8080`), so CORS headers are unnecessary
2. **Cookie Issues**: CORS headers were interfering with cookie setting during authentication
3. **Browser Compatibility**: Different browsers handle CORS headers differently, causing inconsistent behavior

## Test Structure

### Files Created

1. **`auth-comprehensive.spec.ts`** - Main test suite covering all authentication scenarios
2. **`mock-auth-handler.ts`** - Mock authentication handler for reliable testing
3. **`run-auth-tests.sh`** - Test runner script for comprehensive testing
4. **`auth-test-config.ts`** - Playwright configuration for authentication tests
5. **`README.md`** - This documentation file

### Test Categories

#### 1. Magic Link Authentication Flow
- Complete magic link flow from login to dashboard
- Invalid token handling
- Missing token scenarios

#### 2. Cookie Management
- Authentication cookie setting
- Cookie properties validation (httpOnly, secure, etc.)
- Cookie clearing on logout

#### 3. Admin Dashboard Access Control
- Unauthenticated access redirection
- Authenticated access validation
- Non-admin user access denial

#### 4. Error Handling
- Network error handling
- Server error responses
- Malformed response handling
- Missing token scenarios

#### 5. Cross-Browser Compatibility
- Chrome/Chromium testing
- Firefox testing
- Safari/WebKit testing

#### 6. Performance and Loading States
- Loading state validation
- Timeout handling

#### 7. Security Tests
- Token exposure prevention
- Secure cookie settings

## Running the Tests

### Prerequisites

1. **Install Playwright** (if not already installed):
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Start the application**:
   ```bash
   npm run dev
   ```

### Quick Test Run

Run all authentication tests:
```bash
npx playwright test tests/e2e/auth-comprehensive.spec.ts
```

### Comprehensive Test Run

Use the test runner script for full testing across all browsers:
```bash
./tests/e2e/run-auth-tests.sh
```

This script will:
- Test all browsers (Chrome, Firefox, Safari)
- Generate detailed reports
- Create a summary of results
- Save all results to timestamped directories

### Individual Test Suites

Run specific test categories:

```bash
# Magic Link Flow Tests
npx playwright test tests/e2e/auth-comprehensive.spec.ts --grep "Magic Link Authentication Flow"

# Cookie Management Tests
npx playwright test tests/e2e/auth-comprehensive.spec.ts --grep "Cookie Management"

# Access Control Tests
npx playwright test tests/e2e/auth-comprehensive.spec.ts --grep "Admin Dashboard Access Control"

# Error Handling Tests
npx playwright test tests/e2e/auth-comprehensive.spec.ts --grep "Error Handling"

# Security Tests
npx playwright test tests/e2e/auth-comprehensive.spec.ts --grep "Security Tests"
```

### Browser-Specific Testing

Test specific browsers:

```bash
# Chrome only
npx playwright test tests/e2e/auth-comprehensive.spec.ts --project=chromium

# Firefox only
npx playwright test tests/e2e/auth-comprehensive.spec.ts --project=firefox

# Safari only
npx playwright test tests/e2e/auth-comprehensive.spec.ts --project=webkit
```

## Test Results

### Output Locations

- **HTML Reports**: `test-results/[browser]/report.html`
- **JSON Results**: `test-results/results.json`
- **Screenshots**: `test-results/[browser]/screenshots/`
- **Videos**: `test-results/[browser]/videos/`
- **Traces**: `test-results/[browser]/traces/`

### Viewing Results

1. **HTML Reports**: Open in browser for detailed test results
2. **Screenshots**: View failed test screenshots
3. **Videos**: Watch test execution videos for debugging
4. **Traces**: Use Playwright Trace Viewer for step-by-step analysis

## Mock Authentication System

The tests use a mock authentication handler (`mock-auth-handler.ts`) that:

- **Simulates Supabase Authentication**: Without requiring actual Supabase calls
- **Provides Consistent Testing**: Same behavior across all test runs
- **Supports Multiple Users**: Admin and non-admin user scenarios
- **Handles Error Cases**: Network failures, server errors, etc.

### Mock User Configuration

```typescript
// Admin user (default)
email: 'raja.gadgets89@gmail.com'
role: 'admin'

// Non-admin user
email: 'user@example.com'
role: 'user'
```

## Key Fixes Applied

### 1. Removed Problematic CORS Headers

**Before** (`next.config.ts`):
```typescript
{
  source: '/api/auth/callback',
  headers: [
    { key: 'Access-Control-Allow-Credentials', value: 'true' },
    { key: 'Access-Control-Allow-Origin', value: 'http://localhost:8080' },
    // ... more CORS headers
  ],
}
```

**After**:
```typescript
// CORS headers removed - not needed for same-origin requests
```

### 2. Maintained Cache Control Headers

Kept the cache control headers for `/auth/callback` page:
```typescript
{
  source: '/auth/callback',
  headers: [
    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' },
    { key: 'Pragma', value: 'no-cache' },
    { key: 'Expires', value: '0' },
  ],
}
```

## Troubleshooting

### Common Issues

1. **Application Not Running**:
   - Ensure `npm run dev` is running on port 8080
   - Check if the application is accessible at `http://localhost:8080`

2. **Test Timeouts**:
   - Increase timeout in `auth-test-config.ts`
   - Check application performance

3. **Mock Authentication Issues**:
   - Verify mock user configuration in `mock-auth-handler.ts`
   - Check token generation logic

4. **Browser-Specific Issues**:
   - Run tests on individual browsers to isolate issues
   - Check browser console for errors

### Debug Mode

Run tests in debug mode:
```bash
npx playwright test tests/e2e/auth-comprehensive.spec.ts --debug
```

This will:
- Open browser in debug mode
- Allow step-by-step execution
- Show detailed logging

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install --with-deps

# Run tests
npx playwright test tests/e2e/auth-comprehensive.spec.ts --reporter=html
```

## Contributing

When adding new tests:

1. **Follow the existing pattern** in `auth-comprehensive.spec.ts`
2. **Use the mock handler** for consistent testing
3. **Add appropriate error handling** for edge cases
4. **Test across all browsers** for compatibility
5. **Update this README** with new test information

## Next Steps

1. **Run the comprehensive test suite** to validate the fix
2. **Monitor for any remaining issues** in different browsers
3. **Add more edge case tests** as needed
4. **Consider adding performance tests** for authentication flow
5. **Document any new authentication features** with corresponding tests
