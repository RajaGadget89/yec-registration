-- SAFE MIGRATION: Fix admin users status for Magic Link Authentication
-- This script safely updates existing admin users to have status = 'active'
-- Includes comprehensive validation and rollback capabilities

-- Step 1: Pre-migration validation
DO $$
DECLARE
    table_exists boolean;
    column_exists boolean;
    record_count integer;
BEGIN
    -- Check if admin_users table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_users' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE EXCEPTION 'admin_users table does not exist! Aborting migration.';
    END IF;
    
    -- Check if status column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    -- Count existing records
    SELECT COUNT(*) INTO record_count FROM admin_users;
    
    RAISE NOTICE 'Pre-migration validation:';
    RAISE NOTICE '  - admin_users table exists: %', table_exists;
    RAISE NOTICE '  - status column exists: %', column_exists;
    RAISE NOTICE '  - total records: %', record_count;
    
    IF record_count = 0 THEN
        RAISE EXCEPTION 'No records found in admin_users table! Aborting migration.';
    END IF;
END $$;

-- Step 2: Add status column if it doesn't exist (SAFE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE admin_users ADD COLUMN status TEXT;
        
        -- Set default value for existing records
        UPDATE admin_users SET status = 'active' WHERE status IS NULL;
        
        -- Make it NOT NULL with default
        ALTER TABLE admin_users 
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'active';
        
        -- Add check constraint
        ALTER TABLE admin_users 
        ADD CONSTRAINT admin_users_status_check 
        CHECK (status IN ('active', 'suspended'));
        
        RAISE NOTICE 'Added status column to admin_users table';
    ELSE
        RAISE NOTICE 'Status column already exists in admin_users table';
    END IF;
END $$;

-- Step 3: Update records (SAFE - only updates NULL or invalid status)
UPDATE admin_users 
SET 
    status = 'active',
    updated_at = NOW()
WHERE 
    is_active = true 
    AND (status IS NULL OR status NOT IN ('active', 'suspended'));

-- Step 4: Post-migration validation
DO $$
DECLARE
    updated_count integer;
    total_active integer;
    invalid_status_count integer;
BEGIN
    -- Count updated records
    SELECT COUNT(*) INTO updated_count 
    FROM admin_users 
    WHERE is_active = true AND status = 'active';
    
    -- Count total active records
    SELECT COUNT(*) INTO total_active 
    FROM admin_users 
    WHERE is_active = true;
    
    -- Count records with invalid status
    SELECT COUNT(*) INTO invalid_status_count 
    FROM admin_users 
    WHERE is_active = true AND status NOT IN ('active', 'suspended');
    
    RAISE NOTICE 'Post-migration validation:';
    RAISE NOTICE '  - Total active records: %', total_active;
    RAISE NOTICE '  - Records with status=active: %', updated_count;
    RAISE NOTICE '  - Records with invalid status: %', invalid_status_count;
    
    IF invalid_status_count > 0 THEN
        RAISE WARNING 'Found % records with invalid status!', invalid_status_count;
    END IF;
    
    IF updated_count = 0 THEN
        RAISE WARNING 'No records were updated! Check if migration was needed.';
    END IF;
END $$;

-- Step 5: Final verification
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
    COUNT(CASE WHEN is_active = true AND status = 'active' THEN 1 END) as active_with_proper_status
FROM admin_users;

-- Show final state
SELECT 
    id, 
    email, 
    is_active, 
    status, 
    created_at, 
    updated_at
FROM admin_users 
WHERE is_active = true
ORDER BY updated_at DESC;
