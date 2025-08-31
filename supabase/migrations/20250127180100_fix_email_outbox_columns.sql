-- Migration: Fix Email Outbox Missing Columns
-- Date: 2025-01-27
-- Purpose: Add missing columns to email_outbox table

-- Add missing columns to email_outbox table
ALTER TABLE email_outbox 
ADD COLUMN IF NOT EXISTS html_content TEXT,
ADD COLUMN IF NOT EXISTS text_content TEXT,
ADD COLUMN IF NOT EXISTS template TEXT,
ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update existing rows to have default values for new columns
UPDATE email_outbox 
SET 
  html_content = COALESCE(html_content, ''),
  text_content = COALESCE(text_content, ''),
  template = COALESCE(template, 'unknown'),
  payload = COALESCE(payload, '{}'::jsonb)
WHERE html_content IS NULL OR text_content IS NULL OR template IS NULL OR payload IS NULL;

-- Make columns NOT NULL after setting defaults
ALTER TABLE email_outbox 
ALTER COLUMN html_content SET NOT NULL,
ALTER COLUMN text_content SET NOT NULL,
ALTER COLUMN template SET NOT NULL;

-- Add comments for the new columns
COMMENT ON COLUMN email_outbox.html_content IS 'HTML content of the email';
COMMENT ON COLUMN email_outbox.text_content IS 'Plain text content of the email';
COMMENT ON COLUMN email_outbox.template IS 'Template identifier (e.g., admin.invitation)';
COMMENT ON COLUMN email_outbox.payload IS 'JSON payload with template variables';
COMMENT ON COLUMN email_outbox.sent_at IS 'Timestamp when email was sent (if different from created_at)';
COMMENT ON COLUMN email_outbox.error_message IS 'Error message if email sending failed';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added missing columns to email_outbox table';
END $$;
