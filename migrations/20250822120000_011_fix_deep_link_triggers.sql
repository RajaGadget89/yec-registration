-- Migration: Fix Deep Link Triggers - Production Hotfix
-- Version: 1.0
-- Description: Fix deep link trigger conflicts in production
-- Date: 2025-08-22

-- This migration fixes the trigger conflict issue that occurred during CD deployment
-- The issue was that triggers already existed in production but the migration tried to create them again

-- 1. Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS trigger_log_deep_link_token_creation ON deep_link_tokens;
DROP TRIGGER IF EXISTS trigger_log_deep_link_token_usage ON deep_link_tokens;

-- 2. Recreate the trigger functions to ensure they're up to date
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

-- 3. Create the triggers
CREATE TRIGGER trigger_log_deep_link_token_creation
  AFTER INSERT ON deep_link_tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_deep_link_token_creation();

CREATE TRIGGER trigger_log_deep_link_token_usage
  AFTER UPDATE ON deep_link_tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_deep_link_token_usage();

-- 4. Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Deep link trigger fix completed successfully';
    RAISE NOTICE 'Triggers recreated without conflicts';
END $$;
