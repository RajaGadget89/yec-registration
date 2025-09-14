-- Migration: Fix update_reason trigger to preserve notes
-- Date: 2025-01-27
-- Purpose: Modify the trigger to preserve update_reason if it's already set (contains notes)

-- Fix the trigger function to preserve update_reason if it's already set
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
    -- Only set update_reason to 'payment' if it's not already set (preserve notes)
    IF NEW.update_reason IS NULL OR NEW.update_reason = 'payment' THEN
      NEW.update_reason := 'payment';
    END IF;
  ELSIF NEW.profile_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_info';
    -- Only set update_reason to 'profile' if it's not already set (preserve notes)
    IF NEW.update_reason IS NULL OR NEW.update_reason = 'profile' THEN
      NEW.update_reason := 'profile';
    END IF;
  ELSIF NEW.tcc_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_tcc';
    -- Only set update_reason to 'tcc' if it's not already set (preserve notes)
    IF NEW.update_reason IS NULL OR NEW.update_reason = 'tcc' THEN
      NEW.update_reason := 'tcc';
    END IF;
  
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

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Fixed update_registration_status trigger to preserve update_reason notes';
END $$;
