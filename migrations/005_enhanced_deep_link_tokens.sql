-- Migration: Enhanced Deep Link Token Security
-- Version: 5.0
-- Description: Implement production-ready deep link tokens with single-use, TTL, and audit logging

-- 1. Create deep_link_tokens table for secure token management
CREATE TABLE IF NOT EXISTS deep_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('payment', 'profile', 'tcc')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL, -- admin email who created the token
  used_by TEXT, -- user email who used the token (if applicable)
  ip_address TEXT, -- IP address of token usage
  user_agent TEXT -- User agent of token usage
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_token_hash ON deep_link_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_registration_id ON deep_link_tokens(registration_id);
CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_expires_at ON deep_link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_deep_link_tokens_used_at ON deep_link_tokens(used_at);

-- 3. Create function to generate secure deep-link tokens
CREATE OR REPLACE FUNCTION generate_secure_deep_link_token(
  reg_id UUID,
  dimension TEXT,
  admin_email TEXT,
  ttl_seconds INTEGER DEFAULT 86400 -- 24 hours default
)
RETURNS TEXT AS $$
DECLARE
  token_data JSONB;
  token TEXT;
  token_hash TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Validate dimension
  IF dimension NOT IN ('payment', 'profile', 'tcc') THEN
    RAISE EXCEPTION 'Invalid dimension: %', dimension;
  END IF;
  
  -- Check if registration exists and is in update state
  IF NOT EXISTS (
    SELECT 1 FROM registrations 
    WHERE id = reg_id 
    AND status IN ('waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc')
  ) THEN
    RAISE EXCEPTION 'Registration % is not in update state', reg_id;
  END IF;
  
  -- Set expiration time
  expires_at := NOW() + (ttl_seconds || ' seconds')::interval;
  
  -- Create token data
  token_data := jsonb_build_object(
    'reg_id', reg_id,
    'dimension', dimension,
    'expires_at', expires_at::text,
    'created_at', NOW()::text,
    'nonce', encode(gen_random_bytes(16), 'hex')
  );
  
  -- Generate token using HMAC with secret
  token := encode(
    hmac(
      token_data::text, 
      COALESCE(current_setting('app.deep_link_secret', true), 'default-secret'), 
      'sha256'
    ), 
    'base64'
  );
  
  -- Create hash for storage (we don't store the actual token)
  token_hash := encode(
    hmac(token, 'storage-salt', 'sha256'),
    'hex'
  );
  
  -- Store token record
  INSERT INTO deep_link_tokens (
    token_hash,
    registration_id,
    dimension,
    expires_at,
    created_by
  ) VALUES (
    token_hash,
    reg_id,
    dimension,
    expires_at,
    admin_email
  );
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to validate and consume deep-link tokens
CREATE OR REPLACE FUNCTION validate_and_consume_deep_link_token(
  token TEXT,
  reg_id UUID,
  user_email TEXT DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  token_data JSONB;
  expected_token TEXT;
  expires_at TIMESTAMPTZ;
  token_hash TEXT;
  token_record RECORD;
  result JSONB;
BEGIN
  -- Create token data for validation (same structure as generation)
  token_data := jsonb_build_object(
    'reg_id', reg_id,
    'dimension', 'unknown', -- Will be determined from stored record
    'expires_at', 'unknown', -- Will be determined from stored record
    'created_at', 'unknown', -- Will be determined from stored record
    'nonce', 'unknown' -- Will be determined from stored record
  );
  
  -- Generate expected token hash
  token_hash := encode(
    hmac(token, 'storage-salt', 'sha256'),
    'hex'
  );
  
  -- Find token record
  SELECT * INTO token_record
  FROM deep_link_tokens
  WHERE token_hash = token_hash
  AND registration_id = reg_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'token_not_found'
    );
  END IF;
  
  -- Check if token is expired
  IF token_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'token_expired',
      'expires_at', token_record.expires_at
    );
  END IF;
  
  -- Check if token is already used
  IF token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'token_already_used',
      'used_at', token_record.used_at
    );
  END IF;
  
  -- Mark token as used
  UPDATE deep_link_tokens
  SET 
    used_at = NOW(),
    used_by = user_email,
    ip_address = ip_address,
    user_agent = user_agent
  WHERE id = token_record.id;
  
  -- Return success with token details
  RETURN jsonb_build_object(
    'valid', true,
    'dimension', token_record.dimension,
    'created_at', token_record.created_at,
    'expires_at', token_record.expires_at,
    'used_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_deep_link_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM deep_link_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep expired tokens for 7 days for audit
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Create audit log table for deep link token events
CREATE TABLE IF NOT EXISTS deep_link_token_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES deep_link_tokens(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'used', 'expired', 'invalid_attempt')),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  admin_email TEXT,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  reason TEXT, -- For invalid attempts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_token_id ON deep_link_token_audit(token_id);
CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_registration_id ON deep_link_token_audit(registration_id);
CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_event_type ON deep_link_token_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_deep_link_token_audit_created_at ON deep_link_token_audit(created_at);

-- 8. Create trigger to log token creation
CREATE OR REPLACE FUNCTION log_deep_link_token_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deep_link_token_audit (
    token_id,
    event_type,
    registration_id,
    dimension,
    admin_email,
    created_at
  ) VALUES (
    NEW.id,
    'created',
    NEW.registration_id,
    NEW.dimension,
    NEW.created_by,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_deep_link_token_creation
  AFTER INSERT ON deep_link_tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_deep_link_token_creation();

-- 9. Create trigger to log token usage
CREATE OR REPLACE FUNCTION log_deep_link_token_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.used_at IS NOT NULL AND OLD.used_at IS NULL THEN
    INSERT INTO deep_link_token_audit (
      token_id,
      event_type,
      registration_id,
      dimension,
      admin_email,
      user_email,
      ip_address,
      user_agent,
      created_at
    ) VALUES (
      NEW.id,
      'used',
      NEW.registration_id,
      NEW.dimension,
      NEW.created_by,
      NEW.used_by,
      NEW.ip_address,
      NEW.user_agent,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_deep_link_token_usage
  AFTER UPDATE ON deep_link_tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_deep_link_token_usage();

-- 10. Create function to get token statistics
CREATE OR REPLACE FUNCTION get_deep_link_token_stats(
  days_back INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_created', COUNT(*),
    'total_used', COUNT(*) FILTER (WHERE used_at IS NOT NULL),
    'total_expired', COUNT(*) FILTER (WHERE expires_at < NOW() AND used_at IS NULL),
    'active_tokens', COUNT(*) FILTER (WHERE expires_at > NOW() AND used_at IS NULL),
    'by_dimension', jsonb_object_agg(
      dimension, 
      jsonb_build_object(
        'created', COUNT(*) FILTER (WHERE dimension = dlt.dimension),
        'used', COUNT(*) FILTER (WHERE dimension = dlt.dimension AND used_at IS NOT NULL),
        'expired', COUNT(*) FILTER (WHERE dimension = dlt.dimension AND expires_at < NOW() AND used_at IS NULL)
      )
    )
  ) INTO stats
  FROM deep_link_tokens dlt
  WHERE created_at > NOW() - (days_back || ' days')::interval;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Migration completed successfully
SELECT 'Enhanced deep link token security migration completed successfully' as status;
