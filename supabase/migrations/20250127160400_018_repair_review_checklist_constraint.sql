-- Migration: Repair review_checklist constraint and validate
-- Version: 18.0
-- Description: Repair legacy review_checklist data and validate the NOT VALID constraint
-- Date: 2025-01-27

-- 1. Repair legacy review_checklist data (idempotent)
DO $$
DECLARE
  v_updated_count INTEGER;
  v_invalid_count INTEGER;
BEGIN
  -- Count invalid rows before repair
  SELECT COUNT(*) INTO v_invalid_count
  FROM public.registrations r
  WHERE r.review_checklist IS NULL
     OR NOT validate_review_checklist(r.review_checklist);
  
  RAISE NOTICE 'Invalid review_checklist rows before repair: %', v_invalid_count;
  
  -- Repair NULL review_checklist rows
  UPDATE public.registrations
  SET review_checklist = '{
    "payment": {"status": "pending", "notes": ""},
    "profile": {"status": "pending", "notes": ""},
    "tcc": {"status": "pending", "notes": ""}
  }'::jsonb
  WHERE review_checklist IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Repaired NULL review_checklist rows: %', v_updated_count;
  
  -- Repair incomplete review_checklist structures
  UPDATE public.registrations
  SET review_checklist = jsonb_build_object(
    'payment', COALESCE(
      review_checklist->'payment',
      '{"status": "pending", "notes": ""}'::jsonb
    ),
    'profile', COALESCE(
      review_checklist->'profile',
      '{"status": "pending", "notes": ""}'::jsonb
    ),
    'tcc', COALESCE(
      review_checklist->'tcc',
      '{"status": "pending", "notes": ""}'::jsonb
    )
  )
  WHERE review_checklist IS NOT NULL
    AND (
      NOT (review_checklist ? 'payment' AND review_checklist ? 'profile' AND review_checklist ? 'tcc')
      OR NOT (
        review_checklist->'payment' ? 'status' AND
        review_checklist->'profile' ? 'status' AND
        review_checklist->'tcc' ? 'status'
      )
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Repaired incomplete review_checklist structures: %', v_updated_count;
  
  -- Normalize status values to valid enum values
  UPDATE public.registrations
  SET review_checklist = jsonb_build_object(
    'payment', jsonb_build_object(
      'status', CASE 
        WHEN review_checklist->'payment'->>'status' IN ('pending', 'needs_update', 'passed') 
        THEN review_checklist->'payment'->>'status'
        ELSE 'pending'
      END,
      'notes', COALESCE(review_checklist->'payment'->>'notes', '')
    ),
    'profile', jsonb_build_object(
      'status', CASE 
        WHEN review_checklist->'profile'->>'status' IN ('pending', 'needs_update', 'passed') 
        THEN review_checklist->'profile'->>'status'
        ELSE 'pending'
      END,
      'notes', COALESCE(review_checklist->'profile'->>'notes', '')
    ),
    'tcc', jsonb_build_object(
      'status', CASE 
        WHEN review_checklist->'tcc'->>'status' IN ('pending', 'needs_update', 'passed') 
        THEN review_checklist->'tcc'->>'status'
        ELSE 'pending'
      END,
      'notes', COALESCE(review_checklist->'tcc'->>'notes', '')
    )
  )
  WHERE review_checklist IS NOT NULL
    AND (
      NOT (review_checklist->'payment'->>'status' IN ('pending', 'needs_update', 'passed'))
      OR NOT (review_checklist->'profile'->>'status' IN ('pending', 'needs_update', 'passed'))
      OR NOT (review_checklist->'tcc'->>'status' IN ('pending', 'needs_update', 'passed'))
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Normalized invalid status values: %', v_updated_count;
  
  -- Count invalid rows after repair
  SELECT COUNT(*) INTO v_invalid_count
  FROM public.registrations r
  WHERE r.review_checklist IS NULL
     OR NOT validate_review_checklist(r.review_checklist);
  
  RAISE NOTICE 'Invalid review_checklist rows after repair: %', v_invalid_count;
END$$;

-- 2. Validate the constraint if it exists
DO $$
BEGIN
  -- Then validate if the constraint exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='registrations'
      AND constraint_name='check_review_checklist_structure'
      AND constraint_type='CHECK'
  ) THEN
    RAISE NOTICE 'Validating check_review_checklist_structure constraint...';
    ALTER TABLE public.registrations
      VALIDATE CONSTRAINT check_review_checklist_structure;
    RAISE NOTICE 'Constraint validation completed successfully';
  ELSE
    RAISE NOTICE 'check_review_checklist_structure constraint not found, skipping validation';
  END IF;
END$$;

-- Migration completed successfully
SELECT 'Review checklist constraint repair and validation completed successfully' as status;
