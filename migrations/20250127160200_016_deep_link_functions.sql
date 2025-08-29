-- Migration: Deep-link token management functions
-- Version: 16.0
-- Description: Creates database functions for deep-link token validation and management
-- Date: 2025-01-27

-- 1. Function to validate deep-link token
CREATE OR REPLACE FUNCTION validate_deep_link_token(p_token TEXT)
RETURNS TABLE(
  success BOOLEAN,
  registration_id UUID,
  dimension TEXT,
  admin_email TEXT,
  notes TEXT,
  message TEXT
) AS $$
BEGIN
  -- Check if token exists and is not expired
  RETURN QUERY
  SELECT 
    CASE 
      WHEN dlt.used_at IS NOT NULL THEN FALSE
      WHEN dlt.expires_at < NOW() THEN FALSE
      ELSE TRUE
    END as success,
    dlt.registration_id,
    dlt.dimension,
    dlt.admin_email,
    dlt.notes,
    CASE 
      WHEN dlt.used_at IS NOT NULL THEN 'Token has already been used'
      WHEN dlt.expires_at < NOW() THEN 'Token has expired'
      ELSE 'Token is valid'
    END as message
  FROM deep_link_tokens dlt
  WHERE dlt.token = p_token;
  
  -- If no token found, return failure
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      FALSE as success,
      NULL::UUID as registration_id,
      NULL::TEXT as dimension,
      NULL::TEXT as admin_email,
      NULL::TEXT as notes,
      'Token not found' as message;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to create deep-link token
CREATE OR REPLACE FUNCTION create_deep_link_token(
  p_registration_id UUID,
  p_dimension TEXT,
  p_admin_email TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate a secure random token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Set expiration to 24 hours from now
  v_expires_at := NOW() + INTERVAL '24 hours';
  
  -- Insert the token
  INSERT INTO deep_link_tokens (
    token,
    registration_id,
    dimension,
    admin_email,
    notes,
    expires_at
  ) VALUES (
    v_token,
    p_registration_id,
    p_dimension,
    p_admin_email,
    p_notes,
    v_expires_at
  );
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to mark deep-link token as used (maintains same return type as migration 015)
CREATE OR REPLACE FUNCTION mark_deep_link_token_used(p_token TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Mark token as used
  UPDATE deep_link_tokens 
  SET used_at = NOW(), updated_at = NOW()
  WHERE token = p_token AND used_at IS NULL;
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Token marked as used'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Token not found or already used'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to clean up expired tokens (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_deep_link_tokens()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete tokens that are expired and unused
  DELETE FROM deep_link_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_deep_link_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_deep_link_token(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_deep_link_token_used(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_deep_link_tokens() TO authenticated;

-- Migration completed successfully
SELECT 'Deep-link token functions migration completed successfully' as status;
