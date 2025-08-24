# Authentication Flow Test Guide

## Current Status
Based on the debugging, the magic link generation is working correctly:
- ✅ Magic link generation: Working
- ✅ Redirect URL: `http://localhost:8080/auth/callback` (correct)
- ✅ Environment variables: Properly configured
- ✅ Supabase connection: Healthy

## Test Steps

### 1. Test Magic Link Generation
```bash
# Test the debug endpoint
curl -s "http://localhost:8080/api/test/debug-magic-link?email=raja.gadgets89@gmail.com" | jq .

# Test the regular magic link endpoint
curl -s "http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com" | jq .
```

### 2. Test Admin Login Page
1. Go to: `http://localhost:8080/admin/login`
2. Enter your email: `raja.gadgets89@gmail.com`
3. Click "Send Magic Link"
4. Check browser console for debug logs

### 3. Test Magic Link Click
1. Check your email for the magic link
2. Click the magic link
3. Check browser console for debug logs
4. Look for any error messages

## Debug Information

### Environment Configuration
- `NEXT_PUBLIC_APP_URL`: `http://localhost:8080`
- `SUPABASE_ENV`: `staging`
- `SUPABASE_URL`: `https://nuxahfrelvfvsmhzvxqm.supabase.co`

### Supabase URL Configuration (from your dashboard)
- **Site URL**: `https://*.vercel.app/auth`
- **Redirect URLs**: 
  - `http://localhost:8080/auth/callback` ✅
  - `https://*.vercel.app/auth/callback` ✅

## Potential Issues

### Issue 1: Wrong Redirect URL
If the magic link redirects to `https://%2A.vercel.app/auth/callback`:
- This indicates a Supabase configuration issue
- The `%2A` is URL-encoded `*` (asterisk)
- This happens when Supabase can't match the requested redirect URL

### Issue 2: Token Processing
If tokens are present but authentication fails:
- Check the callback API logs
- Verify admin email is in `ADMIN_EMAILS` list

## Next Steps

1. **Test the current setup** using the steps above
2. **Check browser console** for any error messages
3. **Verify Supabase project settings** if redirect issues persist
4. **Update Supabase URL configuration** if needed

## Quick Fix Commands

```bash
# Check if server is running
curl -s "http://localhost:8080/api/health" | jq .

# Test magic link generation
curl -s "http://localhost:8080/api/test/debug-magic-link" | jq .

# Check environment variables
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
echo "SUPABASE_ENV: $SUPABASE_ENV"
```
