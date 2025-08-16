-- Fix timezone for updated_at trigger to use Thailand timezone (GMT+7)
-- This script updates the trigger function to use Thailand timezone instead of UTC

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;

-- Drop the existing function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create new function that uses Thailand timezone
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Use Thailand timezone (GMT+7) instead of UTC
    NEW.updated_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::timestamptz;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER update_registrations_updated_at 
    BEFORE UPDATE ON registrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the function works correctly
SELECT 
    'UTC time: ' || NOW()::text as utc_time,
    'Thailand time: ' || (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::text as thailand_time; 