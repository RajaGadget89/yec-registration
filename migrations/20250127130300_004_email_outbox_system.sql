-- Migration: Email Outbox System
-- Version: 4.0
-- Description: Implement email outbox pattern for reliable email delivery
-- Date: 2025-01-27

-- 1. Create email status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    CREATE TYPE email_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'blocked');
  END IF;
END$$;

-- 2. Create email_outbox table
CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template TEXT NOT NULL CHECK (template IN ('tracking', 'update-payment', 'update-info', 'update-tcc', 'approval-badge', 'rejection')),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status email_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_attempt TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_scheduled ON email_outbox (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_outbox_template ON email_outbox (template);
CREATE INDEX IF NOT EXISTS idx_email_outbox_to_email ON email_outbox (to_email);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at ON email_outbox (created_at);

-- Ensure next_attempt column exists before creating index (drift-safe)
DO $$
BEGIN
  -- Ensure table exists (skip if missing; 004 should already create it on clean DB)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_outbox'
  ) THEN
    -- Add column if it does not exist (handles old staging table)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name = 'next_attempt'
    ) THEN
      ALTER TABLE public.email_outbox
        ADD COLUMN next_attempt timestamptz NULL;
    END IF;
  END IF;
END $$;

-- Create the correct index (safe if just added or already present)
CREATE INDEX IF NOT EXISTS idx_email_outbox_next_attempt ON public.email_outbox (next_attempt);
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_dedupe_key_uidx ON email_outbox (dedupe_key) WHERE dedupe_key IS NOT NULL;

-- 4. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END$$;

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON email_outbox;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON email_outbox
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

