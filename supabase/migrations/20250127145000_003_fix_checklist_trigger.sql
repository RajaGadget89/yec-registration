-- Migration: Fix checklist trigger to handle needs_update statuses
-- Version: 3.0
-- Description: Updates the trigger to properly handle needs_update statuses from review_checklist
-- Date: 2025-01-27

-- Update the trigger function to handle needs_update statuses
CREATE OR REPLACE FUNCTION trigger_try_approve_on_checklist_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all dimensions are passed (auto-approve)
  IF (NEW.review_checklist->'payment'->>'status' = 'passed' AND
      NEW.review_checklist->'profile'->>'status' = 'passed' AND
      NEW.review_checklist->'tcc'->>'status' = 'passed') THEN
    
    -- Auto-approve
    NEW.status := 'approved';
    NEW.update_reason := NULL;
  
  -- Check if any dimension needs update
  ELSIF NEW.review_checklist->'payment'->>'status' = 'needs_update' THEN
    NEW.status := 'waiting_for_update_payment';
    NEW.update_reason := 'payment';
  ELSIF NEW.review_checklist->'profile'->>'status' = 'needs_update' THEN
    NEW.status := 'waiting_for_update_info';
    NEW.update_reason := 'info';
  ELSIF NEW.review_checklist->'tcc'->>'status' = 'needs_update' THEN
    NEW.status := 'waiting_for_update_tcc';
    NEW.update_reason := 'tcc';
  
  -- Check if any dimension is rejected
  ELSIF NEW.review_checklist->'payment'->>'status' = 'rejected' OR
        NEW.review_checklist->'profile'->>'status' = 'rejected' OR
        NEW.review_checklist->'tcc'->>'status' = 'rejected' THEN
    NEW.status := 'rejected';
    NEW.update_reason := NULL;
  
  -- If all dimensions are pending, set to waiting for review
  ELSIF NEW.review_checklist->'payment'->>'status' = 'pending' AND
        NEW.review_checklist->'profile'->>'status' = 'pending' AND
        NEW.review_checklist->'tcc'->>'status' = 'pending' THEN
    NEW.status := 'waiting_for_review';
    NEW.update_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
