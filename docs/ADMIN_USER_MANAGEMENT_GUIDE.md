# Admin User Management Guide

## Overview

This guide provides comprehensive instructions for adding new administrators to the YEC Registration System. The system supports multiple methods for user management, each designed for different scenarios and access levels.

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles and Permissions](#user-roles-and-permissions)
3. [Methods for Adding Administrators](#methods-for-adding-administrators)
4. [Method 1: Environment Variable Setup](#method-1-environment-variable-setup)
5. [Method 2: Direct API Call](#method-2-direct-api-call)
6. [Method 3: Supabase Dashboard](#method-3-supabase-dashboard)
7. [Method 4: Development Testing](#method-4-development-testing)
8. [User Management Operations](#user-management-operations)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)

---

## System Overview

The YEC Registration System uses a **dual-layer authentication system**:

### **Layer 1: Supabase Auth**
- Handles user authentication and session management
- Stores user credentials and authentication tokens
- Manages password reset and email verification

### **Layer 2: Admin Users Table**
- Stores admin-specific information and roles
- Manages role-based access control (RBAC)
- Tracks admin activity and permissions

### **Key Components**
- **`admin_users` table**: Stores admin user records
- **Role-based access**: `admin` and `super_admin` roles
- **Audit logging**: All admin actions are logged
- **Session management**: Secure cookie-based sessions

---

## User Roles and Permissions

### **Admin Role** (`admin`)
**Permissions:**
- ✅ Access admin dashboard
- ✅ View and manage registrations
- ✅ Approve/reject registrations
- ✅ Export registration data
- ✅ View audit logs
- ❌ Manage other admin users
- ❌ Change system settings

### **Super Admin Role** (`super_admin`)
**Permissions:**
- ✅ All admin permissions
- ✅ Manage other admin users
- ✅ Change user roles
- ✅ Access user management API
- ✅ System configuration
- ✅ Full audit access

---

## Methods for Adding Administrators

### **Method 1: Environment Variable Setup** (Recommended for Production)
**Best for:** Initial setup and bulk user creation
**Access required:** Environment variable modification
**Security:** High (requires server restart)

### **Method 2: Direct API Call** (For Super Admins)
**Best for:** Adding individual users
**Access required:** Super admin credentials
**Security:** High (requires authentication)

### **Method 3: Supabase Dashboard** (Manual Setup)
**Best for:** Emergency access or manual setup
**Access required:** Supabase dashboard access
**Security:** Medium (manual process)

### **Method 4: Development Testing** (Development Only)
**Best for:** Testing and development
**Access required:** Development environment
**Security:** Low (development only)

---

## Method 1: Environment Variable Setup

### **Step 1: Prepare Email List**
Create a comma-separated list of admin email addresses:

```bash
# Example format
ADMIN_EMAILS=admin1@example.com,admin2@example.com,admin3@example.com
```

### **Step 2: Update Environment Variables**
Add the email list to your environment configuration:

**For Development:**
```bash
# .env.local
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

**For Production:**
```bash
# Environment variables in your hosting platform
ADMIN_EMAILS=admin1@example.com,admin2@example.com
ADMIN_SEED_SECRET=your-secret-key-here
```

### **Step 3: Trigger User Creation**
Make a POST request to the seed users endpoint:

**Development:**
```bash
curl -X POST http://localhost:3000/api/admin/seed-users
```

**Production:**
```bash
curl -X POST "https://your-domain.com/api/admin/seed-users?secret=your-secret-key"
```

### **Step 4: Verify User Creation**
Check the response for success/failure status:

```json
{
  "message": "Seeded 2 admin users successfully",
  "results": [
    {"email": "admin1@example.com", "success": true},
    {"email": "admin2@example.com", "success": true}
  ],
  "total": 2,
  "success": 2,
  "failures": 0
}
```

### **Step 5: User Onboarding**
New users will receive:
- Temporary password (generated automatically)
- Email confirmation (if enabled)
- Instructions to change password on first login

---

## Method 2: Direct API Call

### **Prerequisites**
- Super admin credentials
- API access to the system

### **Step 1: Authenticate as Super Admin**
First, log in as a super admin user to get authentication tokens.

### **Step 2: Create User via Supabase Admin API**
Use the Supabase admin API to create the user:

```javascript
// Example using Supabase Admin API
const { data, error } = await supabase.auth.admin.createUser({
  email: 'newadmin@example.com',
  password: 'temporary-password-123',
  email_confirm: true,
  user_metadata: { role: 'admin' }
});
```

### **Step 3: Add to Admin Users Table**
Create the admin user record:

```javascript
const { data: adminUser, error } = await supabase
  .from('admin_users')
  .insert({
    id: data.user.id,
    email: data.user.email,
    role: 'admin',
    is_active: true
  });
```

### **Step 4: Verify User Creation**
Check that the user was created successfully in both systems.

---

## Method 3: Supabase Dashboard

### **Step 1: Access Supabase Dashboard**
1. Log in to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**

### **Step 2: Create New User**
1. Click **"Add User"**
2. Enter the email address
3. Set a temporary password
4. Enable **"Email Confirmed"** if needed
5. Click **"Create User"**

### **Step 3: Add to Admin Users Table**
1. Navigate to **Table Editor** → **admin_users**
2. Click **"Insert Row"**
3. Fill in the required fields:
   - `id`: Copy from the user's UUID in Authentication
   - `email`: User's email address
   - `role`: `admin` or `super_admin`
   - `is_active`: `true`
4. Click **"Save"**

### **Step 4: Verify Setup**
1. Check that the user appears in both Authentication and admin_users table
2. Test login with the new credentials

---

## Method 4: Development Testing

### **Step 1: Use Development Endpoint**
For development environments, use the test endpoint:

```bash
# Direct login endpoint (development only)
curl -X GET "http://localhost:3000/api/test/direct-login?email=testadmin@example.com"
```

### **Step 2: Verify User Creation**
Check that the user was created in both systems:
- Supabase Authentication
- admin_users table

### **Step 3: Test Login**
Try logging in with the created user to verify everything works.

---

## User Management Operations

### **View All Admin Users**
**Endpoint:** `GET /api/admin/users`
**Required Role:** `super_admin`

```bash
curl -X GET "https://your-domain.com/api/admin/users" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-uuid",
      "email": "admin@example.com",
      "role": "admin",
      "created_at": "2025-01-27T10:00:00Z",
      "last_login_at": "2025-01-27T15:30:00Z",
      "is_active": true
    }
  ]
}
```

### **Update User Role**
**Endpoint:** `PUT /api/admin/users/{id}/role`
**Required Role:** `super_admin`

```bash
curl -X PUT "https://your-domain.com/api/admin/users/user-uuid/role" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"role": "super_admin"}'
```

### **Deactivate User**
Update the user's `is_active` status in the admin_users table:

```sql
UPDATE admin_users 
SET is_active = false, updated_at = NOW() 
WHERE id = 'user-uuid';
```

---

## Troubleshooting

### **Common Issues**

#### **Issue 1: User Created but Can't Login**
**Symptoms:** User exists in admin_users table but login fails
**Solution:**
1. Check if user exists in Supabase Authentication
2. Verify email confirmation status
3. Check if user is active in admin_users table

#### **Issue 2: Permission Denied**
**Symptoms:** User can login but can't access admin features
**Solution:**
1. Verify user exists in admin_users table
2. Check user role and permissions
3. Ensure user is marked as active

#### **Issue 3: Role Update Fails**
**Symptoms:** Can't change user role via API
**Solution:**
1. Verify you're logged in as super_admin
2. Check that you're not trying to demote yourself
3. Ensure the target user exists

#### **Issue 4: Seed Users API Fails**
**Symptoms:** Environment variable method doesn't work
**Solution:**
1. Check ADMIN_EMAILS format (comma-separated, no spaces)
2. Verify ADMIN_SEED_SECRET in production
3. Check server logs for detailed error messages

### **Debugging Commands**

#### **Check User Status**
```bash
# Check if user exists in Supabase Auth
curl -X GET "https://your-project.supabase.co/auth/v1/admin/users" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Check admin_users table
curl -X GET "https://your-project.supabase.co/rest/v1/admin_users?email=eq.admin@example.com" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

#### **Test Authentication**
```bash
# Test login
curl -X POST "https://your-domain.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'
```

---

## Security Best Practices

### **Password Management**
- ✅ Use strong, unique passwords
- ✅ Require password changes on first login
- ✅ Implement password complexity requirements
- ✅ Use secure password reset mechanisms

### **Access Control**
- ✅ Grant minimum required permissions
- ✅ Regularly review user access
- ✅ Implement session timeouts
- ✅ Monitor login attempts

### **User Lifecycle**
- ✅ Deactivate unused accounts
- ✅ Regular access reviews
- ✅ Secure offboarding process
- ✅ Audit trail maintenance

### **Environment Security**
- ✅ Secure environment variables
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Regular security updates

---

## Quick Reference

### **Environment Variables**
```bash
# Required for Method 1
ADMIN_EMAILS=email1@example.com,email2@example.com
ADMIN_SEED_SECRET=your-secret-key  # Production only
```

### **API Endpoints**
```bash
# Seed users (Method 1)
POST /api/admin/seed-users?secret=your-secret

# List users (Super admin only)
GET /api/admin/users

# Update role (Super admin only)
PUT /api/admin/users/{id}/role

# Direct login (Development only)
GET /api/test/direct-login?email=admin@example.com
```

### **Database Tables**
```sql
-- Check admin users
SELECT * FROM admin_users WHERE is_active = true;

-- Update user role
UPDATE admin_users SET role = 'super_admin' WHERE id = 'user-uuid';

-- Deactivate user
UPDATE admin_users SET is_active = false WHERE id = 'user-uuid';
```

### **Common Commands**
```bash
# Seed users in development
curl -X POST http://localhost:3000/api/admin/seed-users

# Seed users in production
curl -X POST "https://your-domain.com/api/admin/seed-users?secret=your-secret"

# Check user status
curl -X GET "https://your-domain.com/api/admin/users" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Support and Documentation

### **Related Documents**
- [Authentication System Guide](authentication-system.md)
- [Admin Dashboard Guide](admin-dashboard-guide.md)
- [Security Best Practices](security-best-practices.md)
- [Troubleshooting Guide](troubleshooting-guide.md)

### **Emergency Contacts**
- **System Administrator**: For urgent access issues
- **Security Team**: For security-related concerns
- **Development Team**: For technical support

### **Audit Trail**
All admin user management actions are logged in the audit system:
- User creation
- Role changes
- Access attempts
- Login/logout events

---

*Last updated: 2025-01-27*  
*Version: 1.0.0*  
*Status: ✅ Complete and Comprehensive*
