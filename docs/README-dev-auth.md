# YEC Day Admin Authentication Flow

## Overview

This document describes the authentication flow for the YEC Day admin dashboard using Supabase magic links.

## Authentication Flow

### 1. Magic Link Request
- User enters email on `/admin/login`
- System sends magic link via Supabase OTP
- Magic link redirects to `/auth/callback` with tokens in URL hash

### 2. Client-Side Token Extraction
- `/auth/callback` page runs client-side
- Extracts `access_token` and `refresh_token` from `location.hash`
- POSTs tokens to `/auth/callback` (server route)

### 3. Server-Side Verification
- Server route verifies tokens with Supabase Admin API
- Checks if user email is in `ADMIN_EMAILS` allowlist
- Sets three HttpOnly cookies in single 303 redirect response:
  - `sb-access-token`: Supabase access token
  - `sb-refresh-token`: Supabase refresh token  
  - `admin-email`: User's email address

### 4. Middleware Protection
- Middleware checks for `admin-email` cookie
- If present: allows access to `/admin/*` routes
- If missing: redirects to `/admin/login?next=<path>`

## Development Testing

### Quick Test Flow
1. Start dev server: `npm run dev`
2. Call magic link endpoint: `GET /api/test/magic-link?email=<admin-email>`
3. Open the returned `actionLink` in browser
4. Should land on `/auth/callback` showing "Processing..."
5. Client POSTs tokens, receives 303 with three `Set-Cookie` headers
6. Browser redirects to `/admin` and passes middleware
7. Admin dashboard shows "Authenticated" status

### Debug Endpoints
- `GET /api/debug/cookies` - Shows current cookies and auth status
- `GET /api/test/magic-link?email=...` - Generates test magic link

## Important Dev Caveats

### URL Hash + Cookies
Magic link tokens arrive in the **URL hash** (`#access_token=...&refresh_token=...`), which is **not visible to server routes**. This is why we:

1. Extract tokens client-side in `/auth/callback` page
2. POST tokens to server route for verification
3. Set HttpOnly cookies in the redirect response

### Cookie Configuration
Cookies are configured with:
- `httpOnly: true` - Prevents XSS access
- `secure: process.env.NODE_ENV === 'production'` - HTTPS only in production
- `sameSite: 'lax'` - CSRF protection
- `path: '/'` - Available across the site
- `maxAge: 7 days` - Reasonable expiration

### Node Fetch Limitation
When testing with `fetch()` in Node.js scripts, cookies are **not automatically persisted** between requests. This is expected behavior - cookies only persist in browsers.

## Environment Variables

Required for authentication:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key for token verification
- `ADMIN_EMAILS` - Comma-separated list of admin email addresses
- `NEXT_PUBLIC_APP_URL` - App URL for magic link redirects

## Security Notes

- Tokens are masked in logs (first/last 4 chars only)
- Admin access is controlled by email allowlist
- All auth cookies are HttpOnly to prevent XSS
- Middleware provides route-level protection
- Debug endpoints are disabled in production
