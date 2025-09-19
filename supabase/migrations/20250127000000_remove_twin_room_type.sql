-- Remove 'twin' from room_type constraint
-- This migration removes the 'twin' option from the room_type check constraint

-- First, drop the existing constraint
ALTER TABLE "public"."registrations" DROP CONSTRAINT IF EXISTS "chk_room_type";

-- Add the updated constraint without 'twin'
ALTER TABLE "public"."registrations" 
ADD CONSTRAINT "chk_room_type" 
CHECK (((room_type)::text = ANY ((ARRAY['single'::character varying, 'double'::character varying])::text[]))) 
NOT VALID;

-- Validate the constraint
ALTER TABLE "public"."registrations" VALIDATE CONSTRAINT "chk_room_type";
