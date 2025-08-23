# Test Reusability Guide

This guide explains how to effectively use existing tests in the `tests/` folder and when to create new tests. It provides patterns, examples, and decision trees to help you choose the right testing approach.

## Table of Contents

1. [Test Categories Overview](#test-categories-overview)
2. [When to Reuse vs. Create New Tests](#when-to-reuse-vs-create-new-tests)
3. [Automated Test Reusability](#automated-test-reusability)
4. [Manual Development Tools Reusability](#manual-development-tools-reusability)
5. [Common Testing Patterns](#common-testing-patterns)
6. [Test Utilities and Helpers](#test-utilities-and-helpers)
7. [Decision Trees](#decision-trees)
8. [Best Practices](#best-practices)

## Test Categories Overview

### Automated Tests (CI/CD)
- **API Tests** (`tests/api/`) - Unit tests for API endpoints
- **E2E Tests** (`tests/e2e/`) - End-to-end workflow tests
- **Unit Tests** (root `tests/`) - Component and utility tests
- **Migration Tests** (`tests/migrations/`) - Database migration validation

### Manual Development Tools
- **Audit Tests** (`tests/audit/`) - Audit system validation
- **Auth Tests** (`tests/auth/`) - Authentication flow testing
- **Debug Tools** (`tests/debug/`) - Troubleshooting utilities
- **Scripts** (`tests/scripts/`) - Shell scripts and tools

## When to Reuse vs. Create New Tests

### ✅ REUSE Existing Tests When:

1. **Testing the same functionality** - If a test already covers your use case
2. **Similar validation patterns** - Email validation, form validation, etc.
3. **Common workflows** - Registration, authentication, email dispatch
4. **Environment setup** - Database connections, Supabase setup
5. **Debugging similar issues** - Auth problems, session issues, etc.

### 🆕 CREATE New Tests When:

1. **New functionality** - Features not covered by existing tests
2. **Different edge cases** - New error conditions or scenarios
3. **Performance testing** - Load testing, stress testing
4. **Security testing** - New security scenarios
5. **Integration testing** - New third-party integrations

## Automated Test Reusability

### API Tests (`tests/api/`)

#### Reusable Patterns:

**1. Registration API Testing**
```bash
# Use existing registration tests
npm run test:unit:register

# Available test files:
# - register.spec.ts - Basic registration validation
# - register.legacy.spec.ts - Legacy registration flow
# - register.unique-conflict.spec.ts - Duplicate handling
# - register.error-shape.spec.ts - Error response validation
# - register.submit-flow.spec.ts - Complete submission flow
# - register.duplicates-by-name.spec.ts - Name-based duplicates
```

**2. Admin API Testing**
```bash
# Use existing admin tests
npm run test:unit:admin

# Available test files:
# - admin.auth.spec.ts - Admin authentication
# - admin.approval-flow.spec.ts - Registration approval workflow
```

**3. Database Routing Testing**
```bash
# Test database routing configuration
npm run test:db-routing
```

#### When to Extend vs. Create New:

**Extend Existing Tests When:**
- Adding new validation rules to registration
- New admin approval steps
- Additional error conditions

**Create New Tests When:**
- New API endpoints
- Different authentication methods
- New business logic workflows

### E2E Tests (`tests/e2e/`)

#### Reusable Workflows:

**1. Registration Workflow**
```bash
# Complete user registration flow
npm run test:e2e:registration-workflow

# Available workflows:
# - registration-user-workflow.e2e.spec.ts - Full user registration
# - new-applicant.full.spec.ts - New applicant registration
# - new-applicant.real.spec.ts - Real email registration
```

**2. Email Dispatch Testing**
```bash
# Email system testing
npm run test:e2e:email

# Available tests:
# - dispatch-emails.e2e.spec.ts - Email dispatch workflow
# - dispatch-emails.capped.e2e.spec.ts - Capped email testing
# - dispatch-emails-html-validation.e2e.spec.ts - HTML validation
# - email-templates.e2e.spec.ts - Email template testing
```

**3. Authentication Testing**
```bash
# Authentication flow testing
npm run test:e2e:auth

# Available tests:
# - auth-comprehensive.spec.ts - Complete auth flow
# - auth.e2e.spec.ts - Basic authentication
# - magic-link-callback.spec.ts - Magic link flow
```

**4. Audit System Testing**
```bash
# Audit system validation
npm run test:audit

# Available tests:
# - audit-diag.e2e.spec.ts - Audit diagnostics
# - audit-dashboard.e2e.spec.ts - Audit dashboard
# - audit-login.e2e.spec.ts - Audit login flow
```

#### When to Extend vs. Create New:

**Extend Existing Tests When:**
- Adding new steps to existing workflows
- New validation in registration flow
- Additional email templates

**Create New Tests When:**
- New user journeys
- Different user roles
- New features not in existing workflows

### Unit Tests (Root `tests/`)

#### Reusable Email Testing:
```bash
# Email system unit tests
npm run test:unit:email

# Available tests:
# - email-config.spec.ts - Email configuration
# - email-transport.spec.ts - Email transport
# - email-render.spec.ts - Email rendering
# - email-system.spec.ts - Complete email system
# - email-outbox.spec.ts - Email outbox management
```

#### When to Extend vs. Create New:

**Extend Existing Tests When:**
- New email templates
- Additional email configuration options
- New transport methods

**Create New Tests When:**
- New email providers
- Different email formats
- New notification systems

## Manual Development Tools Reusability

### Audit Tests (`tests/audit/`)

#### Reusable for:
- **Database audit validation** - Check audit logs and schema
- **Audit client testing** - Test audit client operations
- **Schema validation** - Verify audit schema setup

```bash
# Test audit logs
node tests/audit/test-audit-logs.js

# Test audit client
node tests/audit/test-audit-client.js

# Test audit schema
node tests/audit/test-audit-schema.js
```

**When to Use:**
- Setting up audit system
- Debugging audit issues
- Validating audit configuration

### Authentication Tests (`tests/auth/`)

#### Reusable for:
- **Magic link flow testing** - Test authentication workflows
- **Real authentication testing** - Test with real Supabase tokens
- **Authentication debugging** - Debug auth issues

```bash
# Test magic link flow
node tests/auth/test-magic-link-flow.js

# Test real magic link
node tests/auth/test-real-magic-link.js

# Debug magic link issues
node tests/auth/test-real-magic-link-debug.js
```

**When to Use:**
- Setting up authentication
- Debugging auth problems
- Testing auth flows

### Debug Tools (`tests/debug/`)

#### Reusable for:
- **Authentication callback debugging** - Debug auth callback issues
- **General auth debugging** - Debug authentication problems
- **Session issue debugging** - Debug session-related problems

```bash
# Debug auth callback
node tests/debug/debug-auth-callback.js

# Debug general auth
node tests/debug/debug-auth.js

# Debug session issues
node tests/debug/debug-session-issue.js
```

**When to Use:**
- Troubleshooting auth issues
- Debugging session problems
- Investigating callback failures

### Test Scripts (`tests/scripts/`)

#### Reusable for:
- **Magic link fix testing** - Test magic link fixes

```bash
# Test magic link fixes
bash tests/scripts/test-magic-link-fix.sh
```

**When to Use:**
- Testing magic link fixes
- Validating auth repairs

## Common Testing Patterns

### 1. API Testing Pattern

**Reuse this pattern for new API endpoints:**

```typescript
// Pattern from tests/api/register.spec.ts
import { describe, it, expect } from "vitest";
import { createMocks } from "node-mocks-http";

describe("Your API Endpoint", () => {
  const mockValidData = {
    // Your test data
  };

  it("should handle validation errors", async () => {
    const invalidData = {
      ...mockValidData,
      // Invalid field
    };

    const { req } = createMocks({
      method: "POST",
      body: invalidData,
    });

    const { POST } = await import("../../app/api/your-endpoint/route");
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBeDefined();
    expect(data.errorId).toBeDefined();
  });
});
```

### 2. E2E Testing Pattern

**Reuse this pattern for new workflows:**

```typescript
// Pattern from tests/e2e/registration-user-workflow.e2e.spec.ts
import { test, expect } from '@playwright/test';

test('Your Workflow', async ({ page }) => {
  // Setup
  await page.goto('/your-page');
  
  // Action
  await page.fill('[data-testid="input"]', 'test value');
  await page.click('[data-testid="submit"]');
  
  // Assertion
  await expect(page.locator('[data-testid="success"]')).toBeVisible();
});
```

### 3. Email Testing Pattern

**Reuse this pattern for email testing:**

```typescript
// Pattern from tests/email-config.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Your Email Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("should handle email configuration", () => {
    // Your email test
  });
});
```

## Test Utilities and Helpers

### Supabase Test Client

**Reuse for database testing:**

```typescript
// From tests/e2e/helpers/supabaseTestClient.ts
import { SupabaseTestClient } from './helpers/supabaseTestClient';

const client = new SupabaseTestClient();

// Query audit logs
const accessLogs = await client.getAccessLogsByRequestId('request-id');

// Query event logs
const eventLogs = await client.getEventLogsByCorrelationId('correlation-id');
```

### Environment Setup

**Reuse for environment testing:**

```typescript
// From tests/setup.ts
import { vi } from 'vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
```

## Decision Trees

### Should I Reuse or Create a New Test?

```
Is there an existing test for this functionality?
├─ YES → Does it cover your specific use case?
│  ├─ YES → REUSE existing test
│  └─ NO → Can you extend the existing test?
│     ├─ YES → EXTEND existing test
│     └─ NO → CREATE new test
└─ NO → CREATE new test
```

### Which Test Category Should I Use?

```
What are you testing?
├─ API Endpoint → tests/api/
├─ User Workflow → tests/e2e/
├─ Component/Utility → Root tests/
├─ Database Migration → tests/migrations/
├─ Audit System → tests/audit/
├─ Authentication → tests/auth/
├─ Debugging → tests/debug/
└─ Scripts → tests/scripts/
```

### When to Use Manual vs. Automated Tests?

```
Is this for:
├─ CI/CD Pipeline → Automated tests
├─ Development Debugging → Manual tools
├─ Production Validation → Automated tests
├─ Troubleshooting → Manual tools
└─ Feature Testing → Automated tests
```

## Best Practices

### 1. Test Naming Conventions

**Follow existing patterns:**
- API tests: `feature.spec.ts` or `feature.error-shape.spec.ts`
- E2E tests: `workflow-name.e2e.spec.ts`
- Manual tools: `test-feature.js` or `debug-feature.js`

### 2. Test Organization

**Place tests in appropriate directories:**
- New API endpoints → `tests/api/`
- New workflows → `tests/e2e/`
- New utilities → Root `tests/`
- New debug tools → `tests/debug/`

### 3. Test Reusability

**Make tests reusable by:**
- Using parameterized test data
- Creating shared test utilities
- Following consistent patterns
- Documenting test purposes

### 4. Environment Management

**Use appropriate environments:**
- Unit tests → Mocked environment
- E2E tests → Test database
- Manual tools → Local development environment

### 5. Documentation

**Document your tests:**
- Purpose and scope
- Prerequisites
- Expected outcomes
- Known limitations

## Quick Reference Commands

### Automated Tests
```bash
# Run all tests
npm test

# Run specific categories
npm run test:unit:email
npm run test:e2e:all
npm run test:audit

# Run individual files
npm run test:unit:register
npm run test:e2e:registration-workflow
```

### Manual Tools
```bash
# Audit testing
node tests/audit/test-audit-logs.js

# Authentication testing
node tests/auth/test-magic-link-flow.js

# Debugging
node tests/debug/debug-auth-callback.js

# Scripts
bash tests/scripts/test-magic-link-fix.sh
```

### Development Workflow
```bash
# 1. Check existing tests first
ls tests/api/ | grep your-feature
ls tests/e2e/ | grep your-workflow

# 2. Run relevant existing tests
npm run test:unit:your-feature

# 3. Extend or create new tests as needed
# 4. Update this documentation
```

## Summary

This guide helps you make informed decisions about test reusability. Remember:

1. **Always check existing tests first** - Don't recreate what already exists
2. **Extend when possible** - Add to existing tests rather than creating duplicates
3. **Follow established patterns** - Use consistent approaches across the codebase
4. **Document your decisions** - Help others understand your testing choices
5. **Keep tests maintainable** - Write tests that are easy to understand and modify

By following this guide, you'll maximize test reusability while maintaining a clean, organized test suite.
