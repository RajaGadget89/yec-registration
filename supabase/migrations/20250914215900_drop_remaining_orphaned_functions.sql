-- Drop remaining orphaned deep link functions that reference non-existent columns
-- These functions are not used by the application and cause linting errors

-- Drop functions that reference 'token' column (doesn't exist)
DROP FUNCTION IF EXISTS create_deep_link_token(UUID, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS mark_deep_link_token_used(TEXT, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS validate_deep_link_token(TEXT, UUID);

-- Drop functions that reference 'admin_email' column (doesn't exist)
DROP FUNCTION IF EXISTS validate_deep_link_token_by_id(UUID);

-- Drop functions with other issues
DROP FUNCTION IF EXISTS get_deep_link_token_stats(INTEGER);
DROP FUNCTION IF EXISTS validate_and_consume_deep_link_token(TEXT, UUID);

-- Keep the working functions that are actually used by the application:
-- - generate_secure_deep_link_token ✅
-- - mark_deep_link_token_used_by_id ✅ (this one works correctly)
-- - log_deep_link_token_creation ✅
-- - log_deep_link_token_usage ✅
-- - cleanup_expired_deep_link_tokens ✅
-- - generate_deep_link_token ✅
-- - generate_simple_deep_link_token ✅

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Remaining orphaned deep link functions dropped successfully';
  RAISE NOTICE 'Working functions preserved: generate_secure_deep_link_token, mark_deep_link_token_used_by_id, log_deep_link_token_creation, log_deep_link_token_usage, cleanup_expired_deep_link_tokens';
END $$;
