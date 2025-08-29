-- Migration: Fix fn_user_resubmit to sync with trigger system
-- Date: 2025-08-28
-- Purpose: Fix fn_user_resubmit to update individual review_status columns for trigger compatibility

-- Fix the fn_user_resubmit function to properly sync with the trigger system
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
  profile_review_status TEXT;
  payment_review_status TEXT;
  tcc_review_status TEXT;
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
  
  -- Determine new review statuses based on checklist
  profile_review_status := COALESCE(new_checklist->'profile'->>'status', 'pending');
  payment_review_status := COALESCE(new_checklist->'payment'->>'status', 'pending');
  tcc_review_status := COALESCE(new_checklist->'tcc'->>'status', 'pending');
  
  -- Update registration with both checklist and individual status columns
  UPDATE registrations 
  SET 
    review_checklist = new_checklist,
    profile_review_status = profile_review_status,
    payment_review_status = payment_review_status,
    tcc_review_status = tcc_review_status,
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

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Fixed fn_user_resubmit function to sync with trigger system';
END $$;

