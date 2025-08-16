# Authentication Troubleshooting Guide

## Overview

This guide helps diagnose and fix authentication issues, particularly around cookie persistence and Set-Cookie header problems.

## Quick Diagnostics

### 1. Check Environment Variables

Ensure these are set correctly:

```bash
# Required for auth flow
NEXT_PUBLIC_APP_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Admin emails (comma-separated)
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### 2. Run Origin Consistency Audit

```bash
# Generate audit report
cat tmp/auth-origin-report.txt
```

### 3. Run E2E Authentication Test

```bash
# Install Playwright if needed
npm run e2e:install

# Run the auth test
npm run e2e tests/e2e/auth.spec.ts

# Check test output
cat tmp/auth-test-output-http-localhost-8080.json
```

## Common Issues

### Issue: Authentication Status Shows "Not Authenticated" When Logged In

**Symptoms:**
- User can access admin dashboard successfully
- Authentication status bar shows "Not Authenticated" instead of "Admin"
- User information not displayed in header

**Diagnosis:**
1. Check if `getCurrentUser()` function is working correctly
2. Verify custom cookies (`admin-email`) are being set
3. Check if fallback mechanism is working

**Fix:**
The `getCurrentUser()` function now includes a fallback mechanism to check for custom `admin-email` cookies when Supabase session cookies are not available.

### Issue: Authentication Status Persists After Logout

**Symptoms:**
- User logs out successfully (redirected to login page)
- Authentication status bar still shows "Admin" and user email
- Confusing user experience

**Diagnosis:**
1. Check if all authentication cookies are being cleared
2. Verify logout route is clearing custom cookies
3. Check if `admin-email` cookie is being expired

**Fix:**
The logout functionality now properly clears all authentication cookies including `admin-email`, `sb-access-token`, `sb-refresh-token`, and `dev-user-email`.

### Issue: Set-Cookie Headers Missing

**Symptoms:**
- Login appears successful but user gets redirected back to login
- No cookies visible in browser DevTools
- Network tab shows no Set-Cookie headers

**Diagnosis:**
1. Check the E2E test output for Set-Cookie headers
2. Verify `NEXT_PUBLIC_APP_URL` matches the actual URL being used
3. Check for origin mismatches between localhost and 127.0.0.1

**Fix:**
```bash
# Set explicit APP_URL
export NEXT_PUBLIC_APP_URL=http://localhost:8080

# Restart the development server
npm run dev
```

### Issue: Cookies Not Persisting

**Symptoms:**
- Cookies appear briefly then disappear
- User logged out after page refresh
- Cookies visible in DevTools but not in application

**Diagnosis:**
1. Check cookie properties in browser DevTools
2. Verify `httpOnly`, `secure`, `sameSite` settings
3. Check for domain/path mismatches

**Fix:**
- Ensure `secure: false` in development
- Verify `sameSite: 'lax'` is set
- Check that `path: '/'` is correct

### Issue: Magic Link Callback Error

**Symptoms:**
- Clicking magic link shows "Authentication Failed" error
- Browser console shows `[callback] server error: {}`
- Magic link contains valid tokens but fails to process

**Diagnosis:**
1. Check browser console for error messages
2. Verify magic link contains valid tokens
3. Check if callback page is processing correctly

**Fix:**
- ✅ **FIXED**: Updated callback page error handling
- Clear browser cache and try again
- Use incognito/private browsing mode
- Check spam folder for magic link emails

### Issue: Origin Mismatch

**Symptoms:**
- Authentication works on localhost but not 127.0.0.1
- CORS errors in console
- Cookies not set when accessing via different host

**Diagnosis:**
1. Run E2E test on both localhost and 127.0.0.1
2. Check Supabase redirect URLs configuration
3. Verify all auth flows use consistent base URL

**Fix:**
```bash
# Update Supabase redirect URLs to include both hosts
# In Supabase Dashboard > Authentication > URL Configuration:
http://localhost:8080/auth/callback
http://127.0.0.1:8080/auth/callback
```

## Development Workflow

### 1. Start Development Server

```bash
# Start with explicit port
npm run dev
```

### 2. Test Authentication Flow

```bash
# Run E2E test
npm run e2e tests/e2e/auth.spec.ts

# Check results
ls -la tmp/auth-test-output-*.json
```

### 3. Debug with Network Tracing

```bash
# Enable auth tracing
export AUTH_TRACE=1
npm run dev
```

### 4. Check Cookie State

```bash
# View test artifacts
cat tmp/cookies.json
```

### 5. Verify Authentication Status

```bash
# Check current authentication status
curl -s http://localhost:8080/api/whoami | jq .

# Test with authentication cookies
curl -s http://localhost:8080/api/whoami -H "Cookie: admin-email=test@example.com" | jq .

# Test logout functionality
curl -I http://localhost:8080/admin/logout -b cookies.txt
```

## Production Considerations

### Environment Variables

```bash
# Production settings
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Cookie Security

In production, cookies will automatically be:
- `secure: true` (HTTPS only)
- `httpOnly: true` (not accessible via JavaScript)
- `sameSite: 'lax'` (CSRF protection)

### Supabase Configuration

Ensure Supabase redirect URLs include your production domain:
```
https://yourdomain.com/auth/callback
```

## Monitoring and Logging

### Enable Debug Logging

```bash
# Enable all auth debugging
export AUTH_TRACE=1
export NODE_ENV=development
```

### Check Logs

Look for these log patterns:
- `[callback] setting cookies:` - Cookie setting confirmation
- `[auth-debug] middleware:` - Middleware decisions
- `[E2E]` - Test execution steps

### Network Analysis

Use browser DevTools Network tab to:
1. Check Set-Cookie headers in responses
2. Verify redirect chains
3. Confirm cookie persistence across requests

## Troubleshooting Checklist

- [ ] Environment variables set correctly
- [ ] Supabase redirect URLs configured
- [ ] E2E test passes on both localhost and 127.0.0.1
- [ ] Set-Cookie headers present in network responses
- [ ] Cookies persist after redirect
- [ ] No CORS or origin errors in console
- [ ] Middleware allows authenticated requests
- [ ] Admin email in allowlist
- [ ] Authentication status shows correctly when logged in
- [ ] Authentication status clears properly when logged out
- [ ] All authentication cookies are cleared on logout

## Getting Help

If issues persist:

1. Run the E2E test and share the output
2. Check the auth origin report
3. Verify environment variables
4. Test with a clean browser session
5. Check Supabase logs for authentication errors
