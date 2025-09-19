-- ========================================
-- Remove 'twin' from room_type constraint
-- Complete SQL Script for Supabase SQL Editor
-- ========================================

-- Step 1: Check current constraint (optional - for verification)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'chk_room_type' 
AND conrelid = 'public.registrations'::regclass;

-- Step 2: Check if there are any existing registrations with 'twin' room type
SELECT 
    id,
    registration_id,
    first_name,
    last_name,
    room_type,
    created_at
FROM public.registrations 
WHERE room_type = 'twin'
ORDER BY created_at DESC;

-- Step 3: Update any existing 'twin' room types to 'double' (if any exist)
-- This ensures no data conflicts when we remove the constraint
UPDATE public.registrations 
SET room_type = 'double'
WHERE room_type = 'twin';

-- Step 4: Drop the existing constraint
ALTER TABLE public.registrations 
DROP CONSTRAINT IF EXISTS chk_room_type;

-- Step 5: Add the updated constraint without 'twin'
ALTER TABLE public.registrations 
ADD CONSTRAINT chk_room_type 
CHECK (
    (room_type)::text = ANY (
        ARRAY[
            'single'::character varying, 
            'double'::character varying
        ]::text[]
    )
) NOT VALID;

-- Step 6: Validate the constraint
ALTER TABLE public.registrations 
VALIDATE CONSTRAINT chk_room_type;

-- Step 7: Verify the constraint is working (optional - for verification)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'chk_room_type' 
AND conrelid = 'public.registrations'::regclass;

-- Step 8: Final verification - check that no 'twin' room types remain
SELECT 
    COUNT(*) as twin_room_count
FROM public.registrations 
WHERE room_type = 'twin';

-- Expected result: twin_room_count should be 0

-- ========================================
-- SCRIPT COMPLETED
-- ========================================
-- The room_type constraint now only allows 'single' and 'double'
-- Any existing 'twin' room types have been converted to 'double'
-- ========================================
