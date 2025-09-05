-- BACKUP SCRIPT: Admin Users Data Before Magic Link Fix
-- This script creates a complete backup of admin_users table
-- Run this BEFORE applying the fix migration

-- Create backup table
CREATE TABLE IF NOT EXISTS admin_users_backup_20250127 AS 
SELECT 
    *,
    NOW() as backup_created_at
FROM admin_users;

-- Verify backup was created
SELECT 
    'Backup created successfully' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_records
FROM admin_users_backup_20250127;

-- Show current state
SELECT 
    'Current admin_users state' as info,
    id,
    email,
    is_active,
    status,
    created_at,
    updated_at
FROM admin_users 
ORDER BY created_at DESC;
