# Authentication Debugging Guide

This document describes the debugging tools and flags available for investigating authentication cookie issues.

## Environment Variables

### `AUTH_TRACE=1`
Enables detailed tracing of authentication-related operations:
- Event system emissions and handler executions
- Middleware decisions and cookie presence
- Cookie setting operations in diagnostic endpoints

### `AUTH_NO_EVENTS=1`
Disables the entire domain event system for auth-related paths:
- Prevents any event emissions during authentication flows
- Useful for isolating whether events interfere with cookie setting

## Diagnostic Endpoints

### `POST /api/_diag/login`
Simulates a login flow that sets the three required cookies:
- `admin-email`
- `sb-access-token` 
- `sb-refresh-token`

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response:**
- 303 redirect to `/admin`
- Sets exactly 3 cookies with proper options
- Headers: `X-Diag: set-cookies`, `X-Set-Cookie-Count: 3`

### `GET /api/_diag/cookies`
Checks which cookies are present in the request:

**Response:**
```json
{
  "timestamp": "2025-01-27T12:30:00Z",
  "authCookies": {
    "admin-email": "present|missing",
    "sb-access-token": "present|missing", 
    "sb-refresh-token": "present|missing"
  },
  "allCookies": ["cookie1", "cookie2"],
  "totalCookies": 2,
  "maskedTokens": {
    "accessToken": "abcd...wxyz",
    "refreshToken": "1234...5678"
  }
}
```

## Testing Workflow

### 1. Test with Events Disabled
```bash
AUTH_TRACE=1 AUTH_NO_EVENTS=1 npm run dev
```

1. `POST /api/_diag/login` → should see 3 Set-Cookie headers
2. Browser follows redirect to `/admin` → check DevTools Application tab
3. `GET /api/_diag/cookies` → should show all 3 cookies present

### 2. Test with Events Enabled
```bash
AUTH_TRACE=1 AUTH_NO_EVENTS=0 npm run dev
```

Repeat the same steps. If cookies go missing, check console for event traces.

### 3. Test Normal Login Flow
```bash
AUTH_TRACE=1 npm run dev
```

Navigate through normal login and check for any handlers creating new responses.

## Known Pitfalls

### Edge vs Node Runtime
- Cookie setting behavior may differ between Edge and Node runtimes
- Diagnostic endpoints use `runtime = 'nodejs'` for consistency

### New Response Objects
- Creating a new `NextResponse` after cookies are set will drop the `Set-Cookie` headers
- Always modify existing response objects when possible
- Middleware should return the same response instance if headers need to be added

### Event Handler Restrictions
- Event handlers should be side-effect only
- Never return `Response` objects from handlers
- Avoid `redirect()` or `permanentRedirect()` calls

## Debugging Output

When `AUTH_TRACE=1`, look for these log patterns:

```
[auth-debug] middleware: path=/admin, cookies=[admin-email, sb-access-token, sb-refresh-token]
[auth-debug] middleware: allowing access (admin-email present)

[auth-debug] emitting event: registration.submitted (event-id)
[auth-debug]   caller: route.ts:402
[auth-debug]   payload keys: [registration]
[auth-debug]   handlers: 4

[auth-debug] _diag/login: setting 3 cookies and redirecting to /admin
[auth-debug] _diag/cookies: auth cookies present: 3 / 3
```

## Troubleshooting

### Cookies Missing After Redirect
1. Check if any event handlers are running during auth flow
2. Verify middleware isn't creating new response objects
3. Ensure cookie options match exactly (httpOnly, sameSite, path, secure)

### Events Interfering
1. Set `AUTH_NO_EVENTS=1` to confirm events are the cause
2. Check for handlers that might be throwing errors
3. Look for any response creation in event handlers

### Middleware Issues
1. Check middleware logs for unexpected redirects
2. Verify allowlist paths are correct
3. Ensure cookie reading logic is working
