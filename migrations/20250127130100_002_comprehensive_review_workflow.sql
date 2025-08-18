-- Migration: Comprehensive Review Workflow
-- Version: 2.0
-- Description: Implements the complete 3-track review system with domain functions and triggers
-- Date: 2025-01-27

-- 1. Create function to update global status based on review statuses
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

-- 2. Create trigger to automatically update status
DROP TRIGGER IF EXISTS trigger_update_registration_status ON registrations;
CREATE TRIGGER trigger_update_registration_status
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_status();

-- 3. Create domain function for requesting updates
CREATE OR REPLACE FUNCTION fn_request_update(
  reg_id UUID,
  dimension TEXT,
  reviewer_id TEXT,
  notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_status TEXT
) AS $$
DECLARE
  current_reg RECORD;
  new_checklist JSONB;
  new_status TEXT;
BEGIN
  -- Get current registration
  SELECT * INTO current_reg 
  FROM registrations 
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Registration not found', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Validate dimension
  IF dimension NOT IN ('payment', 'profile', 'tcc') THEN
    RETURN QUERY SELECT FALSE, 'Invalid dimension', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Update review checklist
  new_checklist = current_reg.review_checklist;
  new_checklist = jsonb_set(
    new_checklist, 
    ARRAY[dimension, 'status'], 
    '"needs_update"'::jsonb
  );
  
  -- Set notes if provided
  IF notes IS NOT NULL THEN
    new_checklist = jsonb_set(
      new_checklist, 
      ARRAY[dimension, 'notes'], 
      to_jsonb(notes)
    );
  END IF;
  
  -- Determine new status based on dimension
  CASE dimension
    WHEN 'payment' THEN new_status := 'waiting_for_update_payment';
    WHEN 'profile' THEN new_status := 'waiting_for_update_info';
    WHEN 'tcc' THEN new_status := 'waiting_for_update_tcc';
  END CASE;
  
  -- Update registration
  UPDATE registrations 
  SET 
    review_checklist = new_checklist,
    status = new_status,
    update_reason = dimension,
    updated_at = NOW()
  WHERE id = reg_id;
  
  RETURN QUERY SELECT TRUE, 'Update requested successfully', new_status;
END;
$$ LANGUAGE plpgsql;

-- 4. Create domain function for user resubmission
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
  
  CASE update_reason
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
    ARRAY[update_reason, 'status'], 
    '"pending"'::jsonb
  );
  
  -- Remove notes for the updated dimension
  new_checklist = new_checklist - ARRAY[update_reason, 'notes'];
  
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

-- 5. Create domain function for auto-approval
CREATE OR REPLACE FUNCTION fn_try_approve(reg_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_status TEXT
) AS $$
DECLARE
  current_reg RECORD;
  all_passed BOOLEAN;
BEGIN
  -- Get current registration
  SELECT * INTO current_reg 
  FROM registrations 
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Registration not found', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if all dimensions are passed
  all_passed := (
    current_reg.review_checklist->'payment'->>'status' = 'passed' AND
    current_reg.review_checklist->'profile'->>'status' = 'passed' AND
    current_reg.review_checklist->'tcc'->>'status' = 'passed'
  );
  
  IF NOT all_passed THEN
    RETURN QUERY SELECT FALSE, 'Not all dimensions are passed', current_reg.status;
    RETURN;
  END IF;
  
  -- Update to approved
  UPDATE registrations 
  SET 
    status = 'approved',
    update_reason = NULL,
    updated_at = NOW()
  WHERE id = reg_id;
  
  RETURN QUERY SELECT TRUE, 'Registration approved', 'approved';
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to call fn_try_approve on checklist updates
CREATE OR REPLACE FUNCTION trigger_try_approve_on_checklist_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only try to approve if status is not already approved or rejected
  IF NEW.status NOT IN ('approved', 'rejected') THEN
    -- Check if all dimensions are passed
    IF (NEW.review_checklist->'payment'->>'status' = 'passed' AND
        NEW.review_checklist->'profile'->>'status' = 'passed' AND
        NEW.review_checklist->'tcc'->>'status' = 'passed') THEN
      
      -- Auto-approve
      NEW.status := 'approved';
      NEW.update_reason := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_try_approve_on_checklist_update ON registrations;
CREATE TRIGGER trigger_try_approve_on_checklist_update
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_try_approve_on_checklist_update();

-- 7. Create function for auto-reject sweep
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

-- 8. Create helper functions for admin dashboard
CREATE OR REPLACE FUNCTION get_registration_statistics()
RETURNS TABLE(
  total_count BIGINT,
  waiting_for_review_count BIGINT,
  waiting_for_update_payment_count BIGINT,
  waiting_for_update_info_count BIGINT,
  waiting_for_update_tcc_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_review') as waiting_for_review_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_payment') as waiting_for_update_payment_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_info') as waiting_for_update_info_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_tcc') as waiting_for_update_tcc_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
  FROM registrations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get price package information
CREATE OR REPLACE FUNCTION get_price_packages()
RETURNS TABLE(
  code TEXT,
  name TEXT,
  currency TEXT,
  early_bird_amount NUMERIC,
  regular_amount NUMERIC,
  is_early_bird BOOLEAN
) AS $$
DECLARE
  event_setting RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event settings not found';
  END IF;
  
  -- Return price packages with early bird status
  RETURN QUERY
  SELECT 
    (package->>'code')::TEXT as code,
    (package->>'name')::TEXT as name,
    (package->>'currency')::TEXT as currency,
    (package->>'early_bird_amount')::NUMERIC as early_bird_amount,
    (package->>'regular_amount')::NUMERIC as regular_amount,
    (NOW() <= event_setting.early_bird_deadline_utc) as is_early_bird
  FROM jsonb_array_elements(event_setting.price_packages) as package;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to check if registration is still open
CREATE OR REPLACE FUNCTION is_registration_open()
RETURNS BOOLEAN AS $$
DECLARE
  event_setting RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current time is before registration deadline
  RETURN NOW() <= event_setting.registration_deadline_utc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create admin dashboard view
CREATE OR REPLACE VIEW admin_registrations_view AS
SELECT 
  id,
  registration_id,
  title,
  first_name,
  last_name,
  email,
  company_name,
  yec_province,
  status,
  update_reason,
  payment_review_status,
  profile_review_status,
  tcc_review_status,
  price_applied,
  currency,
  selected_package_code,
  created_at,
  updated_at
FROM registrations
ORDER BY created_at DESC;

-- Migration completed successfully
SELECT 'Comprehensive review workflow migration completed successfully' as status;
