-- Migration: Fix Admin Invitations Roles Column
-- Date: 2025-01-27
-- Purpose: Add missing roles column to admin_invitations table

-- Add the missing roles column to admin_invitations table
ALTER TABLE admin_invitations 
ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- Add comment for the roles column
COMMENT ON COLUMN admin_invitations.roles IS 'Array of role slugs assigned to the invitation';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added missing roles column to admin_invitations table';
END $$;
