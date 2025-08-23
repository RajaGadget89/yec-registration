# Test Organization Structure

This document describes the organization of test files in the YEC Registration System.

## Directory Structure

```
tests/
├── api/                     # API route tests (automated)
├── e2e/                     # End-to-end tests (automated)
├── fixtures/                # Test fixtures and data
├── migrations/              # Database migration tests
├── utils/                   # Test utilities and helpers
├── audit/                   # Audit system test files (manual)
├── auth/                    # Authentication test files (manual)
├── debug/                   # Debugging utilities (manual)
├── scripts/                 # Test scripts and tools (manual)
└── [other spec files]       # Main test suite files
```

## Test Categories

### Automated Tests (CI/CD)
- **api/** - API endpoint tests using Vitest
- **e2e/** - End-to-end tests using Playwright
- **fixtures/** - Test data and fixtures
- **migrations/** - Database migration validation
- **utils/** - Test utilities and helpers

### Manual Development Tools
- **audit/** - Audit system testing and validation
- **auth/** - Authentication flow testing
- **debug/** - Debugging utilities for troubleshooting
- **scripts/** - Shell scripts and test tools

## File Organization

### Audit Tests (`tests/audit/`)
- `test-audit-logs.js` - Test audit log functionality
- `test-audit-client.js` - Test audit client operations
- `test-audit-schema.js` - Test audit schema validation

### Authentication Tests (`tests/auth/`)
- `test-magic-link-flow.js` - Test magic link authentication flow
- `test-real-magic-link.js` - Test real magic link functionality
- `test-real-magic-link-debug.js` - Debug magic link issues

### Debug Utilities (`tests/debug/`)
- `debug-auth-callback.js` - Debug authentication callback issues
- `debug-auth.js` - Debug general authentication problems
- `debug-session-issue.js` - Debug session-related issues

### Test Scripts (`tests/scripts/`)
- `test-magic-link-fix.sh` - Shell script for magic link testing

### Utility Tests (`tests/utils/`)
- `test-env.js` - Environment variable validation
- `test-import.js` - Import validation tests

## Usage

### Running Automated Tests
```bash
# Run all automated tests
npm test

# Run specific test categories
npm run test:unit:email
npm run test:e2e:all
npm run test:audit
```

### Running Manual Development Tools
```bash
# Audit tests
node tests/audit/test-audit-logs.js
node tests/audit/test-audit-client.js
node tests/audit/test-audit-schema.js

# Authentication tests
node tests/auth/test-magic-link-flow.js
node tests/auth/test-real-magic-link.js

# Debug utilities
node tests/debug/debug-auth-callback.js
node tests/debug/debug-auth.js
node tests/debug/debug-session-issue.js

# Test scripts
bash tests/scripts/test-magic-link-fix.sh

# Utility tests
node tests/utils/test-env.js
node tests/utils/test-import.js
```

## Migration Notes

These files were moved from the root directory to improve project organization. The files are:

- **Standalone** - No dependencies on their location
- **Self-contained** - Can be run from any location
- **Development tools** - Not part of automated CI/CD
- **Manual execution** - Require explicit running by developers

## Maintenance

When adding new test files:

1. **Automated tests** → Place in appropriate automated test directories
2. **Manual development tools** → Place in appropriate manual test directories
3. **Update this documentation** → Keep this file current
4. **Follow naming conventions** → Use descriptive, consistent names

## Important Notes

- These manual test files are **NOT** part of the automated test suite
- They are **development tools** for debugging and validation
- They do **NOT** affect CI/CD workflows or production functionality
- They can be safely moved or reorganized without breaking anything
