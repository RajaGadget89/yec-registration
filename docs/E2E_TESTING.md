# E2E Testing Guide

This project includes end-to-end tests for the admin magic link authentication flow using Playwright.

## Prerequisites

Ensure the following environment variables are set:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TEST_ADMIN_EMAIL=admin@yourdomain.com  # Any admin-authorized email
```

## Running E2E Tests

### First Time Setup

```bash
# Install Playwright browsers and dependencies
npm run e2e:install
```

### Run Tests

```bash
# Run all E2E tests
npm run e2e

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with debug mode
npx playwright test --debug
```

## What the Tests Validate

The E2E test suite validates the complete admin magic link authentication flow:

1. **Magic Link Generation**: Calls `/api/test/magic-link?email=<TEST_ADMIN_EMAIL>` and receives a real action link
2. **Authentication Flow**: Visits the magic link and observes the redirect to `/auth/callback`
3. **Session Setting**: Confirms exactly one `POST /api/auth/set-session` call with:
   - Status code **303**
   - `Set-Cookie` headers containing both `sb-access-token` and `sb-refresh-token`
4. **Admin Access**: Verifies successful redirect to `/admin`
5. **Session Persistence**: Confirms the session persists after page reload

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Test Files

- `playwright.config.ts` - Playwright configuration
- `tests/e2e/auth.e2e.spec.ts` - Main E2E test for authentication flow
- `app/api/test/magic-link/route.ts` - Test-only API for generating magic links

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**: Ensure all required env vars are set
2. **Port Conflicts**: Make sure port 8080 is available for the dev server
3. **Supabase Connection**: Verify your Supabase credentials are correct
4. **Admin User**: Ensure `TEST_ADMIN_EMAIL` corresponds to a user in your `admin_users` table

### Debug Mode

For debugging test failures:

```bash
# Run with debug mode and headed browser
npx playwright test --debug --headed

# Run specific test file
npx playwright test tests/e2e/auth.e2e.spec.ts --debug
```

### Viewing Traces and Videos

On test failure, Playwright automatically captures:
- **Traces**: Interactive debugging sessions
- **Videos**: Screen recordings of test execution
- **Screenshots**: Final state of the page

View these in the HTML report or directly:

```bash
# Open the last test report
npx playwright show-report

# View traces
npx playwright show-trace test-results/trace.zip
```
