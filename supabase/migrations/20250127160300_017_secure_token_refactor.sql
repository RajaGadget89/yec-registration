-- Migration: Secure token refactor
-- Version: 17.0
-- Description: Refactor deep-link tokens to use secure hashing and token_id
-- Date: 2025-01-27

-- 1. Add token_id column to deep_link_tokens table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deep_link_tokens'
      AND column_name = 'token_id'
  ) THEN
    ALTER TABLE deep_link_tokens 
    ADD COLUMN token_id UUID DEFAULT gen_random_uuid();
  END IF;
END$$;

-- 2. Add token_hash column for secure storage (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deep_link_tokens'
      AND column_name = 'token_hash'
  ) THEN
    ALTER TABLE deep_link_tokens 
    ADD COLUMN token_hash TEXT NOT NULL DEFAULT '';
  END IF;
END$$;

-- 3. Add salt column for per-token salting (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deep_link_tokens'
      AND column_name = 'token_salt'
  ) THEN
    ALTER TABLE deep_link_tokens 
    ADD COLUMN token_salt TEXT NOT NULL DEFAULT '';
  END IF;
END$$;

-- 4. Create index on token_id for efficient lookups (already idempotent)
CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_token_id 
ON deep_link_tokens (token_id);

-- 5. Update existing tokens to have proper hash and salt (only if token column exists)
DO $$
BEGIN
  -- Only run this update if the token column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deep_link_tokens'
      AND column_name = 'token'
  ) THEN
    UPDATE deep_link_tokens 
    SET token_hash = encode(digest(token || 'legacy', 'sha256'), 'hex'),
        token_salt = 'legacy'
    WHERE token_hash = '';
  END IF;
END$$;

-- 6. Make token_id NOT NULL after setting defaults (idempotent)
DO $$
BEGIN
  -- Check if token_id column exists and is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deep_link_tokens'
      AND column_name = 'token_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE deep_link_tokens 
    ALTER COLUMN token_id SET NOT NULL;
  END IF;
END$$;

-- 7. Update the create_deep_link_token function to use secure hashing (maintains TEXT return type)
CREATE OR REPLACE FUNCTION create_deep_link_token(
  p_registration_id UUID,
  p_dimension TEXT,
  p_admin_email TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_salt TEXT;
  v_hash TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate a secure random token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Generate a unique salt for this token
  v_salt := encode(gen_random_bytes(16), 'hex');
  
  -- Hash the token with the salt
  v_hash := encode(digest(v_token || v_salt, 'sha256'), 'hex');
  
  -- Set expiration to 24 hours from now
  v_expires_at := NOW() + INTERVAL '24 hours';
  
  -- Insert the token with secure storage
  INSERT INTO deep_link_tokens (
    token_id,
    token,
    token_hash,
    token_salt,
    registration_id,
    dimension,
    admin_email,
    notes,
    expires_at
  ) VALUES (
    gen_random_uuid(),
    v_token,
    v_hash,
    v_salt,
    p_registration_id,
    p_dimension,
    p_admin_email,
    p_notes,
    v_expires_at
  );
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update the validate_deep_link_token function to work with token_id
CREATE OR REPLACE FUNCTION validate_deep_link_token_by_id(p_token_id UUID)
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
  WHERE dlt.token_id = p_token_id;
  
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

-- 9. Update the mark_deep_link_token_used function to work with token_id
CREATE OR REPLACE FUNCTION mark_deep_link_token_used_by_id(p_token_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Mark token as used
  UPDATE deep_link_tokens 
  SET used_at = NOW(), updated_at = NOW()
  WHERE token_id = p_token_id AND used_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant permissions for new functions (idempotent)
DO $$
BEGIN
  -- Grant permissions if they don't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'validate_deep_link_token_by_id'
      AND grantee = 'authenticated'
  ) THEN
    GRANT EXECUTE ON FUNCTION validate_deep_link_token_by_id(UUID) TO authenticated;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'mark_deep_link_token_used_by_id'
      AND grantee = 'authenticated'
  ) THEN
    GRANT EXECUTE ON FUNCTION mark_deep_link_token_used_by_id(UUID) TO authenticated;
  END IF;
END$$;

-- Migration completed successfully
SELECT 'Secure token refactor migration completed successfully' as status;
