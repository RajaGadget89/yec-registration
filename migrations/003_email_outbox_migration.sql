-- Email Outbox Migration
-- Version: 1.0
-- Purpose: Implement email outbox pattern for reliable email delivery
-- Date: 2025-01-27

-- 1. Create email_outbox table
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL CHECK (template IN ('tracking', 'update-payment', 'update-info', 'update-tcc', 'approval-badge', 'rejection')),
  to_email text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
  error text NULL,
  idempotency_key text NULL UNIQUE,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_scheduled 
  ON email_outbox (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_email_outbox_template 
  ON email_outbox (template);

CREATE INDEX IF NOT EXISTS idx_email_outbox_to_email 
  ON email_outbox (to_email);

CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at 
  ON email_outbox (created_at);

-- 3. Create function to enqueue emails
CREATE OR REPLACE FUNCTION fn_enqueue_email(
  p_template text,
  p_to_email text,
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  -- If idempotency key provided, try to upsert
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO email_outbox (
      template, 
      to_email, 
      payload, 
      idempotency_key,
      status,
      scheduled_at
    ) VALUES (
      p_template,
      p_to_email,
      p_payload,
      p_idempotency_key,
      'pending',
      now()
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_id;
    
    -- If no insert happened (conflict), get the existing id
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM email_outbox WHERE idempotency_key = p_idempotency_key;
    END IF;
  ELSE
    -- No idempotency key, just insert
    INSERT INTO email_outbox (
      template, 
      to_email, 
      payload, 
      status,
      scheduled_at
    ) VALUES (
      p_template,
      p_to_email,
      p_payload,
      'pending',
      now()
    )
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to get pending emails for dispatch
CREATE OR REPLACE FUNCTION fn_get_pending_emails(p_batch_size int DEFAULT 50)
RETURNS TABLE(
  id uuid,
  template text,
  to_email text,
  payload jsonb,
  idempotency_key text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eo.id,
    eo.template,
    eo.to_email,
    eo.payload,
    eo.idempotency_key
  FROM email_outbox eo
  WHERE eo.status = 'pending' 
    AND eo.scheduled_at <= now()
  ORDER BY eo.created_at ASC
  LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to mark email as sent
CREATE OR REPLACE FUNCTION fn_mark_email_sent(p_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE email_outbox 
  SET 
    status = 'sent',
    last_attempt_at = now(),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to mark email as error
CREATE OR REPLACE FUNCTION fn_mark_email_error(p_id uuid, p_error text)
RETURNS boolean AS $$
BEGIN
  UPDATE email_outbox 
  SET 
    status = 'error',
    error = p_error,
    last_attempt_at = now(),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to get outbox statistics
CREATE OR REPLACE FUNCTION fn_get_outbox_stats()
RETURNS TABLE(
  total_pending int,
  total_sent int,
  total_error int,
  oldest_pending timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::int as total_pending,
    COUNT(*) FILTER (WHERE status = 'sent')::int as total_sent,
    COUNT(*) FILTER (WHERE status = 'error')::int as total_error,
    MIN(created_at) FILTER (WHERE status = 'pending') as oldest_pending
  FROM email_outbox;
END;
$$ LANGUAGE plpgsql;

-- 8. Update the registration_sweep function to enqueue rejection emails
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

-- 9. Enable RLS on email_outbox table
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for email_outbox
-- Service role can read and write all records
CREATE POLICY "Service role can manage email outbox" ON email_outbox
  FOR ALL USING (auth.role() = 'service_role');

-- Admin role can read all records
CREATE POLICY "Admin can read email outbox" ON email_outbox
  FOR SELECT USING (auth.role() = 'authenticated');

-- Migration completed successfully
SELECT 'Email outbox migration completed successfully' as status;

