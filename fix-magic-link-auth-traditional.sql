-- Magic Link Authentication Fix - Traditional Database Method
-- Date: 2025-01-27
-- Description: Fix admin users status for Magic Link Authentication using traditional SQL approach
-- This solution aligns with your traditional authentication method and AC1-AC6 enhancements

-- 1. Backup existing admin_users data (safety first)
CREATE TABLE IF NOT EXISTS admin_users_backup_20250127 AS 
SELECT * FROM admin_users;

-- 2. Add status column if it doesn't exist (idempotent)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Add constraint for valid status values (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_status_check'
    ) THEN
        ALTER TABLE admin_users 
        ADD CONSTRAINT admin_users_status_check 
        CHECK (status IN ('active', 'suspended', 'pending'));
    END IF;
END $$;

-- 4. Update existing admin users to have status = 'active' (traditional method)
UPDATE admin_users 
SET 
    status = 'active',
    updated_at = NOW()
WHERE 
    is_active = true 
    AND (status IS NULL OR status != 'active');

-- 5. Ensure business_roles column exists for AC1-AC6 compatibility
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS business_roles TEXT[] DEFAULT '{}';

-- 6. Add business_roles constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_business_roles_check'
    ) THEN
        ALTER TABLE admin_users 
        ADD CONSTRAINT admin_users_business_roles_check 
        CHECK (
          business_roles <@ ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
        );
    END IF;
END $$;

-- 7. Update existing super_admin users to have all business roles (AC1-AC6 compatibility)
UPDATE admin_users 
SET business_roles = ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
WHERE role = 'super_admin' 
AND (business_roles IS NULL OR business_roles = '{}');

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users (status);
CREATE INDEX IF NOT EXISTS idx_admin_users_business_roles ON admin_users USING GIN (business_roles);

-- 9. Add comments for documentation
COMMENT ON COLUMN admin_users.status IS 'User status: active, suspended, pending';
COMMENT ON COLUMN admin_users.business_roles IS 'Array of business role scopes: user_profile, payment_slip, tcc_card';

-- 10. Verify the fix
SELECT 
    'VERIFICATION RESULTS' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true AND status = 'active' THEN 1 END) as active_users_with_status,
    COUNT(CASE WHEN is_active = true AND status IS NULL THEN 1 END) as active_users_without_status,
    COUNT(CASE WHEN role = 'super_admin' AND business_roles @> ARRAY['user_profile', 'payment_slip', 'tcc_card'] THEN 1 END) as super_admins_with_business_roles
FROM admin_users;

-- 11. Show current admin users and their status
SELECT 
    email,
    role,
    is_active,
    status,
    business_roles,
    created_at,
    updated_at
FROM admin_users
ORDER BY email;
