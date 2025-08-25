-- Migration: Add review_checklist JSONB column
-- Version: 14.0
-- Description: Adds review_checklist JSONB column for 3-track review system
-- Date: 2025-01-27

-- 1. Add review_checklist JSONB column to registrations table
ALTER TABLE registrations 
ADD COLUMN review_checklist JSONB DEFAULT '{
  "payment": {"status": "pending", "notes": ""},
  "profile": {"status": "pending", "notes": ""},
  "tcc": {"status": "pending", "notes": ""}
}'::jsonb;

-- 2. Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_registrations_review_checklist 
ON registrations USING GIN (review_checklist);

-- 3. Backfill existing registrations with default checklist
UPDATE registrations 
SET review_checklist = '{
  "payment": {"status": "pending", "notes": ""},
  "profile": {"status": "pending", "notes": ""},
  "tcc": {"status": "pending", "notes": ""}
}'::jsonb
WHERE review_checklist IS NULL;

-- 4. Add NOT NULL constraint after backfill
ALTER TABLE registrations 
ALTER COLUMN review_checklist SET NOT NULL;

-- 5. Create function to validate review_checklist structure
CREATE OR REPLACE FUNCTION validate_review_checklist(checklist JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if all required dimensions exist
  IF NOT (checklist ? 'payment' AND checklist ? 'profile' AND checklist ? 'tcc') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if each dimension has required fields
  IF NOT (
    checklist->'payment' ? 'status' AND
    checklist->'profile' ? 'status' AND
    checklist->'tcc' ? 'status'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check if status values are valid
  IF NOT (
    checklist->'payment'->>'status' IN ('pending', 'needs_update', 'passed') AND
    checklist->'profile'->>'status' IN ('pending', 'needs_update', 'passed') AND
    checklist->'tcc'->>'status' IN ('pending', 'needs_update', 'passed')
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Add check constraint to ensure valid checklist structure
ALTER TABLE registrations 
ADD CONSTRAINT check_review_checklist_structure 
CHECK (validate_review_checklist(review_checklist));

-- 7. Create function to get checklist status summary
CREATE OR REPLACE FUNCTION get_checklist_summary(reg_id UUID)
RETURNS TABLE(
  payment_status TEXT,
  profile_status TEXT,
  tcc_status TEXT,
  all_passed BOOLEAN,
  any_needs_update BOOLEAN
) AS $$
DECLARE
  checklist JSONB;
BEGIN
  SELECT review_checklist INTO checklist
  FROM registrations
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  RETURN QUERY SELECT
    checklist->'payment'->>'status' as payment_status,
    checklist->'profile'->>'status' as profile_status,
    checklist->'tcc'->>'status' as tcc_status,
    (checklist->'payment'->>'status' = 'passed' AND
     checklist->'profile'->>'status' = 'passed' AND
     checklist->'tcc'->>'status' = 'passed') as all_passed,
    (checklist->'payment'->>'status' = 'needs_update' OR
     checklist->'profile'->>'status' = 'needs_update' OR
     checklist->'tcc'->>'status' = 'needs_update') as any_needs_update;
END;
$$ LANGUAGE plpgsql;

-- Migration completed successfully
SELECT 'Review checklist JSONB migration completed successfully' as status;
