# Environment Setup Guide

## Overview

This guide explains how to properly configure the YEC Registration System for both development and production environments, with a focus on Supabase authentication settings.

## Environment Variables

### Required Variables

#### Development (.env.local)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Application URL (Development)
NEXT_PUBLIC_APP_URL=http://localhost:8080

# Admin Access Control
ADMIN_EMAILS=your-email@example.com

# Optional: Email Configuration
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=no-reply@yourdomain.com
```

#### Production (Vercel Environment Variables)
```bash
# Supabase Configuration (same as development)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Application URL (Production)
NEXT_PUBLIC_APP_URL=https://yec.rajagadget.live

# Admin Access Control
ADMIN_EMAILS=your-email@example.com

# Optional: Email Configuration
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=no-reply@yourdomain.com
```

## Supabase Project Configuration

### Option 1: Single Project with Multiple Redirect URLs (Recommended)

Configure your Supabase project to support both environments:

1. **Go to Supabase Dashboard** → Your Project → Authentication → URL Configuration

2. **Set Site URL** to your production domain:
   ```
   https://yec.rajagadget.live
   ```

3. **Add Multiple Redirect URLs**:
   ```
   https://yec.rajagadget.live/auth/callback
   http://localhost:8080/auth/callback
   ```

4. **Save Changes**

### Option 2: Environment-Specific Projects

Create separate Supabase projects for development and production:

#### Development Project
- **Site URL**: `http://localhost:8080`
- **Redirect URLs**: `http://localhost:8080/auth/callback`

#### Production Project
- **Site URL**: `https://yec.rajagadget.live`
- **Redirect URLs**: `https://yec.rajagadget.live/auth/callback`

Then use different environment variables for each environment.

## Vercel Deployment Configuration

### Environment Variables Setup

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add Production Variables**:
   - `NEXT_PUBLIC_APP_URL` = `https://yec.rajagadget.live`
   - All other required variables

3. **Add Development Variables** (if using Vercel for development):
   - `NEXT_PUBLIC_APP_URL` = `http://localhost:8080`

### Build Configuration

The application now includes:
- `export const dynamic = 'force-dynamic'` for admin routes
- Proper environment detection
- Fallback handling for missing variables

## Development Workflow

### Local Development
1. Copy `.env.template` to `.env.local`
2. Fill in your development values
3. Run `npm run dev`
4. Access at `http://localhost:8080`

### Production Deployment
1. Set environment variables in Vercel
2. Push to main branch triggers deployment
3. Verify authentication works at production URL

## Troubleshooting

### Common Issues

#### 1. Magic Link Redirects to Localhost in Production
**Cause**: `NEXT_PUBLIC_APP_URL` not set in Vercel
**Solution**: Set `NEXT_PUBLIC_APP_URL=https://yec.rajagadget.live` in Vercel environment variables

#### 2. Build Errors About Dynamic Server Usage
**Cause**: Admin routes trying to be statically generated
**Solution**: ✅ **FIXED** - Added `export const dynamic = 'force-dynamic'` to admin routes

#### 3. Authentication Fails in Development
**Cause**: Supabase redirect URLs not configured for localhost
**Solution**: Add `http://localhost:8080/auth/callback` to Supabase redirect URLs

#### 4. Environment Variables Not Loading
**Cause**: Variables not properly set or named
**Solution**: 
- Check variable names match exactly
- Restart development server after changing `.env.local`
- Verify Vercel environment variables are set correctly

### Verification Steps

#### Development
```bash
# Check if environment variables are loaded
npm run dev
# Look for console logs showing configuration status
```

#### Production
1. Deploy to Vercel
2. Check build logs for any warnings
3. Test authentication flow
4. Verify admin dashboard access

## Security Considerations

### Environment Variables
- ✅ **Public Variables**: Only `NEXT_PUBLIC_*` variables are exposed to browser
- ✅ **Private Variables**: Server-side variables remain secure
- ✅ **Production Secrets**: Never commit production secrets to git

### Supabase Configuration
- ✅ **Redirect URLs**: Only allow trusted domains
- ✅ **Site URL**: Set to production domain
- ✅ **CORS**: Configure allowed origins properly

## Best Practices

1. **Use Environment-Specific Configurations**: Different settings for dev/prod
2. **Validate Environment Variables**: Check required variables on startup
3. **Secure Production Secrets**: Use Vercel environment variables
4. **Test Both Environments**: Verify functionality in both dev and prod
5. **Document Changes**: Update this guide when configuration changes

## Quick Reference

### Development Commands
```bash
# Start development server
npm run dev

# Check TypeScript
npx tsc --noEmit

# Run linting
npm run lint

# Build for production
npm run build
```

### Production Deployment
```bash
# Deploy to Vercel (automatic on push to main)
git push origin main

# Manual deployment
vercel --prod
```

### Environment Variable Checklist
- [ ] `NEXT_PUBLIC_APP_URL` set correctly for environment
- [ ] Supabase URLs and keys configured
- [ ] Admin emails configured
- [ ] Optional services (email, telegram) configured if needed

---

**Last Updated**: 2025-01-27  
**Version**: 1.0
