# YEC Registration System

## Tests

- `npm run test:phase1` — Phase 1 workflows (green)
- `npm run test:api` — All API tests (includes legacy; may fail)
- `npm run test:all` — Whole repo
- The file `tests/api/register.legacy.spec.ts` is legacy and excluded from Phase 1.

## Test Artifacts

### test-artifacts/
- **Purpose**: E2E test debugging artifacts (audit logs)
- **Generated**: Automatically during E2E test runs
- **Content**: Access logs, event logs in JSON and CSV formats
- **Structure**: `test-artifacts/audit/e2e-{timestamp}-{id}/`
- **Usage**: Debug failed tests by examining audit trail
- **Cleanup**: Safe to delete, regenerated on next test run

### test-results/
- **Purpose**: Playwright test results and screenshots
- **Generated**: Automatically during test runs
- **Content**: Test reports, screenshots, visual regression data
- **Usage**: Visual regression testing and test result storage
- **Cleanup**: Safe to delete, regenerated on next test run

### Maintenance
Both folders are automatically generated and excluded from version control (`.gitignore`). They can be safely deleted to free up disk space and will be regenerated during the next test run.

## Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Supabase CLI (optional, for local development)

### Environment Variables
Copy `env.template` to `.env.local` and configure:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `NEXT_PUBLIC_SUPABASE_URL` - Public URL for client-side operations

### Running Tests
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:phase1
npm run test:api

# Run E2E tests
npm run test:e2e

# Clean up test artifacts (optional)
rm -rf test-artifacts/* test-results/*
```

# Trigger new workflow run - Tue Aug 19 12:41:43 +07 2025
