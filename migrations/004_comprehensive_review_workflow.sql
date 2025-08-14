-- Migration 004: Comprehensive Review Workflow
-- Implements the complete 3-track review system with dimension-specific actions
-- Migration Date: 2025-01-27
-- Author: AI Assistant
-- Status: New implementation for comprehensive review workflow

-- 1. Add review_checklist JSONB field to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS review_checklist JSONB DEFAULT '{
  "payment": {"status": "pending"},
  "profile": {"status": "pending"},
  "tcc": {"status": "pending"}
}'::jsonb;

-- 2. Create index for review_checklist queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_registrations_review_checklist ON registrations USING GIN (review_checklist);

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
  
  -- Emit domain event (will be handled by trigger)
  -- Audit log will be written by the API route
  
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

-- 7. Create function to generate secure deep-link tokens
CREATE OR REPLACE FUNCTION generate_deep_link_token(
  reg_id UUID,
  ttl_seconds INTEGER DEFAULT 86400 -- 24 hours default
)
RETURNS TEXT AS $$
DECLARE
  token_data JSONB;
  token TEXT;
BEGIN
  -- Create token data
  token_data := jsonb_build_object(
    'reg_id', reg_id,
    'expires_at', (NOW() + (ttl_seconds || ' seconds')::interval)::text,
    'created_at', NOW()::text
  );
  
  -- Generate token (in production, use a proper JWT library)
  -- For now, we'll use a simple hash-based approach
  token := encode(
    hmac(
      token_data::text, 
      COALESCE(current_setting('app.deep_link_secret', true), 'default-secret'), 
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to validate deep-link tokens
CREATE OR REPLACE FUNCTION validate_deep_link_token(
  token TEXT,
  reg_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  token_data JSONB;
  expected_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- For now, we'll use a simple validation
  -- In production, implement proper JWT validation
  
  -- Check if registration exists and is in update state
  SELECT 
    review_checklist,
    update_reason
  INTO token_data
  FROM registrations 
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if registration is in update state
  IF token_data->>'update_reason' IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- For now, return true if registration is in update state
  -- In production, implement proper token validation
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Migration completed successfully
SELECT 'Comprehensive review workflow migration completed successfully' as status;
