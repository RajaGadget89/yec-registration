-- Rollback Migration: Admin Job Scopes (Granular Permissions)
-- Date: 2025-01-27
-- Description: Rollback the admin job scopes feature by removing business_roles column
-- This migration is idempotent and safe to run multiple times

-- 1. Drop indexes first
DROP INDEX IF EXISTS idx_admin_users_business_roles;
DROP INDEX IF EXISTS idx_admin_users_business_roles_gin;

-- 2. Drop constraint
ALTER TABLE admin_users 
DROP CONSTRAINT IF EXISTS admin_users_business_roles_check;

-- 3. Drop the business_roles column
ALTER TABLE admin_users 
DROP COLUMN IF EXISTS business_roles;

-- 4. Add comment to document the rollback
COMMENT ON TABLE admin_users IS 'Admin users table - business_roles column removed on 2025-01-27';
