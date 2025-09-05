-- Migration: Admin Job Scopes (Granular Permissions)
-- Date: 2025-01-27
-- Description: Add business_roles column to admin_users table for granular job assignments
-- This migration is additive and idempotent - it will not break existing data

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

-- 4. Create index for specific business role lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_has_user_profile 
ON admin_users ((business_roles @> ARRAY['user_profile']::TEXT[]));

CREATE INDEX IF NOT EXISTS idx_admin_users_has_payment_slip 
ON admin_users ((business_roles @> ARRAY['payment_slip']::TEXT[]));

CREATE INDEX IF NOT EXISTS idx_admin_users_has_tcc_card 
ON admin_users ((business_roles @> ARRAY['tcc_card']::TEXT[]));

-- 5. Add comment for documentation
COMMENT ON COLUMN admin_users.business_roles IS 'Array of business role scopes: user_profile, payment_slip, tcc_card';

-- 6. Update existing super_admin users to have all business roles (backward compatibility)
UPDATE admin_users 
SET business_roles = ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
WHERE role = 'super_admin' 
AND (business_roles IS NULL OR business_roles = '{}');

-- 7. Create function to check if admin has specific business role
CREATE OR REPLACE FUNCTION admin_has_business_role(
  admin_email TEXT,
  required_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if admin exists and has the required business role
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE email = admin_email 
    AND is_active = true 
    AND (
      role = 'super_admin' OR 
      business_roles @> ARRAY[required_role]::TEXT[]
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get admin business roles
CREATE OR REPLACE FUNCTION get_admin_business_roles(
  admin_email TEXT
) RETURNS TEXT[] AS $$
DECLARE
  admin_role TEXT;
  admin_business_roles TEXT[];
BEGIN
  -- Get admin role and business roles
  SELECT role, business_roles 
  INTO admin_role, admin_business_roles
  FROM admin_users 
  WHERE email = admin_email 
  AND is_active = true;
  
  -- If admin not found, return empty array
  IF NOT FOUND THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- If super_admin, return all business roles
  IF admin_role = 'super_admin' THEN
    RETURN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[];
  END IF;
  
  -- Return actual business roles
  RETURN COALESCE(admin_business_roles, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION admin_has_business_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_business_roles(TEXT) TO authenticated;
