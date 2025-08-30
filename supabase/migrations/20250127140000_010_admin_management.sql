-- Migration: Admin Team Management (Phase 1)
-- Date: 2025-01-27
-- Description: Add admin invitation system and extend admin_users table

-- 1. Add status column to admin_users table (if not exists)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'suspended'));

-- 2. Create admin_invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by_admin_id UUID NOT NULL REFERENCES admin_users(id),
  accepted_admin_id UUID NULL REFERENCES admin_users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires_at ON admin_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);

-- 4. Create RLS policies for admin_invitations table
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all invitations
CREATE POLICY "Super admins can manage admin invitations" ON admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
      AND au.status = 'active'
    )
  );

-- Service role can manage all invitations (for API operations)
CREATE POLICY "Service role can manage admin invitations" ON admin_invitations
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_admin_invitations()
RETURNS void AS $$
BEGIN
  UPDATE admin_invitations 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' 
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_admin_invitation_token()
RETURNS TEXT AS $$
BEGIN
  -- Generate a cryptographically secure random token
  -- Using 32 bytes of random data encoded as base64
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to validate invitation token
CREATE OR REPLACE FUNCTION validate_admin_invitation_token(p_token TEXT)
RETURNS TABLE(
  invitation_id UUID,
  email TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  invited_by_admin_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.email,
    ai.status,
    ai.expires_at,
    ai.invited_by_admin_id
  FROM admin_invitations ai
  WHERE ai.token = p_token
  AND ai.status = 'pending'
  AND ai.expires_at > now();
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to accept invitation
CREATE OR REPLACE FUNCTION accept_admin_invitation(
  p_token TEXT,
  p_admin_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  admin_user_id UUID
) AS $$
DECLARE
  v_invitation_id UUID;
  v_email TEXT;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_invited_by_admin_id UUID;
  v_admin_user_id UUID;
BEGIN
  -- Validate token
  SELECT 
    invitation_id,
    email,
    status,
    expires_at,
    invited_by_admin_id
  INTO v_invitation_id, v_email, v_status, v_expires_at, v_invited_by_admin_id
  FROM validate_admin_invitation_token(p_token);
  
  IF v_invitation_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation token', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if admin user already exists
  SELECT id INTO v_admin_user_id
  FROM admin_users
  WHERE email = v_email;
  
  IF v_admin_user_id IS NULL THEN
    -- Create new admin user
    INSERT INTO admin_users (id, email, role, status, created_at, updated_at)
    VALUES (p_admin_id, v_email, 'admin', 'active', now(), now())
    RETURNING id INTO v_admin_user_id;
  ELSE
    -- Update existing admin user
    UPDATE admin_users
    SET 
      id = p_admin_id,
      status = 'active',
      updated_at = now()
    WHERE id = v_admin_user_id;
  END IF;
  
  -- Mark invitation as accepted
  UPDATE admin_invitations
  SET 
    status = 'accepted',
    accepted_admin_id = v_admin_user_id,
    updated_at = now()
  WHERE id = v_invitation_id;
  
  RETURN QUERY SELECT TRUE, 'Invitation accepted successfully', v_admin_user_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to revoke invitation
CREATE OR REPLACE FUNCTION revoke_admin_invitation(p_invitation_id UUID, p_revoked_by_admin_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Check if invitation exists and is pending
  IF NOT EXISTS (
    SELECT 1 FROM admin_invitations 
    WHERE id = p_invitation_id 
    AND status = 'pending'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already processed';
    RETURN;
  END IF;
  
  -- Revoke invitation
  UPDATE admin_invitations
  SET 
    status = 'revoked',
    updated_at = now()
  WHERE id = p_invitation_id;
  
  RETURN QUERY SELECT TRUE, 'Invitation revoked successfully';
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get admin invitation statistics
CREATE OR REPLACE FUNCTION get_admin_invitation_stats()
RETURNS TABLE(
  total_invitations BIGINT,
  pending_invitations BIGINT,
  accepted_invitations BIGINT,
  expired_invitations BIGINT,
  revoked_invitations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_invitations,
    COUNT(*) FILTER (WHERE status = 'revoked') as revoked_invitations
  FROM admin_invitations;
END;
$$ LANGUAGE plpgsql;

-- 11. Add comments for documentation
COMMENT ON TABLE admin_invitations IS 'Admin invitation system for onboarding new administrators';
COMMENT ON COLUMN admin_invitations.email IS 'Email address of the invited admin (case-insensitive)';
COMMENT ON COLUMN admin_invitations.token IS 'Cryptographically secure token for invitation acceptance';
COMMENT ON COLUMN admin_invitations.expires_at IS 'Expiration timestamp (48 hours from creation)';
COMMENT ON COLUMN admin_invitations.invited_by_admin_id IS 'ID of the admin who sent the invitation';
COMMENT ON COLUMN admin_invitations.accepted_admin_id IS 'ID of the admin who accepted the invitation (set on acceptance)';
COMMENT ON COLUMN admin_invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN admin_invitations.metadata IS 'Additional metadata for future extensibility';

COMMENT ON FUNCTION generate_admin_invitation_token() IS 'Generates a cryptographically secure token for admin invitations';
COMMENT ON FUNCTION validate_admin_invitation_token(TEXT) IS 'Validates an invitation token and returns invitation details';
COMMENT ON FUNCTION accept_admin_invitation(TEXT, UUID) IS 'Accepts an admin invitation and creates/updates admin user';
COMMENT ON FUNCTION revoke_admin_invitation(UUID, UUID) IS 'Revokes a pending admin invitation';
COMMENT ON FUNCTION get_admin_invitation_stats() IS 'Returns statistics about admin invitations';
COMMENT ON FUNCTION cleanup_expired_admin_invitations() IS 'Marks expired invitations as expired (run periodically)';

-- 12. Create a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_invitations_updated_at
  BEFORE UPDATE ON admin_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_invitations_updated_at();

