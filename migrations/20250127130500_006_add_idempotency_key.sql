-- Migration: Add idempotency_key to email_outbox
-- Version: 6.0
-- Description: Add idempotency_key column to email_outbox table for better deduplication
-- Date: 2025-01-27

-- Add idempotency_key column to email_outbox table
ALTER TABLE email_outbox 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create index for idempotency_key lookups
CREATE INDEX IF NOT EXISTS idx_email_outbox_idempotency_key 
ON email_outbox (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Create unique constraint on idempotency_key to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_idempotency_key_uidx 
ON email_outbox (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Update the fn_enqueue_email function to handle idempotency_key
CREATE OR REPLACE FUNCTION fn_enqueue_email(
  p_template TEXT,
  p_to_email TEXT,
  p_subject TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_dedupe_key TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- If idempotency key provided, try to find existing record
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id FROM email_outbox WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_id;
    END IF;
  END IF;

  -- If dedupe key provided, try to find existing record (fallback)
  IF p_dedupe_key IS NOT NULL THEN
    SELECT id INTO v_id FROM email_outbox WHERE dedupe_key = p_dedupe_key;
    IF FOUND THEN
      RETURN v_id;
    END IF;
  END IF;

  -- Insert new email record
  INSERT INTO email_outbox (
    template, 
    to_email, 
    subject,
    payload, 
    dedupe_key,
    idempotency_key,
    scheduled_at
  ) VALUES (
    p_template,
    p_to_email,
    p_subject,
    COALESCE(p_payload, '{}'::jsonb),
    p_dedupe_key,
    p_idempotency_key,
    p_scheduled_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the change
COMMENT ON COLUMN email_outbox.idempotency_key IS 'Unique key for idempotent email processing to prevent duplicate sends';
