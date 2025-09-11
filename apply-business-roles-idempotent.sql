-- Apply business_roles column to admin_users table using idempotent approach
-- This is the essential part to fix AC2 403 errors

-- 1. Add business_roles column to admin_users table (idempotent)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS business_roles TEXT[] DEFAULT '{}';

-- 2. Add constraint to ensure business_roles contains only valid values (idempotent)
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

-- 3. Create index for better performance on business_roles queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_admin_users_business_roles 
ON admin_users USING GIN (business_roles);

-- 4. Update existing admin users with appropriate business roles (safe backfill)
UPDATE admin_users 
SET business_roles = CASE 
    WHEN email = 'dave@yec.dev' THEN ARRAY['tcc_card']::TEXT[]
    WHEN email = 'admin@yec.dev' THEN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
    WHEN email = 'raja.gadgets89@gmail.com' THEN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
    WHEN email = 'yecsongkhla.official@gmail.com' THEN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
    ELSE ARRAY[]::TEXT[]
END
WHERE business_roles IS NULL OR business_roles = '{}';

-- 5. Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'admin_users' 
AND column_name = 'business_roles';

-- 6. Show current admin users and their business roles
SELECT 
    email,
    role,
    business_roles,
    is_active,
    status
FROM admin_users
ORDER BY email;
