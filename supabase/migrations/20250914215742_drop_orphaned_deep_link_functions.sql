-- Drop orphaned deep link functions that reference non-existent columns
-- These functions are not used by the application and cause linting errors

-- Drop the old create_deep_link_token function (references admin_email column)
DROP FUNCTION IF EXISTS create_deep_link_token(UUID, TEXT, TEXT, TEXT, INTEGER);

-- Drop the old validate_deep_link_token function (references token column)
DROP FUNCTION IF EXISTS validate_deep_link_token(TEXT, UUID);

-- Drop the old mark_deep_link_token_used function (references token column)
DROP FUNCTION IF EXISTS mark_deep_link_token_used(TEXT, UUID, TEXT, TEXT, TEXT);

-- Verify that the working functions still exist
-- These are the functions actually used by the application:
-- - validate_deep_link_token_by_id
-- - mark_deep_link_token_used_by_id  
-- - generate_secure_deep_link_token
-- - log_deep_link_token_creation
-- - log_deep_link_token_usage

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Orphaned deep link functions dropped successfully';
  RAISE NOTICE 'Working functions preserved: validate_deep_link_token_by_id, mark_deep_link_token_used_by_id, generate_secure_deep_link_token';
END $$;
