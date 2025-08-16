# Admin Authentication Migration Guide

This document outlines the migration from the email allowlist + cookie approach to Supabase Auth-based authentication for admin access.

## Overview

The new authentication system provides:
- **Supabase Auth integration** with email/password and magic link support
- **Role-based access control** (`admin`, `super_admin`)
- **Secure session management** using Supabase's built-in auth cookies
- **Backward compatibility** for local development
- **Enhanced security** with proper session validation

## Migration Steps

### 1. Database Setup

1. **Run the SQL migration** in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of docs/admin_users_migration.sql
   ```

2. **Verify the table was created**:
   ```sql
   SELECT * FROM admin_users;
   ```

### 2. Environment Configuration

1. **Update your `.env.local`** with the new variables:
   ```bash
   # Existing variables...
   ADMIN_EMAILS=admin1@your.org,admin2@your.org,superuser@your.org
   
   # New variables
   ADMIN_SEED_SECRET=your-secure-seed-secret-here
   ```

2. **Generate a secure seed secret**:
   ```bash
   openssl rand -base64 32
   ```

### 3. Initial Admin User Setup

1. **Seed admin users** from your existing `ADMIN_EMAILS`:
   ```bash
   # Development (no secret required)
   curl -X POST http://localhost:3000/api/admin/seed-users
   
   # Production (secret required)
   curl -X POST "http://your-domain.com/api/admin/seed-users?secret=your-secure-seed-secret"
   ```

2. **Check the response** to ensure users were created successfully.

3. **Set up the first super_admin**:
   - Log in with one of the seeded admin accounts
   - Use the role management API to promote a user to `super_admin`:
   ```bash
   curl -X PUT "http://localhost:3000/api/admin/users/{user-id}/role" \
     -H "Authorization: Bearer {access-token}" \
     -H "Content-Type: application/json" \
     -d '{"role": "super_admin"}'
   ```

### 4. Testing the Migration

1. **Test admin login**:
   - Navigate to `/admin/login`
   - Use your admin email and password
   - Verify you can access the admin dashboard

2. **Test role-based access**:
   - Verify `admin` users can access admin features
   - Verify `super_admin` users can access role management

3. **Test backward compatibility**:
   - In development, verify the dev cookie method still works
   - Test `/api/dev/login` and `/api/dev/logout`

## New Features

### Authentication Methods

1. **Email/Password Login**:
   - Standard email and password authentication
   - Secure password hashing handled by Supabase

2. **Magic Link Login**:
   - Passwordless authentication via email
   - Click the link in your email to sign in

### Role Management

1. **Admin Role** (`admin`):
   - Access to admin dashboard
   - Can manage registrations
   - Cannot manage other admin users

2. **Super Admin Role** (`super_admin`):
   - All admin permissions
   - Can promote/demote admin users
   - Can manage role assignments

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Sign in with email/password
- `POST /api/auth/logout` - Sign out

#### User Management (Super Admin Only)
- `GET /api/admin/users` - List all admin users
- `PUT /api/admin/users/{id}/role` - Update user role

#### Migration
- `POST /api/admin/seed-users` - Seed admin users from environment

## Security Features

### Session Management
- **Secure cookies** with httpOnly and sameSite flags
- **Automatic token refresh** handled by Supabase
- **Session validation** on every request

### Role-Based Access Control
- **Server-side validation** of all role checks
- **Middleware protection** for all admin routes
- **API-level authorization** for sensitive operations

### Row Level Security (RLS)
- **Database-level protection** for admin_users table
- **Automatic filtering** based on user permissions
- **Prevents privilege escalation** at the database level

## Backward Compatibility

### Development Environment
- **Dev cookie method** still works for local development
- **Existing `/api/dev/*` endpoints** remain functional
- **Email allowlist** fallback for development

### Production Environment
- **Supabase Auth required** for all admin access
- **No fallback to email allowlist** in production
- **Secure session management** only

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**:
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Check that the values are correct

2. **"User not found in admin_users table"**:
   - Run the seed users API to create admin records
   - Verify the user exists in Supabase Auth

3. **"Insufficient permissions"**:
   - Check that the user has the correct role
   - Verify the user is active (`is_active = true`)

4. **"Cannot demote yourself from super_admin"**:
   - This is a safety feature to prevent lockout
   - Have another super_admin demote you, or manually update the database

### Database Queries

**Check admin users**:
```sql
SELECT id, email, role, is_active, created_at, last_login_at 
FROM admin_users 
ORDER BY created_at DESC;
```

**Check user roles**:
```sql
SELECT au.email, au.role, au.is_active, u.email_confirmed_at
FROM admin_users au
JOIN auth.users u ON au.id = u.id
WHERE au.is_active = true;
```

**Reset user password** (if needed):
```sql
-- This requires Supabase Auth admin API
-- Use the Supabase dashboard or admin API
```

## Rollback Plan

If you need to rollback to the old system:

1. **Revert middleware.ts** to the old version
2. **Revert auth-utils.ts** to the old version
3. **Remove new API routes** (`/api/auth/*`, `/api/admin/users/*`)
4. **Keep the admin_users table** for future use

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase Auth documentation
3. Check the application logs for detailed error messages
4. Verify environment variables are correctly set

---

*This migration provides a secure, scalable authentication system while maintaining backward compatibility for development workflows.*
