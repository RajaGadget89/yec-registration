# ESLint and TypeScript Testing Guide

## Overview

This document describes the ESLint and TypeScript testing setup for the YEC Registration project. The setup provides comprehensive code quality checks while maintaining practical usability for development.

## Configuration Files

### ESLint Configuration (`eslint.config.mjs`)

The ESLint configuration uses the new flat config format and includes:

- **Next.js Core Web Vitals**: Performance and accessibility rules
- **TypeScript Rules**: Type safety and code quality
- **React Rules**: JSX and React-specific best practices
- **Custom Rules**: Project-specific configurations

#### Key Features:
- **Unused Variables**: Warns about unused variables (allows `_` prefix for intentional unused vars)
- **Type Safety**: Warns about `any` types but doesn't block development
- **Code Quality**: Enforces consistent code style and best practices
- **File-Specific Overrides**: Different rules for test files and email templates

### TypeScript Configuration (`tsconfig.json`)

The TypeScript configuration balances strictness with practicality:

#### Strict Checks Enabled:
- `noImplicitAny`: Prevents implicit `any` types
- `noImplicitReturns`: Ensures all code paths return values
- `noImplicitThis`: Prevents implicit `this` usage
- `noImplicitOverride`: Requires explicit override keyword

#### Practical Relaxations:
- `noUnusedLocals`: Disabled for development flexibility
- `noUnusedParameters`: Disabled for development flexibility
- `exactOptionalPropertyTypes`: Disabled (too restrictive for current codebase)
- `noUncheckedIndexedAccess`: Disabled (too restrictive for current codebase)
- `verbatimModuleSyntax`: Disabled (too restrictive for current codebase)

## Available Scripts

### TypeScript Testing
```bash
# Basic type checking
npm run type-check

# Strict type checking (all strict flags enabled)
npm run type-check:strict

# Type checking with success message
npm run test:types
```

### ESLint Testing
```bash
# Basic linting
npm run lint

# Linting with auto-fix
npm run lint:fix

# Linting with zero warnings allowed
npm run test:lint

# Linting with auto-fix and zero warnings
npm run test:lint:fix
```

### Combined Code Quality Testing
```bash
# Run both TypeScript and ESLint checks
npm run test:code-quality

# Run ESLint with auto-fix, then TypeScript check
npm run test:code-quality:fix

# Run all tests (code quality + unit + e2e)
npm run test:all
```

## Common Issues and Solutions

### TypeScript Errors

#### 1. File Extension Issues
**Problem**: JSX code in `.ts` files
```typescript
// ❌ Wrong
// app/lib/emails/render.ts (contains JSX)

// ✅ Correct
// app/lib/emails/render.tsx (contains JSX)
```

**Solution**: Rename files with JSX content to `.tsx` extension

#### 2. Import Issues
**Problem**: Incorrect import paths or missing exports
```typescript
// ❌ Wrong
import { createClient } from '../supabase-server';

// ✅ Correct
import { getServiceRoleClient } from '../supabase-server';
```

**Solution**: Check the actual exports in the source files

#### 3. Type Mismatches
**Problem**: Status field type mismatches
```typescript
// ❌ Wrong
if (registration.status === 'pending') // 'pending' not in status union

// ✅ Correct
if (registration.status === 'waiting_for_review') // Valid status
```

**Solution**: Use the correct status values from the type definition

### ESLint Warnings

#### 1. Unused Variables
**Problem**: Variables defined but never used
```typescript
// ❌ Warning
const unusedVar = 'something';

// ✅ Correct (prefix with underscore)
const _unusedVar = 'something';
```

#### 2. Any Types
**Problem**: Using `any` type
```typescript
// ❌ Warning
function processData(data: any) { }

// ✅ Better (when possible)
function processData(data: unknown) { }
// or
function processData(data: Record<string, unknown>) { }
```

#### 3. Array Index Keys
**Problem**: Using array index as React key
```typescript
// ❌ Warning
{items.map((item, index) => (
  <div key={index}>{item.name}</div>
))}

// ✅ Correct
{items.map((item) => (
  <div key={item.id}>{item.name}</div>
))}
```

## Best Practices

### 1. Type Safety
- Use specific types instead of `any` when possible
- Leverage TypeScript's type inference
- Use union types for better type safety

### 2. Code Organization
- Keep files focused and under 200 lines
- Use clear, descriptive names
- Group related functionality together

### 3. Error Handling
- Use proper error types
- Handle edge cases explicitly
- Provide meaningful error messages

### 4. Performance
- Avoid unnecessary re-renders
- Use proper React keys
- Optimize imports and dependencies

## CI/CD Integration

The testing setup is designed to work with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Code Quality Check
  run: npm run test:code-quality

- name: Unit Tests
  run: npm run test:unit:email

- name: E2E Tests
  run: npm run test:e2e:all
```

## Troubleshooting

### Common Error Messages

#### "Cannot find module"
- Check file paths and extensions
- Verify exports in source files
- Ensure TypeScript paths are configured correctly

#### "Property does not exist on type"
- Check type definitions
- Use type assertions when necessary
- Verify object structure matches expected types

#### "Expected '>' got 'identifier'"
- Check for JSX in `.ts` files
- Rename to `.tsx` if JSX is present
- Verify JSX syntax is correct

### Getting Help

1. **Check the error location**: Look at the specific file and line number
2. **Read the error message**: TypeScript provides detailed error descriptions
3. **Check type definitions**: Verify the expected types match your usage
4. **Use TypeScript playground**: Test isolated code snippets
5. **Review similar code**: Look at working examples in the codebase

## Future Improvements

### Planned Enhancements
1. **Stricter TypeScript**: Gradually enable more strict checks
2. **Custom ESLint Rules**: Add project-specific rules
3. **Performance Rules**: Add performance-focused linting
4. **Accessibility Rules**: Enhance accessibility checking

### Migration Path
1. **Phase 1**: Fix current TypeScript errors
2. **Phase 2**: Reduce ESLint warnings
3. **Phase 3**: Enable stricter TypeScript checks
4. **Phase 4**: Add custom linting rules

---

*This guide should be updated as the codebase evolves and new patterns emerge.*
