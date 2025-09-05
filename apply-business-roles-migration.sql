-- Apply business_roles migration to admin_users table
-- This is the essential part of the migration to fix AC2 403 errors

-- 1. Add business_roles column to admin_users table
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS business_roles TEXT[] DEFAULT '{}';

-- 2. Add constraint to ensure business_roles contains only valid values
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

-- 3. Create index for better performance on business_roles queries
CREATE INDEX IF NOT EXISTS idx_admin_users_business_roles 
ON admin_users USING GIN (business_roles);

-- 4. Update existing super_admin users to have all business roles (backward compatibility)
UPDATE admin_users 
SET business_roles = ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
WHERE role = 'super_admin' 
AND (business_roles IS NULL OR business_roles = '{}');

-- 5. Add comment for documentation
COMMENT ON COLUMN admin_users.business_roles IS 'Array of business role scopes: user_profile, payment_slip, tcc_card';
