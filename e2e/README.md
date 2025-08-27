# E2E Testing for YEC Registration

This directory contains Playwright E2E tests for the YEC Registration system, covering acceptance criteria AC2-AC6.

## Test Structure

### Test Files
- `ac2.request-update.spec.ts` - Request update flow
- `ac3.deep-link-update.spec.ts` - Deep link update flow  
- `ac4.mark-pass.spec.ts` - Mark pass functionality
- `ac5.approve.spec.ts` - Approve registration flow
- `ac6.file-validation.spec.ts` - File validation testing

### Test Projects
- `superAdmin` - Tests with super admin permissions
- `adminPayment` - Tests with payment admin permissions
- `adminProfile` - Tests with profile admin permissions
- `adminTcc` - Tests with TCC admin permissions

### Test Selectors
All tests use stable `data-testid` selectors:

- `reg-row` - Registration table row (with `data-id` and `data-email`)
- `reg-open` - Open drawer trigger
- `drawer-root` - Details drawer
- `chip-payment`, `chip-profile`, `chip-tcc` - Status chips
- `btn-request-payment`, `btn-pass-payment` - Action buttons
- `btn-request-profile`, `btn-pass-profile` - Action buttons
- `btn-request-tcc`, `btn-pass-tcc` - Action buttons
- `btn-approve` - Global approve button
- `modal-request` - Request update modal
- `input-notes` - Notes textarea
- `btn-submit-request` - Submit request button
- `update-root` - Update page root
- `update-invalid` - Invalid update state
- `file-payment`, `file-profile`, `file-tcc` - File inputs
- `btn-update-submit` - Update submit button
- `outbox-row` - Email outbox row
- `outbox-body` - Email body container

## Setup

### 1. Environment Configuration
Copy the environment template and configure:
```bash
cp env.e2e.template .env.e2e
# Edit .env.e2e with your values
```

### 2. Install Playwright
```bash
npm run e2e:install
```

### 3. Create Authentication States
```bash
npx playwright test --config=playwright.config.ts --grep="global.setup"
```

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### With UI
```bash
npm run test:e2e:ui
```

### Show Report
```bash
npm run test:e2e:report
```

### Individual Test Files
```bash
npx playwright test e2e/ac2.request-update.spec.ts
npx playwright test e2e/ac3.deep-link-update.spec.ts
npx playwright test e2e/ac4.mark-pass.spec.ts
npx playwright test e2e/ac5.approve.spec.ts
npx playwright test e2e/ac6.file-validation.spec.ts
```

### Specific Projects
```bash
npx playwright test --project=superAdmin
npx playwright test --project=adminPayment
npx playwright test --project=adminProfile
npx playwright test --project=adminTcc
```

## Test Data

### Sample Files
The `e2e/files/` directory contains sample files for testing:
- `profile-ok.jpg` - Valid profile image (~100KB)
- `payment-ok.jpg` - Valid payment image (~100KB)
- `payment-ok.pdf` - Valid payment PDF (~100KB)
- `payment-too-big.pdf` - Oversized file (~6MB)
- `profile-wrong-type.pdf` - Wrong file type for profile
- `tcc-ok.jpg` - Valid TCC image (~100KB)

### Test Users
- `alice@yec.dev` - Super admin
- `raja.gadgets89@gmail.com` - Payment and profile admin
- `dave@yec.dev` - TCC admin

## Test Endpoints

### Test-only Authentication
- `POST /api/test/auth/login` - Programmatic login for tests
- Requires `E2E_TEST_MODE=true` and valid HMAC

### Test Registration Data
- `GET /api/test/registrations/one` - Get most recent waiting_for_review registration

## Acceptance Criteria Coverage

### AC2: Request Update Flow
- Admin requests profile update
- Status changes to needs_update
- Email sent with update link

### AC3: Deep Link Update Flow
- Extract update link from email
- Test invalid link handling
- Test valid update submission
- Status returns to waiting_for_review

### AC4: Mark Pass Flow
- Admin marks dimensions as passed
- Status chips update correctly
- RBAC permissions enforced

### AC5: Approve Flow
- Super admin approves when all dimensions passed
- Global status becomes approved
- Approval email sent

### AC6: File Validation
- File size validation (≤5MB)
- File type validation (JPEG/PNG only for profile)
- Error messages displayed correctly

## Troubleshooting

### Authentication Issues
- Ensure `E2E_TEST_MODE=true` in environment
- Verify `E2E_AUTH_SECRET` is set correctly
- Check admin email allowlists are configured

### Test Data Issues
- Ensure registrations with `status='waiting_for_review'` exist
- Verify sample files are present in `e2e/files/`

### Environment Issues
- Check Supabase connection and permissions
- Verify email configuration for DRY_RUN mode
- Ensure all required environment variables are set
