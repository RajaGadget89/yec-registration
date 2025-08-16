-- Fix timezone for updated_at trigger to use Thailand timezone (GMT+7) - Version 2
-- This version properly handles timezone conversion

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;

-- Drop the existing function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create new function that properly uses Thailand timezone
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Use Thailand timezone (GMT+7) - this will store with +07:00 offset
    NEW.updated_at = NOW() AT TIME ZONE 'Asia/Bangkok';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER update_registrations_updated_at 
    BEFORE UPDATE ON registrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Test the function with proper timezone display
SELECT 
    'Current UTC time: ' || NOW()::text as utc_time,
    'Current Thailand time: ' || (NOW() AT TIME ZONE 'Asia/Bangkok')::text as thailand_time,
    'Current time in Bangkok: ' || NOW() AT TIME ZONE 'Asia/Bangkok' as bangkok_time; 