# Auth Diagnostics Report - YEC Registration System

## A) Snapshot

### Framework & Runtime
- **Next.js Version**: 15.4.5 (App Router)
- **React Version**: 19.1.0
- **Runtime**: Node.js (no edge runtime detected)
- **Deployment**: Docker containerized (localhost:8080 → container:3000)
- **Router Type**: App Router (confirmed by `app/` directory structure)

### Supabase Integration
- **SDK**: `@supabase/supabase-js` v2.53.0 (only)
- **No SSR helpers**: Not using `@supabase/ssr` or `@supabase/auth-helpers-nextjs`
- **Client Instantiation**:
  - **Server**: `auth-utils.server.ts` with service role key
  - **Client**: `auth-client.ts` with anon key
  - **Middleware**: Direct `createClient()` with service role key

### Environment Variables
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Used in all clients
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Used in client-side
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Used in server-side and middleware
- ✅ `ADMIN_EMAILS` - Used for development fallback

## B) Flow Tracing

### Step 1: Magic Link Trigger (`app/admin/login/page.tsx`)
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```
**Issue**: Uses `window.location.origin` which resolves to `http://localhost:8080` in dev

### Step 2: Auth Callback (`app/auth/callback/page.tsx`)
```typescript
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');

const { data, error: sessionError } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken || ''
});
```
**Issue**: Uses `setSession()` but doesn't persist cookies to server

### Step 3: Server Session Check (`middleware.ts`)
```typescript
const session = await supabase.auth.getSession();
if (session.data.session) {
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.data.session.user.id)
    .eq('is_active', true)
    .single();
}
```
**Issue**: Server client can't read client-set session

### Step 4: Password Login (`app/api/auth/login/route.ts`)
```typescript
response.cookies.set('sb-access-token', data.session.access_token, {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
});
```
**Working**: Sets proper server-visible cookies

## C) Detected Issues

### 🔴 Critical Issues (Server-Visible Auth Broken)

1. **Missing Cookie Persistence in Callback**
   - Callback uses `setSession()` but doesn't set `sb-*` cookies
   - Server middleware can't read client-only session
   - **Impact**: Magic link auth never establishes server-visible session

2. **Port Mismatch in Development**
   - Magic link redirects to `localhost:8080` but Supabase may expect `localhost:3000`
   - **Impact**: Potential redirect failures in development environment

3. **No SSR Session Handling**
   - Using raw `@supabase/supabase-js` without SSR helpers
   - **Impact**: Manual cookie management required, prone to sync issues

### 🟡 Medium Issues

4. **Inconsistent Session Sources**
   - Middleware uses service role client
   - Server utils use service role client  
   - Client uses anon client
   - **Impact**: Different session contexts may not sync

5. **Missing Session Validation**
   - No verification that callback session matches admin_users table
   - **Impact**: Could allow non-admin users to access admin area

## D) Gaps vs Requirements

### Missing Components
- ❌ **Server-side session persistence** in auth callback
- ❌ **Cookie forwarding** from client to server context
- ❌ **Session validation** against admin_users table in callback
- ❌ **Error handling** for invalid admin users in callback
- ❌ **Development port configuration** for Supabase redirects

### Existing Components
- ✅ Callback page exists and processes tokens
- ✅ Middleware protects admin routes
- ✅ Password login sets proper cookies
- ✅ Admin_users table structure exists
- ✅ Logout functionality works

## E) Minimal Fix Plan

### Priority 1: Fix Cookie Persistence (3 changes)
1. **Update auth callback** to set `sb-access-token` and `sb-refresh-token` cookies after `setSession()`
2. **Add session validation** in callback to check admin_users table before redirect
3. **Add error handling** for non-admin users attempting magic link login

### Priority 2: Fix Development Environment (2 changes)
4. **Update magic link redirect** to use `localhost:3000` in development
5. **Add environment check** for proper redirect URL selection

### Priority 3: Improve Session Handling (2 changes)
6. **Add session refresh** logic in middleware for expired tokens
7. **Add logging** for auth failures to aid debugging

### Priority 4: Security Enhancements (2 changes)
8. **Add rate limiting** to auth callback to prevent abuse
9. **Add session timeout** handling for security

## F) Verification Steps

### Local Testing on http://localhost:8080

1. **Check Magic Link Flow**:
   ```bash
   # 1. Request magic link from /admin/login
   # 2. Check email for link to /auth/callback
   # 3. Click link and verify redirect to /admin
   # 4. Check browser cookies for sb-access-token and sb-refresh-token
   ```

2. **Expected Cookies After Login**:
   ```
   sb-access-token: [JWT token] (HttpOnly, Path=/, SameSite=Lax)
   sb-refresh-token: [JWT token] (HttpOnly, Path=/, SameSite=Lax)
   ```

3. **Verify Server Session**:
   ```bash
   # After login, refresh /admin page
   # Should not redirect to /admin/login
   # Should show user info in header
   ```

4. **Test Authorization**:
   ```bash
   # Use super_admin email: raja.gadgets89@gmail.com
   # Should have super_admin role in admin_users table
   # Should access all admin features
   ```

5. **Test Logout**:
   ```bash
   # Click logout button
   # Should redirect to /admin/login
   # Cookies should be cleared
   # Refreshing /admin should redirect to login
   ```

### Debug Commands
```bash
# Check current cookies
curl -I http://localhost:8080/admin

# Test auth callback directly
curl "http://localhost:8080/auth/callback#access_token=test&refresh_token=test"

# Check middleware logs
docker logs yec-dev | grep "Supabase Auth check"
```

---

**Report Generated**: 2025-01-27  
**Next Action**: Implement Priority 1 fixes to resolve server-visible session issue
