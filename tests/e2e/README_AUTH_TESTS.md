# Supabase Magic Link Auth E2E Tests

This directory contains comprehensive Playwright E2E tests for the Supabase Magic Link authentication flow across different environments (Local, Preview, Production).

## Overview

The auth tests validate the complete magic link authentication flow:
1. Generate magic link via Supabase Admin API
2. Navigate to the link → land on `/auth/callback`
3. Ensure the app calls `/api/auth/callback`, sets session cookies, and routes to Admin
4. Verify sign-out clears auth cookies and UI reflects "Not Authenticated"
5. Environment-specific security validations

## Test Files

- `auth.local.e2e.spec.ts` - Local environment tests
- `auth.preview.e2e.spec.ts` - Preview environment tests with same-origin validation
- `auth.prod.e2e.spec.ts` - Production environment tests with strict security checks

## Environment Variables Required

### Required for All Environments
```bash
# Base configuration
APP_URL=http://localhost:8080                    # Target base URL
SUPABASE_URL=https://xxxx.supabase.co           # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Service role for magic link generation
ADMIN_EMAIL=admin@example.com                   # Valid admin user email

# Environment flags (boolean strings)
RUN_LOCAL_TESTS=true                            # Enable local tests
RUN_PREVIEW_TESTS=true                          # Enable preview tests  
RUN_PROD_TESTS=true                             # Enable production tests
```

### Environment-Specific Examples

#### Local Development
```bash
APP_URL=http://localhost:8080 \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
ADMIN_EMAIL=you@example.com \
RUN_LOCAL_TESTS=true \
npx playwright test tests/e2e/auth.local.e2e.spec.ts --reporter=line
```

#### Preview Environment
```bash
APP_URL=https://your-preview.vercel.app \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
ADMIN_EMAIL=you@example.com \
RUN_PREVIEW_TESTS=true \
npx playwright test tests/e2e/auth.preview.e2e.spec.ts --reporter=line
```

#### Production Environment
```bash
APP_URL=https://yec.rajagadget.live \
SUPABASE_URL=https://your-prod-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key \
ADMIN_EMAIL=admin@rajagadget.live \
RUN_PROD_TESTS=true \
npx playwright test tests/e2e/auth.prod.e2e.spec.ts --reporter=line
```

## Test Utilities

### `tests/e2e/utils/supabase.ts`
- `getProjectRef(supabaseUrl)` - Extract project ref from Supabase URL
- `generateMagicLink(email, redirectTo, supabaseUrl, serviceRoleKey)` - Generate magic link via Admin API
- `validateAuthCookie(cookies, projectRef, domainExpectation)` - Validate auth cookie properties

### `tests/e2e/utils/env.ts`
- `getTestEnv()` - Read and validate environment variables
- `printTestEnv()` - Print current configuration (masked for security)

### `tests/e2e/fixtures.ts`
- `appUrl` - Base URL from environment
- `projectRef` - Supabase project ref
- `magicLinkFor(email)` - Generate magic link for testing
- `expectAuthCookie(context, projectRef, domainExpectation?)` - Validate auth cookie
- `expectSetCookieOn(response)` - Assert Set-Cookie header exists
- `expectNoVercelRequests(page)` - Fail if requests to *.vercel.app detected

## Test Scenarios

### Local Environment (`auth.local.e2e.spec.ts`)
- Complete magic link authentication flow
- Cookie validation (no strict domain requirements)
- Sign-out functionality
- Error handling for invalid/missing tokens

### Preview Environment (`auth.preview.e2e.spec.ts`)
- All local tests plus:
- Same-origin validation for auth endpoints
- No requests to non-preview vercel.app domains
- Enhanced security checks

### Production Environment (`auth.prod.e2e.spec.ts`)
- All preview tests plus:
- Strict domain validation (`.rajagadget.live`)
- No requests to any *.vercel.app domains
- Production-specific security validations

## Acceptance Criteria

The tests enforce these requirements:

1. **Auth Callback Flow**: `/auth/callback` triggers `/api/auth/callback` with Set-Cookie header
2. **Cookie Management**: Auth cookie `sb-<projectref>-auth-token` exists after login
3. **Domain Security**: Production cookies have `.rajagadget.live` domain
4. **Same-Origin**: No CORS errors; auth endpoints are same-origin
5. **No Vercel Requests**: Production tests fail if any *.vercel.app requests detected
6. **Sign-Out**: Auth cookie removed and UI shows "Not Authenticated"
7. **Error Handling**: Graceful failure for invalid/missing tokens
8. **Artifacts**: Traces/screenshots/videos captured for failures

## Running Tests

### Run All Auth Tests
```bash
# Set environment variables first
export RUN_LOCAL_TESTS=true
export RUN_PREVIEW_TESTS=true
export RUN_PROD_TESTS=true

# Run all auth tests
npx playwright test tests/e2e/auth.*.e2e.spec.ts
```

### Run Specific Environment
```bash
# Local only
RUN_LOCAL_TESTS=true npx playwright test tests/e2e/auth.local.e2e.spec.ts

# Preview only  
RUN_PREVIEW_TESTS=true npx playwright test tests/e2e/auth.preview.e2e.spec.ts

# Production only
RUN_PROD_TESTS=true npx playwright test tests/e2e/auth.prod.e2e.spec.ts
```

### Debug Mode
```bash
# Run with headed browser and debug
npx playwright test tests/e2e/auth.local.e2e.spec.ts --headed --debug
```

## Security Notes

- **Service Role Key**: Only used in test environment for magic link generation
- **Admin Email**: Must be a valid admin user in the target Supabase project
- **Environment Isolation**: Tests are guarded by environment flags to prevent accidental production testing
- **Cookie Validation**: HttpOnly cookies validated via Playwright context.cookies()
- **Domain Validation**: Production tests enforce strict domain requirements

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required
   ```
   Solution: Set all required environment variables

2. **Invalid Admin Email**
   ```
   Error: Failed to generate magic link: User not found
   ```
   Solution: Use a valid admin email from the target Supabase project

3. **Wrong Supabase Project**
   ```
   Error: Could not extract project ref from SUPABASE_URL
   ```
   Solution: Ensure SUPABASE_URL points to correct project

4. **Network Timeouts**
   ```
   Error: Timeout waiting for auth callback API call
   ```
   Solution: Check network connectivity and increase timeout if needed

### Debug Commands

```bash
# Print environment configuration
node -e "require('./tests/e2e/utils/env').printTestEnv()"

# Test magic link generation
node -e "
const { generateMagicLink } = require('./tests/e2e/utils/supabase');
generateMagicLink('test@example.com', 'http://localhost:8080/auth/callback', 
  process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  .then(console.log)
  .catch(console.error);
"
```

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Auth E2E Tests
  env:
    APP_URL: ${{ secrets.APP_URL }}
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
    RUN_LOCAL_TESTS: true
  run: npx playwright test tests/e2e/auth.local.e2e.spec.ts
```

## Related Files

- `app/api/auth/callback/route.ts` - Server-side auth callback handler
- `app/auth/callback/page.tsx` - Client-side auth callback page
- `app/admin/logout/route.ts` - Sign-out endpoint
- `app/api/whoami/route.ts` - Authentication status endpoint
