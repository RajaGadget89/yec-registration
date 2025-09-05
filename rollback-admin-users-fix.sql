-- ROLLBACK SCRIPT: Restore Admin Users Data
-- This script restores the admin_users table from backup
-- Use this ONLY if the fix migration fails or causes issues

-- Step 1: Verify backup exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users_backup_20250127') THEN
        RAISE EXCEPTION 'Backup table admin_users_backup_20250127 does not exist! Cannot rollback.';
    END IF;
    RAISE NOTICE 'Backup table found. Proceeding with rollback...';
END $$;

-- Step 2: Create rollback backup (in case we need to rollback the rollback)
CREATE TABLE IF NOT EXISTS admin_users_rollback_backup_20250127 AS 
SELECT 
    *,
    NOW() as rollback_backup_created_at
FROM admin_users;

-- Step 3: Restore from original backup
TRUNCATE TABLE admin_users;

INSERT INTO admin_users (
    id, email, full_name, is_active, created_at, updated_at, status
)
SELECT 
    id, 
    email, 
    full_name, 
    is_active, 
    created_at, 
    updated_at,
    status
FROM admin_users_backup_20250127;

-- Step 4: Verify rollback
SELECT 
    'Rollback completed' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_records
FROM admin_users;

-- Step 5: Show restored data
SELECT 
    'Restored admin_users data' as info,
    id,
    email,
    is_active,
    status,
    created_at,
    updated_at
FROM admin_users 
ORDER BY created_at DESC;
