# Authentication Quick Reference

## 🔐 Quick Authentication Commands

### Check Authentication Status
```bash
# Check if user is authenticated
curl -s http://localhost:8080/api/whoami | jq .

# Expected response when authenticated:
{
  "email": "admin@example.com",
  "isAdmin": true,
  "source": "cookie"
}

# Expected response when not authenticated:
{
  "email": null,
  "isAdmin": false,
  "source": null
}
```

### Development Login
```bash
# Quick login for development
curl "http://localhost:8080/api/test/direct-login?email=admin@example.com"

# Test with specific email
curl "http://localhost:8080/api/test/direct-login?email=raja.gadgets89@gmail.com"
```

### Test Authentication with Cookies
```bash
# Test with admin-email cookie
curl -s http://localhost:8080/api/whoami -H "Cookie: admin-email=admin@example.com" | jq .

# Test admin page access
curl -I http://localhost:8080/admin -H "Cookie: admin-email=admin@example.com"
```

### Logout Testing
```bash
# Test logout functionality
curl -I http://localhost:8080/admin/logout -b cookies.txt

# Verify logout worked
curl -s http://localhost:8080/api/whoami | jq .
```

## 🧪 E2E Testing

### Run Authentication Tests
```bash
# Run all auth tests
npm run e2e tests/e2e/auth.e2e.spec.ts

# Run with specific browser
npm run e2e tests/e2e/auth.e2e.spec.ts -- --project=chromium

# Run with headed browser (for debugging)
npm run e2e tests/e2e/auth.e2e.spec.ts -- --headed
```

### Check Test Results
```bash
# View test output
cat tmp/auth-test-output.txt

# View test artifacts
ls -la tmp/auth-test-output-*.json
```

## 🔧 Environment Variables

### Required for Authentication
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:8080

# Admin Access Control
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### Optional Debug Variables
```bash
# Enable authentication debugging
AUTH_TRACE=1

# Test email for E2E tests
TEST_ADMIN_EMAIL=test@example.com
```

## 🍪 Cookie Management

### Authentication Cookies
| Cookie | Purpose | Set By | Cleared By |
|--------|---------|--------|------------|
| `admin-email` | Primary auth | Callback API | Logout |
| `sb-access-token` | Supabase token | Callback API | Logout |
| `sb-refresh-token` | Supabase refresh | Callback API | Logout |
| `dev-user-email` | Dev fallback | Direct login | Logout |

### Cookie Properties
```typescript
{
  httpOnly: true,           // Not accessible via JS
  secure: isProd(),         // HTTPS only in production
  sameSite: 'lax',          // CSRF protection
  path: '/',                // Site-wide
  maxAge: 7 * 24 * 60 * 60  // 7 days
}
```

## 🚨 Common Issues & Solutions

### Issue: "Not Authenticated" When Logged In
**Problem**: Status bar shows "Not Authenticated" but user can access admin dashboard.

**Solution**: 
- Check if `getCurrentUser()` fallback is working
- Verify `admin-email` cookie is set
- Check `ADMIN_EMAILS` environment variable

### Issue: Status Persists After Logout
**Problem**: Authentication status still shows "Admin" after logout.

**Solution**:
- Ensure all auth cookies are cleared
- Check logout route implementation
- Verify cookie expiration

### Issue: Magic Link Not Working
**Problem**: Magic link authentication fails.

**Solution**:
- Check Supabase redirect URLs
- Verify `NEXT_PUBLIC_APP_URL` setting
- Test origin consistency

## 🔍 Debug Commands

### Enable Debug Logging
```bash
# Enable auth tracing
export AUTH_TRACE=1
npm run dev
```

### Check Network Requests
```bash
# Monitor auth requests
curl -v http://localhost:8080/api/whoami

# Check redirects
curl -I http://localhost:8080/admin
```

### Verify Cookie State
```bash
# Check browser cookies (DevTools)
# Application → Cookies → localhost:8080

# Check cookie headers
curl -v http://localhost:8080/admin/login
```

## 📋 Authentication Checklist

### Before Deployment
- [ ] Environment variables set correctly
- [ ] Supabase redirect URLs configured
- [ ] Admin emails in allowlist
- [ ] E2E tests passing
- [ ] Logout functionality working
- [ ] Authentication status displaying correctly

### After Deployment
- [ ] HTTPS enabled (for secure cookies)
- [ ] Production environment variables set
- [ ] Supabase production URLs configured
- [ ] Admin access verified
- [ ] Logout tested in production

## 🔗 Related Documentation

- **[Authentication System](authentication-system.md)** - Complete system documentation
- **[Authentication Troubleshooting](auth-troubleshoot.md)** - Detailed troubleshooting guide
- **[Security & Access Control](security/security-access.md)** - Security overview
- **[API Documentation](API_DOCUMENTATION.md)** - API endpoints reference

## 📞 Quick Support

### Immediate Issues
1. Check authentication status: `curl http://localhost:8080/api/whoami`
2. Test login: `curl "http://localhost:8080/api/test/direct-login?email=admin@example.com"`
3. Test logout: `curl -I http://localhost:8080/admin/logout`

### Debug Mode
```bash
export AUTH_TRACE=1
npm run dev
# Check console for auth debug logs
```

### E2E Testing
```bash
npm run e2e tests/e2e/auth.e2e.spec.ts
# Check tmp/auth-test-output.txt for results
```
