-- Migration: Deep-link tokens table
-- Version: 15.0
-- Description: Creates deep-link tokens table for user resubmission functionality
-- Date: 2025-01-27

-- 1. Create deep_link_tokens table
CREATE TABLE IF NOT EXISTS deep_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('payment', 'profile', 'tcc')),
  admin_email TEXT NOT NULL,
  notes TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for performance (idempotent)
DO $$
BEGIN
  -- Check if token column exists before creating index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deep_link_tokens'
      AND column_name = 'token'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_token ON deep_link_tokens(token);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_registration_id ON deep_link_tokens(registration_id);
CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_expires_at ON deep_link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_used_at ON deep_link_tokens(used_at);

-- 3. Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_deep_link_token()
RETURNS TEXT AS $$
BEGIN
  -- Generate a secure random token using pgcrypto
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to create deep-link token
CREATE OR REPLACE FUNCTION create_deep_link_token(
  p_registration_id UUID,
  p_dimension TEXT,
  p_admin_email TEXT,
  p_notes TEXT DEFAULT NULL,
  p_ttl_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  success BOOLEAN,
  token TEXT,
  message TEXT
) AS $$
DECLARE
  new_token TEXT;
  token_expires TIMESTAMPTZ;
BEGIN
  -- Validate dimension
  IF p_dimension NOT IN ('payment', 'profile', 'tcc') THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Invalid dimension'::TEXT;
    RETURN;
  END IF;
  
  -- Check if registration exists
  IF NOT EXISTS (SELECT 1 FROM registrations WHERE id = p_registration_id) THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Registration not found'::TEXT;
    RETURN;
  END IF;
  
  -- Generate token and expiration
  new_token := generate_deep_link_token();
  token_expires := NOW() + (p_ttl_hours || ' hours')::INTERVAL;
  
  -- Insert token
  INSERT INTO deep_link_tokens (
    token,
    registration_id,
    dimension,
    admin_email,
    notes,
    expires_at
  ) VALUES (
    new_token,
    p_registration_id,
    p_dimension,
    p_admin_email,
    p_notes,
    token_expires
  );
  
  RETURN QUERY SELECT TRUE, new_token, 'Token created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to validate and use deep-link token
CREATE OR REPLACE FUNCTION validate_deep_link_token(
  p_token TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  registration_id UUID,
  dimension TEXT,
  admin_email TEXT,
  notes TEXT,
  message TEXT
) AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Find token
  SELECT * INTO token_record
  FROM deep_link_tokens
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Token not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if expired
  IF token_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Token expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check if already used
  IF token_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Token already used'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    TRUE, 
    token_record.registration_id, 
    token_record.dimension, 
    token_record.admin_email, 
    token_record.notes, 
    'Token valid'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to mark token as used
CREATE OR REPLACE FUNCTION mark_deep_link_token_used(
  p_token TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Update token to mark as used
  UPDATE deep_link_tokens
  SET used_at = NOW(), updated_at = NOW()
  WHERE token = p_token AND used_at IS NULL;
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Token marked as used'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Token not found or already used'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM deep_link_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Add update trigger for timestamps
DROP TRIGGER IF EXISTS update_deep_link_tokens_updated_at ON deep_link_tokens;
CREATE TRIGGER update_deep_link_tokens_updated_at
    BEFORE UPDATE ON deep_link_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migration completed successfully
SELECT 'Deep-link tokens migration completed successfully' as status;
