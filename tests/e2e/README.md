# E2E Test Suite - YEC Registration System

## Overview

This E2E test suite simulates real user/admin flows with **exactly one manual cycle** (no cron). The tests cover complete registration workflows and validate email dispatch functionality with secure, controlled testing.

## Test Coverage

### Workflow Tests

#### 1. Happy Path (`workflow.happy-path.spec.ts`)
- **Flow**: Public Form → `waiting_for_review` → PASS all → `approved`
- **Actions**: 
  - Fill registration form with required fields
  - Upload 3 images (profile, TCC card, payment slip)
  - Navigate through Preview → PDPA → Submit
  - Admin review: mark all dimensions PASS → Approve
  - Manual email dispatch call
- **Expected**: Final status `approved` with proper email counters

#### 2. Update Loop - Payment (`workflow.update-loop.payment.spec.ts`)
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

#### 3. Single Cycle Capped (`dispatch.single-cycle.capped.spec.ts`)
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

### Test Commands

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
npm run test:e2e:capped:one
```

#### Option C: All Tests
```bash
# Run all E2E tests (includes existing tests)
npm run test:e2e:all
```

## Test Structure

### Fixtures
```
tests/fixtures/
├── payment-slip.png    # Test payment slip image
├── profile.jpg         # Test profile image
└── tcc.jpg            # Test TCC card image
```

### Utilities
```
tests/e2e/utils/
├── env.ts             # Environment variable handling
└── dispatch.ts        # Email dispatch utilities
```

### Test Helper Endpoint
```
app/api/test/latest-deeplink/route.ts
```
- **Purpose**: Fetch most recent deep-link token for testing
- **Security**: Guarded with `NODE_ENV === 'test'` and `CRON_SECRET`
- **Returns**: `{ token, dimension, created_at, registration_id }`

## Expected Results

### Dry-Run Mode
```json
{
  "ok": true,
  "dryRun": true,
  "sent": 0,
  "wouldSend": 3,
  "capped": 0,
  "blocked": 0,
  "errors": 0,
  "remaining": 1,
  "rateLimited": 0,
  "retries": 0,
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

### Capped Real-Send Mode
```json
{
  "ok": true,
  "dryRun": false,
  "sent": 1,
  "wouldSend": 0,
  "capped": 1,
  "blocked": 2,
  "errors": 0,
  "remaining": 0,
  "rateLimited": 0,
  "retries": 0,
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

## Safety Features

### Email Safety
- **Cap Enforcement**: Maximum 1 email per test run
- **Allowlist Protection**: Only authorized addresses receive emails
- **Throttle Protection**: 500ms delay between sends
- **Retry Protection**: Automatic retry with backoff for rate limits

### Test Safety
- **Environment Guards**: Tests only run in test environment
- **CRON_SECRET Protection**: All API calls require proper authentication
- **Skip Logic**: Update loop test skipped in capped mode
- **Dry-Run Default**: Default mode prevents accidental email sends

## Troubleshooting

### Common Issues

1. **Test Helper Endpoint 403**
   - Ensure `NODE_ENV=test` or `TEST_HELPERS_ENABLED=1`
   - Verify `CRON_SECRET` is set correctly

2. **Email Dispatch 401**
   - Check `CRON_SECRET` environment variable
   - Verify Authorization header format

3. **Test Images Not Found**
   - Ensure test fixtures exist in `tests/fixtures/`
   - Check file paths in test specifications

4. **Deep-Link Token Not Found**
   - Ensure registration was created successfully
   - Check audit events table for `review.request_update` events

### Debug Mode

Enable debug logging by setting environment variables:
```bash
DEBUG=playwright:* npm run test:e2e:dryrun
```

## Integration

### CI/CD Pipeline
The E2E tests are designed to run in CI/CD environments:
- **Dry-run mode** for automated testing
- **Capped mode** for production validation
- **Parallel execution** support via Playwright

### Cross-Reference
- **`tests/REPORT_EMAIL_DISPATCH_LOCAL.md`**: Detailed test report with examples
- **`docs/SESSION_TRACKING_SYSTEM.md`**: Project documentation and runbook
- **`app/api/admin/dispatch-emails/route.ts`**: Email dispatch endpoint implementation
