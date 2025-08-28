-- Migration: Fix update_reason mismatch between trigger and domain function
-- Date: 2025-01-27
-- Purpose: Normalize update_reason values and patch domain function to handle legacy values

-- 1. Data normalization: Update existing rows with 'info' to 'profile' where appropriate
-- This is idempotent and safe to re-run
UPDATE public.registrations r
SET update_reason = 'profile'
WHERE update_reason = 'info'
  AND coalesce(r.profile_review_status,'pending') = 'needs_update';

-- Also update any remaining 'info' values to 'profile' to ensure constraint compliance
UPDATE public.registrations r
SET update_reason = 'profile'
WHERE update_reason = 'info';

-- Handle any other unexpected values by setting them to NULL
UPDATE public.registrations r
SET update_reason = NULL
WHERE update_reason NOT IN ('payment', 'profile', 'tcc', 'info') AND update_reason IS NOT NULL;

-- 2. Fix the trigger function to use 'profile' instead of 'info' for profile updates
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If any review status is 'rejected', set status to 'rejected'
  IF NEW.payment_review_status = 'rejected' OR 
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
    NEW.update_reason := 'profile';  -- Changed from 'info' to 'profile'
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

-- 3. Patch the domain function to tolerate legacy 'info' values
CREATE OR REPLACE FUNCTION fn_user_resubmit(
  reg_id UUID,
  payload JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_status TEXT
) AS $$
DECLARE
  current_reg RECORD;
  new_checklist JSONB;
  update_reason TEXT;
  update_reason_norm TEXT;  -- Normalized update reason
  allowed_fields JSONB;
  field_updates JSONB := '{}'::jsonb;
  field_key TEXT;
  field_value JSONB;
BEGIN
  -- Get current registration
  SELECT * INTO current_reg 
  FROM registrations 
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Registration not found', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Validate registration is in update state
  IF current_reg.status NOT IN ('waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc') THEN
    RETURN QUERY SELECT FALSE, 'Registration not in update state', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Determine which fields are allowed based on update reason
  update_reason := current_reg.update_reason;
  
  -- Normalize legacy 'info' values to 'profile'
  update_reason_norm := CASE WHEN update_reason = 'info' THEN 'profile' ELSE update_reason END;
  
  CASE update_reason_norm
    WHEN 'payment' THEN
      allowed_fields := '["payment_slip_url"]'::jsonb;
    WHEN 'profile' THEN
      allowed_fields := '["first_name", "last_name", "nickname", "phone", "line_id", "email", "company_name", "business_type", "business_type_other", "yec_province", "profile_image_url"]'::jsonb;
    WHEN 'tcc' THEN
      allowed_fields := '["chamber_card_url"]'::jsonb;
    ELSE
      RETURN QUERY SELECT FALSE, 'Invalid update reason', NULL::TEXT;
      RETURN;
  END CASE;
  
  -- Build field updates from payload
  FOR field_key, field_value IN SELECT * FROM jsonb_each(payload)
  LOOP
    IF allowed_fields ? field_key THEN
      field_updates = field_updates || jsonb_build_object(field_key, field_value);
    END IF;
  END LOOP;
  
  -- Update review checklist - reset the updated dimension to pending
  new_checklist = current_reg.review_checklist;
  new_checklist = jsonb_set(
    new_checklist, 
    ARRAY[update_reason_norm, 'status'], 
    '"pending"'::jsonb
  );
  
  -- Remove notes for the updated dimension
  new_checklist = new_checklist - ARRAY[update_reason_norm, 'notes'];
  
  -- Update registration
  UPDATE registrations 
  SET 
    review_checklist = new_checklist,
    status = 'waiting_for_review',
    update_reason = NULL,
    updated_at = NOW()
  WHERE id = reg_id;
  
  -- Apply field updates if any
  IF jsonb_typeof(field_updates) = 'object' AND field_updates != '{}'::jsonb THEN
    -- This would need to be handled by the API route since we can't dynamically update columns
    -- For now, we'll just update the form_data field
    UPDATE registrations 
    SET 
      form_data = form_data || field_updates,
      updated_at = NOW()
    WHERE id = reg_id;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Resubmission successful', 'waiting_for_review';
END;
$$ LANGUAGE plpgsql;

-- 4. Update the constraint to allow 'profile' instead of 'info'
-- First drop the existing constraint to allow data updates
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS chk_update_reason;

-- Now update any remaining 'info' values to 'profile'
UPDATE public.registrations r
SET update_reason = 'profile'
WHERE update_reason = 'info';

-- Handle any other unexpected values by setting them to NULL
UPDATE public.registrations r
SET update_reason = NULL
WHERE update_reason NOT IN ('payment', 'profile', 'tcc') AND update_reason IS NOT NULL;

-- Now add the new constraint
ALTER TABLE registrations ADD CONSTRAINT chk_update_reason 
  CHECK ((update_reason IS NULL) OR (update_reason = ANY (ARRAY['payment'::text, 'profile'::text, 'tcc'::text])));
