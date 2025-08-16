-- Phase 1 Migration: Status Model Update (Revised)
-- Implements new authoritative status model with explicit statuses, 3-track checklist, pricing, and event settings
-- Migration Date: 2025-01-27
-- Author: AI Assistant
-- Status: Revised for existing database with pending/waiting_for_review data

-- 1. Create event_settings table (singleton)
CREATE TABLE IF NOT EXISTS event_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_deadline_utc TIMESTAMPTZ NOT NULL,
  early_bird_deadline_utc TIMESTAMPTZ NOT NULL,
  price_packages JSONB NOT NULL,
  eligibility_rules JSONB,
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS ux_event_settings_singleton ON event_settings ((true));

-- 2. Add new columns to registrations table (handle existing data)
-- First, add columns without constraints to avoid conflicts with existing data
ALTER TABLE registrations
  -- Status model updates
  ADD COLUMN IF NOT EXISTS status_new TEXT,
  ADD COLUMN IF NOT EXISTS update_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT NULL,
  
  -- 3-track checklist fields
  ADD COLUMN IF NOT EXISTS payment_review_status TEXT,
  ADD COLUMN IF NOT EXISTS profile_review_status TEXT,
  ADD COLUMN IF NOT EXISTS tcc_review_status TEXT,
  
  -- Pricing fields
  ADD COLUMN IF NOT EXISTS price_applied NUMERIC(12,2) NULL,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS selected_package_code TEXT NULL;

-- 3. Migrate existing status data to new format
-- Map existing 'pending' to 'waiting_for_review' (new submissions)
UPDATE registrations 
SET 
  status_new = 'waiting_for_review',
  payment_review_status = 'pending',
  profile_review_status = 'pending',
  tcc_review_status = 'pending'
WHERE status = 'pending';

-- Map existing 'waiting_for_review' to 'waiting_for_review' (already correct)
UPDATE registrations 
SET 
  status_new = 'waiting_for_review',
  payment_review_status = 'pending',
  profile_review_status = 'pending',
  tcc_review_status = 'pending'
WHERE status = 'waiting_for_review';

-- 4. Set default values for any NULL review statuses
UPDATE registrations 
SET 
  payment_review_status = COALESCE(payment_review_status, 'pending'),
  profile_review_status = COALESCE(profile_review_status, 'pending'),
  tcc_review_status = COALESCE(tcc_review_status, 'pending')
WHERE payment_review_status IS NULL 
   OR profile_review_status IS NULL 
   OR tcc_review_status IS NULL;

-- 5. Now add NOT NULL constraints to review status columns
ALTER TABLE registrations 
  ALTER COLUMN payment_review_status SET NOT NULL,
  ALTER COLUMN profile_review_status SET NOT NULL,
  ALTER COLUMN tcc_review_status SET NOT NULL;

-- 6. Drop old status column and rename new one
ALTER TABLE registrations DROP COLUMN IF EXISTS status;
ALTER TABLE registrations RENAME COLUMN status_new TO status;

-- 7. Add constraint checks (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$ 
BEGIN
  -- Add status constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_status' AND table_name = 'registrations'
  ) THEN
    ALTER TABLE registrations 
    ADD CONSTRAINT chk_status
    CHECK (status IN ('waiting_for_review', 'waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc', 'approved', 'rejected'));
  END IF;

  -- Add update_reason constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_update_reason' AND table_name = 'registrations'
  ) THEN
    ALTER TABLE registrations 
    ADD CONSTRAINT chk_update_reason
    CHECK (update_reason IS NULL OR update_reason IN ('payment', 'info', 'tcc'));
  END IF;

  -- Add review_statuses constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_review_statuses' AND table_name = 'registrations'
  ) THEN
    ALTER TABLE registrations 
    ADD CONSTRAINT chk_review_statuses
    CHECK (
      payment_review_status IN ('pending', 'needs_update', 'passed', 'rejected') AND
      profile_review_status IN ('pending', 'needs_update', 'passed', 'rejected') AND
      tcc_review_status IN ('pending', 'needs_update', 'passed', 'rejected')
    );
  END IF;
END $$;

-- 8. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_update_reason ON registrations(update_reason) WHERE update_reason IS NOT NULL;

-- 9. Create function to update global status based on review statuses
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If all review statuses are 'passed', set status to 'approved'
  IF NEW.payment_review_status = 'passed' AND 
     NEW.profile_review_status = 'passed' AND 
     NEW.tcc_review_status = 'passed' THEN
    NEW.status := 'approved';
    NEW.update_reason := NULL;
  
  -- If any review status is 'rejected', set status to 'rejected'
  ELSIF NEW.payment_review_status = 'rejected' OR 
        NEW.profile_review_status = 'rejected' OR 
        NEW.tcc_review_status = 'rejected' THEN
    NEW.status := 'rejected';
    NEW.update_reason := NULL;
  
  -- If any review status is 'needs_update', set appropriate waiting status
  ELSIF NEW.payment_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_payment';
    NEW.update_reason := 'payment';
  ELSIF NEW.profile_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_info';
    NEW.update_reason := 'info';
  ELSIF NEW.tcc_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_tcc';
    NEW.update_reason := 'tcc';
  
  -- If all review statuses are 'pending', set status to 'waiting_for_review'
  ELSIF NEW.payment_review_status = 'pending' AND 
        NEW.profile_review_status = 'pending' AND 
        NEW.tcc_review_status = 'pending' THEN
    NEW.status := 'waiting_for_review';
    NEW.update_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to automatically update status
DROP TRIGGER IF EXISTS trigger_update_registration_status ON registrations;
CREATE TRIGGER trigger_update_registration_status
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_status();

-- 11. Insert default event settings
INSERT INTO event_settings (
  registration_deadline_utc,
  early_bird_deadline_utc,
  price_packages,
  eligibility_rules,
  timezone
) VALUES (
  (NOW() + INTERVAL '30 days')::timestamptz,
  (NOW() + INTERVAL '7 days')::timestamptz,
  '[
    {"code": "standard", "name": "Standard Package", "currency": "THB", "early_bird_amount": 1500, "regular_amount": 2000},
    {"code": "premium", "name": "Premium Package", "currency": "THB", "early_bird_amount": 2500, "regular_amount": 3000},
    {"code": "vip", "name": "VIP Package", "currency": "THB", "early_bird_amount": 3500, "regular_amount": 4000},
    {"code": "student", "name": "Student Package", "currency": "THB", "early_bird_amount": 800, "regular_amount": 1200}
  ]'::jsonb,
  '{"blocked_emails": [], "blocked_domains": [], "blocked_keywords": []}'::jsonb,
  'Asia/Bangkok'
) ON CONFLICT DO NOTHING;

-- 12. Create function for auto-reject sweep
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
    UPDATE registrations 
    SET 
      status = 'rejected',
      rejected_reason = 'deadline_missed',
      payment_review_status = 'rejected',
      profile_review_status = 'rejected',
      tcc_review_status = 'rejected',
      updated_at = NOW()
    WHERE id = reg.id;
    
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
      UPDATE registrations 
      SET 
        status = 'rejected',
        rejected_reason = 'ineligible_rule_match',
        payment_review_status = 'rejected',
        profile_review_status = 'rejected',
        tcc_review_status = 'rejected',
        updated_at = NOW()
      WHERE id = reg.id;
      
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
SELECT 'Phase 1 migration completed successfully' as status;
