-- Fix admin users status for Magic Link Authentication
-- This script updates existing admin users to have status = 'active'

-- First, check if the status column exists
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE admin_users 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'suspended'));
        
        RAISE NOTICE 'Added status column to admin_users table';
    ELSE
        RAISE NOTICE 'Status column already exists in admin_users table';
    END IF;
END $$;

-- Update all active admin users to have status = 'active'
UPDATE admin_users 
SET 
    status = 'active',
    updated_at = NOW()
WHERE 
    is_active = true 
    AND (status IS NULL OR status != 'active');

-- Show the results
SELECT 
    email,
    role,
    is_active,
    status,
    created_at,
    updated_at
FROM admin_users 
WHERE is_active = true
ORDER BY created_at;

-- Count users by status
SELECT 
    status,
    COUNT(*) as count
FROM admin_users 
GROUP BY status;
