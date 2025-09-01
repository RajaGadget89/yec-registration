# Admins Sorting Reproduction Test Findings - UAT-03

## Test Summary

**Test File**: `tests/e2e/admins-sorting.repro.spec.ts`  
**Date**: 2025-01-31  
**Status**: ✅ **REPRODUCTION SUCCESSFUL**

## Problem Statement

**Contract (Expected)**: GET /api/admin/management/admins should honor `sortBy` and `sortOrder` parameters sent by the Admins tab UI.

**Actual (Found)**: API **ignores** `sortBy` and `sortOrder` parameters, always sorting by `created_at DESC` (hardcoded).

## Test Results

### 1. Email Sorting Test: sortBy=email&sortOrder=asc

**Preconditions**:
- ✅ Authenticated as super_admin: raja.gadgets89@gmail.com
- ✅ Feature flag: adminManagement enabled
- ✅ API returns 200 status with 55 total admins

**Test Execution**:
```bash
GET /api/admin/management/admins?page=1&pageSize=10&sortBy=email&sortOrder=asc
```

**Results**:
- **Status**: ❌ **FAILED** (Expected: PASS)
- **Evidence**: API ignores sorting parameters
- **Received emails**: Not alphabetically sorted
- **Expected emails**: Alphabetically sorted

**Diagnostic Table**:
```
┌─────────────────────────────────────────────────────────────┐
│ Email Sorting Mismatch Evidence                            │
├─────────────────────────────────────────────────────────────┤
│ Parameter: sortBy=email&sortOrder=asc                      │
│ Expected:  Alphabetically sorted emails                    │
│ Actual:    Emails in original order (likely by created_at) │
│ Status:    ❌ FAILED - Sorting ignored                     │
└─────────────────────────────────────────────────────────────┘
```

**First Mismatch Details**:
- Position: 0
- Received: `activate-test-test-1756623961165-b1iqajrjc@example.com`
- Expected: `accept-test-test-1756623927104-1tghaq4p8@example.com`

### 2. Control Test: Default created_at Ordering

**Test Execution**:
```bash
GET /api/admin/management/admins?page=1&pageSize=5
```

**Results**:
- **Status**: ✅ **PASSED** (Expected: PASS)
- **Evidence**: API correctly sorts by created_at DESC
- **Created dates**: Strictly non-increasing order
- **Behavior**: Confirms current hardcoded sorting

**Control Test Results**:
```
┌─────────────────────────────────────────────────────────────┐
│ Default Ordering Control Test                              │
├─────────────────────────────────────────────────────────────┤
│ Parameter: No sorting parameters (default)                 │
│ Expected:  created_at DESC (newest first)                  │
│ Actual:    created_at DESC (newest first)                  │
│ Status:    ✅ PASSED - Default behavior confirmed          │
└─────────────────────────────────────────────────────────────┘
```

## Root Cause Analysis

### API Implementation Issue

The API implementation in `app/api/admin/management/admins/route.ts` has **hardcoded sorting**:

```typescript
// Apply pagination
const offset = (page - 1) * pageSize;
query = query
  .order("created_at", { ascending: false })  // ← HARDCODED
  .range(offset, offset + pageSize - 1);
```

### Parameter Handling

**API Contract** (what it accepts):
- ✅ `page` - Page number
- ✅ `pageSize` - Items per page  
- ✅ `q` - Search by email
- ✅ `status` - Filter by status
- ✅ `role` - Filter by role
- ❌ `sortBy` - **IGNORED**
- ❌ `sortOrder` - **IGNORED**

**UI Implementation** (what it sends):
- ✅ `page` - Page number
- ✅ `pageSize` - Items per page
- ✅ `q` - Search by email
- ✅ `role` - Filter by role
- ✅ `status` - Filter by status
- ✅ `sortBy` - Sort field (email, created_at, role, last_login_at)
- ✅ `sortOrder` - Sort direction (asc, desc)

## Evidence Summary

### Sorting Parameter Mismatch

| Parameter | API Contract | UI Sends | Status | Issue |
|-----------|-------------|----------|--------|-------|
| `sortBy` | ❌ **IGNORED** | ✅ Sends | ❌ **MISMATCH** | API hardcodes `created_at DESC` |
| `sortOrder` | ❌ **IGNORED** | ✅ Sends | ❌ **MISMATCH** | API hardcodes `created_at DESC` |

### Test Outcome Summary

| Test | Expected | Actual | Status | Evidence |
|------|----------|--------|--------|----------|
| Email Sorting | ✅ PASS | ❌ FAIL | ❌ **RED** | Sorting parameters ignored |
| Default Ordering | ✅ PASS | ✅ PASS | ✅ **GREEN** | Hardcoded behavior confirmed |

## Impact Analysis

### Current Behavior
- **UI sends**: `sortBy=email&sortOrder=asc`
- **API ignores**: Both parameters
- **Result**: Users see data sorted by creation date, not by their selection
- **User Experience**: Confusing and inconsistent with UI expectations

### Expected Behavior
- **UI sends**: `sortBy=email&sortOrder=asc`
- **API honors**: Both parameters
- **Result**: Users see data sorted alphabetically by email
- **User Experience**: Consistent and predictable

## Recommended Solution

### Option 1: Server Shim (Recommended)

Add sorting parameter handling to the API:

```typescript
// Parse sorting parameters
const sortBy = url.searchParams.get("sortBy") || "created_at";
const sortOrder = url.searchParams.get("sortOrder") || "desc";

// Validate sortBy field
const allowedSortFields = ["created_at", "email", "role", "last_login_at"];
const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
const validSortOrder = sortOrder === "asc" ? true : false;

// Apply sorting
query = query
  .order(validSortBy, { ascending: validSortOrder })
  .range(offset, offset + pageSize - 1);
```

### Benefits
- ✅ **Minimal Change**: Only API endpoint modification
- ✅ **Backward Compatible**: Default behavior preserved
- ✅ **UI Alignment**: Matches UI expectations
- ✅ **Validation**: Safe parameter handling
- ✅ **Testable**: This test will turn GREEN

## Test Artifacts

### Playwright Trace
- **File**: `test-results/admins-sorting.repro-Admin-6eb8d-ortOrder-asc-→-ignored-RED--chromium/trace.zip`
- **Command**: `npx playwright show-trace test-results/admins-sorting.repro-Admin-6eb8d-ortOrder-asc-→-ignored-RED--chromium/trace.zip`

### Diagnostic Output
The test provides comprehensive diagnostic output including:
- Received vs expected email ordering
- First mismatch position and values
- API response details
- Sorting parameter analysis

## Next Steps

1. **Verify Test**: This test is now RED, proving the sorting issue exists
2. **Implement Fix**: Add server-side sorting parameter handling
3. **Verify Fix**: Test should turn GREEN after patch
4. **Regression**: Ensure other functionality remains intact

## Conclusion

The UAT-03 test successfully reproduces and proves that the GET /api/admin/management/admins API currently ignores the `sortBy` and `sortOrder` parameters sent by the Admins tab UI. The test provides clear evidence of the mismatch and will serve as a reliable guardrail for the upcoming patch implementation.

**Status**: ✅ **REPRODUCTION SUCCESSFUL** - Ready for PATCH phase
