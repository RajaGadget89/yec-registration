-- Rollback Script for Magic Link Authentication Fix
-- Date: 2025-01-27
-- Description: Rollback the Magic Link authentication fix if needed
-- This script restores the original state before the fix

-- 1. Restore admin_users table from backup
-- (Only run this if you need to completely rollback)
-- DROP TABLE IF EXISTS admin_users;
-- CREATE TABLE admin_users AS SELECT * FROM admin_users_backup_20250127;

-- 2. Alternative: Reset status field to NULL (safer rollback)
UPDATE admin_users 
SET 
    status = NULL,
    updated_at = NOW()
WHERE 
    is_active = true 
    AND status = 'active';

-- 3. Reset business_roles to empty array (optional)
UPDATE admin_users 
SET 
    business_roles = '{}',
    updated_at = NOW()
WHERE 
    business_roles IS NOT NULL 
    AND business_roles != '{}';

-- 4. Remove constraints (if needed)
-- ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_status_check;
-- ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_business_roles_check;

-- 5. Remove columns (if needed - DANGEROUS!)
-- ALTER TABLE admin_users DROP COLUMN IF EXISTS status;
-- ALTER TABLE admin_users DROP COLUMN IF EXISTS business_roles;

-- 6. Remove indexes (if needed)
-- DROP INDEX IF EXISTS idx_admin_users_status;
-- DROP INDEX IF EXISTS idx_admin_users_business_roles;

-- 7. Verify rollback
SELECT 
    'ROLLBACK VERIFICATION' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true AND status IS NULL THEN 1 END) as active_users_with_null_status,
    COUNT(CASE WHEN is_active = true AND status = 'active' THEN 1 END) as active_users_with_active_status,
    COUNT(CASE WHEN business_roles = '{}' OR business_roles IS NULL THEN 1 END) as users_without_business_roles
FROM admin_users;

-- 8. Show current state
SELECT 
    email,
    role,
    is_active,
    status,
    business_roles,
    updated_at
FROM admin_users
ORDER BY email;
