# Testing Setup for YEC Registration System

This directory contains automated tests for the YEC Registration System.

## Prerequisites

Before running tests, make sure you have installed the required dependencies:

```bash
npm install
```

## Test Dependencies

The following dependencies are required for testing:

- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting
- `node-mocks-http` - HTTP request mocking (if needed)

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                 # Test setup and global mocks
├── api/                     # API route tests
│   └── register.spec.ts     # Registration API tests
└── README.md               # This file
```

## Test Coverage

The tests cover the following scenarios for the registration API:

### ✅ Successful Registration
- Returns 200 with correct JSON response
- Sets status to "waiting_for_review"
- Sends pending review email
- Inserts data into Supabase with correct status
- Handles different registration types (in-quota, out-of-quota, double room)

### ✅ Validation Errors
- Missing required fields
- Invalid phone format
- Invalid email format

### ✅ Database Errors
- Database insertion failures
- Duplicate registration handling

### ✅ Email Service Errors
- Email service failures
- Email service returning false

### ✅ No Badge Generation
- Ensures no badge generation functions are called
- Verifies no storage operations for badges

### ✅ Request Metadata
- Captures IP address and user agent
- Handles headers correctly

## Test Fixtures

The tests include several fixtures for different registration scenarios:

- `validRegistrationPayload` - Standard registration
- `outOfQuotaRegistrationPayload` - Out-of-quota registration
- `doubleRoomRegistrationPayload` - Double room registration

## Mocking Strategy

The tests use the following mocking approach:

1. **Email Service** - Mocked to avoid actual email sending
2. **Supabase Client** - Mocked to avoid actual database operations
3. **Timezone Utils** - Mocked to return consistent timestamps
4. **Request Objects** - Created using native Request constructor

## Troubleshooting

### TypeScript Errors
If you encounter TypeScript errors related to Vitest types, make sure:

1. Vitest is properly installed: `npm install vitest @vitest/coverage-v8`
2. The `vitest.config.ts` file is in the root directory
3. The `tests/setup.ts` file is properly configured

### Import Errors
If you encounter import errors:

1. Check that the import paths are correct relative to the test file location
2. Ensure the target files exist in the `app` directory
3. Verify that the TypeScript configuration includes the test files

### Mock Issues
If mocks aren't working correctly:

1. Check that the mock paths match the actual import paths
2. Ensure mocks are defined before the imports
3. Verify that the mock functions are properly typed

## Adding New Tests

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use the provided test fixtures when possible
3. Add appropriate mocks for external dependencies
4. Include both success and failure scenarios
5. Test edge cases and error conditions

## Continuous Integration

These tests are designed to run in CI/CD environments. Make sure to:

1. Install dependencies in CI
2. Run tests before deployment
3. Check coverage reports
4. Fail builds on test failures


