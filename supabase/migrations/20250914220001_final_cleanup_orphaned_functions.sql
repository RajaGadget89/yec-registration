-- Final cleanup: Drop all orphaned deep link functions that reference non-existent columns
-- These functions are not used by the application and cause linting errors

-- Drop all problematic functions that reference 'token' or 'admin_email' columns
DROP FUNCTION IF EXISTS create_deep_link_token CASCADE;
DROP FUNCTION IF EXISTS validate_deep_link_token CASCADE;
DROP FUNCTION IF EXISTS mark_deep_link_token_used CASCADE;
DROP FUNCTION IF EXISTS validate_deep_link_token_by_id CASCADE;
DROP FUNCTION IF EXISTS validate_and_consume_deep_link_token CASCADE;
DROP FUNCTION IF EXISTS get_deep_link_token_stats CASCADE;

-- Keep only the working functions that are actually used by the application:
-- - generate_secure_deep_link_token ✅
-- - mark_deep_link_token_used_by_id ✅ (this one works correctly)
-- - log_deep_link_token_creation ✅
-- - log_deep_link_token_usage ✅
-- - cleanup_expired_deep_link_tokens ✅
-- - generate_deep_link_token ✅
-- - generate_simple_deep_link_token ✅

-- Log the final cleanup
DO $$
BEGIN
  RAISE NOTICE 'Final cleanup: All orphaned deep link functions dropped successfully';
  RAISE NOTICE 'Working functions preserved: generate_secure_deep_link_token, mark_deep_link_token_used_by_id, log_deep_link_token_creation, log_deep_link_token_usage, cleanup_expired_deep_link_tokens, generate_deep_link_token, generate_simple_deep_link_token';
END $$;
