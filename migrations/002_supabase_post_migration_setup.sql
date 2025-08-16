-- Supabase Post-Migration Setup Script
-- Additional configurations needed after Phase 1 migration
-- Run this after the main migration script completes successfully
-- Migration Date: 2025-01-27
-- Author: AI Assistant

-- 1. Enable Row Level Security (RLS) on event_settings table
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for event_settings (admin only access)
CREATE POLICY "Admin users can view event settings" ON event_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Admin users can update event settings" ON event_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Admin users can insert event settings" ON event_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- 3. Add RLS policies for registrations table (if not already enabled)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for registrations table
-- Admin users can view all registrations
CREATE POLICY "Admin users can view all registrations" ON registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Admin users can update registrations
CREATE POLICY "Admin users can update registrations" ON registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Users can insert their own registrations (for registration form)
CREATE POLICY "Users can insert registrations" ON registrations
  FOR INSERT WITH CHECK (true);

-- 5. Create indexes for better query performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_company_name ON registrations(company_name);
CREATE INDEX IF NOT EXISTS idx_registrations_yec_province ON registrations(yec_province);
CREATE INDEX IF NOT EXISTS idx_registrations_business_type ON registrations(business_type);

-- 6. Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_registrations_status_created_at ON registrations(status, created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_status_province ON registrations(status, yec_province);

-- 7. Create function to get registration statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_registration_statistics()
RETURNS TABLE(
  total_count BIGINT,
  waiting_for_review_count BIGINT,
  waiting_for_update_payment_count BIGINT,
  waiting_for_update_info_count BIGINT,
  waiting_for_update_tcc_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_review') as waiting_for_review_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_payment') as waiting_for_update_payment_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_info') as waiting_for_update_info_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_tcc') as waiting_for_update_tcc_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
  FROM registrations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get price package information
CREATE OR REPLACE FUNCTION get_price_packages()
RETURNS TABLE(
  code TEXT,
  name TEXT,
  currency TEXT,
  early_bird_amount NUMERIC,
  regular_amount NUMERIC,
  is_early_bird BOOLEAN
) AS $$
DECLARE
  event_setting RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event settings not found';
  END IF;
  
  -- Return price packages with early bird status
  RETURN QUERY
  SELECT 
    (package->>'code')::TEXT as code,
    (package->>'name')::TEXT as name,
    (package->>'currency')::TEXT as currency,
    (package->>'early_bird_amount')::NUMERIC as early_bird_amount,
    (package->>'regular_amount')::NUMERIC as regular_amount,
    (NOW() <= event_setting.early_bird_deadline_utc) as is_early_bird
  FROM jsonb_array_elements(event_setting.price_packages) as package;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to check if registration is still open
CREATE OR REPLACE FUNCTION is_registration_open()
RETURNS BOOLEAN AS $$
DECLARE
  event_setting RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current time is before registration deadline
  RETURN NOW() <= event_setting.registration_deadline_utc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON registrations TO authenticated;
GRANT INSERT ON registrations TO authenticated;
GRANT SELECT ON event_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_packages() TO authenticated;
GRANT EXECUTE ON FUNCTION is_registration_open() TO authenticated;

-- 11. Grant necessary permissions to service role (for API access)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON registrations TO service_role;
GRANT ALL ON event_settings TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 12. Create a view for admin dashboard (simplified registration data)
CREATE OR REPLACE VIEW admin_registrations_view AS
SELECT 
  id,
  registration_id,
  title,
  first_name,
  last_name,
  email,
  company_name,
  yec_province,
  status,
  update_reason,
  payment_review_status,
  profile_review_status,
  tcc_review_status,
  price_applied,
  currency,
  selected_package_code,
  created_at,
  updated_at
FROM registrations
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON admin_registrations_view TO authenticated;
GRANT SELECT ON admin_registrations_view TO service_role;

-- 13. Create function to update registration review status (for admin actions)
CREATE OR REPLACE FUNCTION update_registration_review_status(
  registration_id_param TEXT,
  track_param TEXT,
  status_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  registration_record RECORD;
BEGIN
  -- Get the registration
  SELECT * INTO registration_record 
  FROM registrations 
  WHERE registration_id = registration_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update the appropriate track status
  CASE track_param
    WHEN 'payment' THEN
      UPDATE registrations 
      SET payment_review_status = status_param::TEXT,
          updated_at = NOW()
      WHERE registration_id = registration_id_param;
    WHEN 'profile' THEN
      UPDATE registrations 
      SET profile_review_status = status_param::TEXT,
          updated_at = NOW()
      WHERE registration_id = registration_id_param;
    WHEN 'tcc' THEN
      UPDATE registrations 
      SET tcc_review_status = status_param::TEXT,
          updated_at = NOW()
      WHERE registration_id = registration_id_param;
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_registration_review_status(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_registration_review_status(TEXT, TEXT, TEXT) TO service_role;

-- 14. Verify the setup
DO $$
BEGIN
  -- Check if event_settings table has data
  IF NOT EXISTS (SELECT 1 FROM event_settings LIMIT 1) THEN
    RAISE WARNING 'Event settings table is empty. Please insert default settings.';
  END IF;
  
  -- Check if registrations table has the new columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registrations' 
    AND column_name = 'payment_review_status'
  ) THEN
    RAISE EXCEPTION 'Phase 1 migration columns not found. Please run the main migration script first.';
  END IF;
  
  RAISE NOTICE 'Supabase post-migration setup completed successfully!';
END $$;

-- Setup completed successfully
SELECT 'Supabase post-migration setup completed successfully' as status;

