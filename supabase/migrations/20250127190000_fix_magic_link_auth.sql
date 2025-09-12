-- Fix Magic Link Authentication - Update admin_users status field
-- Date: 2025-01-27
-- Description: Updates existing active admin users to have 'active' status
-- This ensures compatibility with the updated authentication logic

-- Update admin users who are active but have NULL or non-'active' status
UPDATE admin_users
SET status = 'active', updated_at = NOW()
WHERE is_active = true AND (status IS NULL OR status != 'active');

-- Log the update for audit purposes
INSERT INTO admin_audit_logs (admin_email, action, details, created_at)
SELECT 
    email,
    'SYSTEM_UPDATE',
    '{"message": "Updated status to active for Magic Link authentication compatibility"}'::jsonb,
    NOW()
FROM admin_users 
WHERE is_active = true AND status = 'active'
AND updated_at > NOW() - INTERVAL '1 minute';
