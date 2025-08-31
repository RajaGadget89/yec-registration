# UAT-04 Admin Invite API Tests

This directory contains comprehensive tests for the `POST /api/admin/management/invite` endpoint, implementing the UAT-04 contract validation.

## Test Overview

The test suite validates the following contract requirements:

- **201 Created**: Valid payload creates an invite (pending), returns canonical response body
- **409 Conflict**: Duplicate pending invite for the same email must be blocked deterministically
- **422 Unprocessable**: Invalid `email` or `roles` not in registry must be rejected
- **429 Too Many Requests**: When exceeding rate-limit threshold for this endpoint
- **Idempotency-Key**: Same key within window returns the exact prior result (status + body), no duplicate rows

## Test Structure

### Test Files

- `invite.uat-04.spec.ts` - Main test suite for UAT-04 contract validation
- `../helpers/env.ts` - Environment configuration helper
- `../helpers/email.ts` - Email generation utilities

### Test Categories

1. **Create 201 - Happy Path**
   - Valid payload creates invitation successfully
   - Super admin role creation
   - Multiple roles creation

2. **Duplicate 409 - Conflict Handling**
   - Duplicate pending invitation returns 409
   - Stable error format verification

3. **422 Unprocessable - Validation Errors**
   - Invalid email format rejection
   - Invalid roles rejection
   - Missing required fields

4. **429 Too Many Requests - Rate Limiting**
   - Per-minute rate limit enforcement
   - Rate limit headers verification
   - Retry-After header timing

5. **Idempotency - Replay Behavior**
   - Identical response for same key
   - Different payload with same key
   - No idempotency key behavior

6. **Error Handling - Edge Cases**
   - Invalid JSON handling
   - Missing authorization
   - Insufficient permissions

7. **Response Headers - Verification**
   - Proper content-type headers
   - Idempotency hit headers (future enhancement)

## Environment Setup

### Required Environment Variables

```bash
# Base URL for the API
BASE_URL=http://localhost:8080

# Admin bearer token for authentication
ADMIN_BEARER=your-admin-token

# Optional: Rate limit configuration
INVITE_RATE_LIMIT_PER_MIN=5
INVITE_RATE_LIMIT_PER_DAY=20

# Optional: E2E test mode (bypasses rate limiting)
E2E_TESTS=true
```

### Running Tests

#### 1. Basic Test Run

```bash
# Run all UAT-04 tests
npx playwright test tests/api/admin/invite.uat-04.spec.ts

# Run with specific environment
BASE_URL=http://localhost:8080 ADMIN_BEARER=your-token npx playwright test tests/api/admin/invite.uat-04.spec.ts
```

#### 2. Run Specific Test Categories

```bash
# Run only happy path tests
npx playwright test tests/api/admin/invite.uat-04.spec.ts --grep "Create 201"

# Run only validation tests
npx playwright test tests/api/admin/invite.uat-04.spec.ts --grep "422 Unprocessable"

# Run only rate limiting tests
npx playwright test tests/api/admin/invite.uat-04.spec.ts --grep "429 Too Many Requests"
```

#### 3. Run with Trace (for debugging)

```bash
# Run with trace enabled
npx playwright test tests/api/admin/invite.uat-04.spec.ts --trace on

# Run with trace and save to artifacts
npx playwright test tests/api/admin/invite.uat-04.spec.ts --trace on --reporter=html
```

#### 4. Run in Headed Mode (for debugging)

```bash
# Run with browser visible
npx playwright test tests/api/admin/invite.uat-04.spec.ts --headed
```

## Test Configuration

### Rate Limiting

The tests are configured to work with the default rate limits:
- **Per-minute**: 5 requests per IP
- **Per-day**: 20 requests per account

For testing, you can override these with environment variables:
```bash
INVITE_RATE_LIMIT_PER_MIN=10
INVITE_RATE_LIMIT_PER_DAY=50
```

### E2E Test Mode

When `E2E_TESTS=true`, rate limiting is bypassed to allow for comprehensive testing:
```bash
E2E_TESTS=true npx playwright test tests/api/admin/invite.uat-04.spec.ts
```

## Expected Test Results

### Passing Tests (Green)

All tests should pass when the endpoint correctly implements the UAT-04 contract:

- ✅ 201 responses for valid payloads
- ✅ 409 responses for duplicate invitations
- ✅ 422 responses for validation errors
- ✅ 429 responses for rate limit violations
- ✅ Idempotent behavior with same keys

### Failing Tests (Red)

Tests will fail if the implementation deviates from the contract:

- ❌ 200 instead of 201 for successful creation
- ❌ 500 instead of 409 for duplicates
- ❌ 400 instead of 422 for validation errors
- ❌ No rate limiting (never returns 429)
- ❌ Non-idempotent behavior

## Debugging Failed Tests

### 1. Check Environment Configuration

```bash
# Verify environment variables are set correctly
echo "BASE_URL: $BASE_URL"
echo "ADMIN_BEARER: $ADMIN_BEARER"
```

### 2. Enable Trace for Detailed Debugging

```bash
# Run with trace and save to file
npx playwright test tests/api/admin/invite.uat-04.spec.ts --trace on --reporter=html
```

### 3. Check Server Logs

Monitor the server logs during test execution to see:
- Request/response details
- Rate limiting behavior
- Database operations
- Error messages

### 4. Common Issues

- **401 Unauthorized**: Check `ADMIN_BEARER` token
- **404 Not Found**: Check `BASE_URL` and endpoint availability
- **Rate limiting not working**: Verify rate limit configuration
- **Idempotency issues**: Check database constraints and logic

## Test Data Management

### Email Generation

Tests use unique email addresses to avoid conflicts:
- Format: `{prefix}.{timestamp}.{random}@example.com`
- Examples: `uat04.happy.1703123456789.abc123@example.com`

### Idempotency Keys

Tests use unique idempotency keys:
- Format: `{prefix}-{timestamp}-{random}`
- Examples: `uat04-happy-1703123456789-abc123`

### Cleanup

Tests are designed to be self-contained and don't require manual cleanup. However, if needed:

```sql
-- Clean up test invitations (use with caution)
DELETE FROM admin_invitations 
WHERE email LIKE 'uat04.%' 
AND created_at > NOW() - INTERVAL '1 hour';
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run UAT-04 Tests
  env:
    BASE_URL: ${{ secrets.BASE_URL }}
    ADMIN_BEARER: ${{ secrets.ADMIN_BEARER }}
    E2E_TESTS: true
  run: |
    npx playwright test tests/api/admin/invite.uat-04.spec.ts --reporter=html
```

### Artifacts

Tests generate artifacts for debugging:
- HTML reports with test results
- Trace files for request/response details
- Screenshots for failed tests (if applicable)

## Future Enhancements

### Potential Improvements

1. **X-Idempotency-Hit Header**: Add header to indicate idempotency hits
2. **Database Verification**: Add direct database checks for idempotency
3. **Performance Testing**: Add load testing for rate limiting
4. **Audit Log Verification**: Verify audit logs are created correctly
5. **Event Verification**: Verify domain events are emitted

### Test Coverage Expansion

1. **Daily Rate Limits**: Add tests for daily rate limit enforcement
2. **Edge Cases**: Add more edge case scenarios
3. **Security Tests**: Add security-focused test cases
4. **Integration Tests**: Add tests with real email sending

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use helper functions for email and idempotency key generation
3. Include proper assertions and error messages
4. Add appropriate logging for debugging
5. Update this README with new test categories or configuration options