-- 6. Create function to enqueue emails
CREATE OR REPLACE FUNCTION fn_enqueue_email(
  p_template TEXT,
  p_to_email TEXT,
  p_subject TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_dedupe_key TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- If dedupe key provided, try to find existing record
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
    scheduled_at
  ) VALUES (
    p_template,
    p_to_email,
    p_subject,
    COALESCE(p_payload, '{}'::jsonb),
    p_dedupe_key,
    p_scheduled_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to get pending emails for dispatch
CREATE OR REPLACE FUNCTION fn_get_pending_emails(p_batch_size INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  template TEXT,
  to_email TEXT,
  to_name TEXT,
  subject TEXT,
  payload JSONB,
  dedupe_key TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eo.id,
    eo.template,
    eo.to_email,
    eo.to_name,
    eo.subject,
    eo.payload,
    eo.dedupe_key
  FROM email_outbox eo
  WHERE eo.status = 'pending' 
    AND eo.scheduled_at <= now()
    AND (eo.next_attempt IS NULL OR eo.next_attempt <= now())
    AND eo.attempts < eo.max_attempts
  ORDER BY eo.created_at ASC
  LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to mark email as sent
CREATE OR REPLACE FUNCTION fn_mark_email_sent(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE email_outbox 
  SET 
    status = 'sent',
    sent_at = now(),
    last_attempt_at = now(),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to mark email as failed
CREATE OR REPLACE FUNCTION fn_mark_email_failed(p_id UUID, p_error TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_record RECORD;
  next_attempt TIMESTAMPTZ;
BEGIN
  -- Get current record
  SELECT * INTO current_record FROM email_outbox WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate next attempt time with exponential backoff
  IF current_record.attempts < current_record.max_attempts THEN
    -- Exponential backoff: 1min, 2min, 4min, 8min, 16min
    next_attempt := now() + (POWER(2, current_record.attempts) || ' minutes')::interval;
    
    UPDATE email_outbox 
    SET 
      status = 'pending',
      attempts = attempts + 1,
      last_error = p_error,
      next_attempt = next_attempt,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = p_id;
  ELSE
    -- Max attempts reached, mark as failed
    UPDATE email_outbox 
    SET 
      status = 'failed',
      last_error = p_error,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = p_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get outbox statistics
CREATE OR REPLACE FUNCTION fn_get_outbox_stats()
RETURNS TABLE(
  total_pending INTEGER,
  total_sent INTEGER,
  total_failed INTEGER,
  total_blocked INTEGER,
  oldest_pending TIMESTAMPTZ,
  avg_attempts NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as total_pending,
    COUNT(*) FILTER (WHERE status = 'sent')::INTEGER as total_sent,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as total_failed,
    COUNT(*) FILTER (WHERE status = 'blocked')::INTEGER as total_blocked,
    MIN(created_at) FILTER (WHERE status = 'pending') as oldest_pending,
    AVG(attempts)::NUMERIC as avg_attempts
  FROM email_outbox;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to clean up old emails
CREATE OR REPLACE FUNCTION fn_cleanup_old_emails(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_outbox
  WHERE created_at < now() - (days_to_keep || ' days')::interval
    AND status IN ('sent', 'failed', 'blocked');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to retry failed emails
CREATE OR REPLACE FUNCTION fn_retry_failed_emails()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE email_outbox
  SET 
    status = 'pending',
    attempts = 0,
          next_attempt = now(),
    last_error = NULL,
    updated_at = now()
  WHERE status = 'failed';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 13. Update the registration_sweep function to enqueue rejection emails
CREATE OR REPLACE FUNCTION registration_sweep()
RETURNS TABLE(registration_id TEXT, action TEXT, reason TEXT) AS $$
DECLARE
  event_setting RECORD;
  reg RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event settings not found';
  END IF;
  
  -- Process deadline rejections
  FOR reg IN 
    SELECT id, registration_id, email, first_name, last_name
    FROM registrations 
    WHERE status IN ('waiting_for_review', 'waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc')
      AND created_at < event_setting.registration_deadline_utc
  LOOP
    -- Update registration status
    UPDATE registrations 
    SET 
      status = 'rejected',
      rejected_reason = 'deadline_missed',
      payment_review_status = 'rejected',
      profile_review_status = 'rejected',
      tcc_review_status = 'rejected',
      updated_at = NOW()
    WHERE id = reg.id;
    
    -- Enqueue rejection email
    PERFORM fn_enqueue_email(
      'rejection',
      reg.email,
      'Registration Rejected - YEC Day',
      json_build_object(
        'trackingCode', reg.registration_id,
        'rejectedReason', 'deadline_missed',
        'applicantName', reg.first_name || ' ' || reg.last_name
      ),
      'registration:' || reg.id || ':rejection'
    );
    
    registration_id := reg.registration_id;
    action := 'rejected';
    reason := 'deadline_missed';
    RETURN NEXT;
  END LOOP;
  
  -- Process eligibility rule rejections (if rules exist)
  IF event_setting.eligibility_rules IS NOT NULL AND 
     (event_setting.eligibility_rules->>'blocked_emails' != '[]' OR 
      event_setting.eligibility_rules->>'blocked_domains' != '[]' OR 
      event_setting.eligibility_rules->>'blocked_keywords' != '[]') THEN
    
    FOR reg IN 
      SELECT id, registration_id, email, first_name, last_name
      FROM registrations 
      WHERE status IN ('waiting_for_review', 'waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc')
        AND (
          -- Check blocked emails
          email = ANY(SELECT jsonb_array_elements_text(event_setting.eligibility_rules->'blocked_emails'))
          OR
          -- Check blocked domains
          email LIKE '%@' || ANY(SELECT jsonb_array_elements_text(event_setting.eligibility_rules->'blocked_domains'))
          OR
          -- Check blocked keywords in email
          email LIKE ANY(SELECT '%' || jsonb_array_elements_text(event_setting.eligibility_rules->'blocked_keywords') || '%')
        )
    LOOP
      -- Update registration status
      UPDATE registrations 
      SET 
        status = 'rejected',
        rejected_reason = 'ineligible_rule_match',
        payment_review_status = 'rejected',
        profile_review_status = 'rejected',
        tcc_review_status = 'rejected',
        updated_at = NOW()
      WHERE id = reg.id;
      
      -- Enqueue rejection email
      PERFORM fn_enqueue_email(
        'rejection',
        reg.email,
        'Registration Rejected - YEC Day',
        json_build_object(
          'trackingCode', reg.registration_id,
          'rejectedReason', 'ineligible_rule_match',
          'applicantName', reg.first_name || ' ' || reg.last_name
        ),
        'registration:' || reg.id || ':rejection'
      );
      
      registration_id := reg.registration_id;
      action := 'rejected';
      reason := 'ineligible_rule_match';
      RETURN NEXT;
    END LOOP;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Migration completed successfully
SELECT 'Email outbox system migration completed successfully' as status;
