-- Migration: Security and RLS Policies
-- Version: 5.0
-- Description: Set up Row Level Security (RLS) policies and security configurations
-- Date: 2025-01-27

-- 1. Enable Row Level Security on all tables
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_link_token_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for registrations table
-- Admin users can view all registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'registrations'
      AND policyname = 'Admin users can view all registrations'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can view all registrations" ON public.registrations FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Admin users can update registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'registrations'
      AND policyname = 'Admin users can update registrations'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can update registrations" ON public.registrations FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Users can insert their own registrations (for registration form)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'registrations'
      AND policyname = 'Users can insert registrations'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert registrations" ON public.registrations FOR INSERT WITH CHECK (true);';
  END IF;
END $$;

-- Service role can manage all registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'registrations'
      AND policyname = 'Service role can manage registrations'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage registrations" ON public.registrations FOR ALL USING (auth.role() = ''service_role'');';
  END IF;
END $$;

-- 3. Create RLS policies for event_settings table
-- Admin users can view event settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'event_settings'
      AND policyname = 'Admin users can view event settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can view event settings" ON public.event_settings FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Admin users can update event settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'event_settings'
      AND policyname = 'Admin users can update event settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can update event settings" ON public.event_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Admin users can insert event settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'event_settings'
      AND policyname = 'Admin users can insert event settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can insert event settings" ON public.event_settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Service role can manage event settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'event_settings'
      AND policyname = 'Service role can manage event settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage event settings" ON public.event_settings FOR ALL USING (auth.role() = ''service_role'');';
  END IF;
END $$;

-- 4. Create RLS policies for admin_users table
-- Admin users can view admin users (for admin management)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_users'
      AND policyname = 'Admin users can view admin users'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can view admin users" ON public.admin_users FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Super admins can manage admin users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_users'
      AND policyname = 'Super admins can manage admin users'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can manage admin users" ON public.admin_users FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND role = ''super_admin'' AND is_active = true));';
  END IF;
END $$;

-- Service role can manage admin users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_users'
      AND policyname = 'Service role can manage admin users'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage admin users" ON public.admin_users FOR ALL USING (auth.role() = ''service_role'');';
  END IF;
END $$;

-- 5. Create RLS policies for admin_audit_logs table
-- Admin users can view audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_audit_logs'
      AND policyname = 'Admin users can view audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can view audit logs" ON public.admin_audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Service role can insert audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_audit_logs'
      AND policyname = 'Service role can insert audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (auth.role() = ''service_role'');';
  END IF;
END $$;

-- 6. Create RLS policies for deep_link_tokens table
-- Admin users can view deep link tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'deep_link_tokens'
      AND policyname = 'Admin users can view deep link tokens'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can view deep link tokens" ON public.deep_link_tokens FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Service role can manage deep link tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'deep_link_tokens'
      AND policyname = 'Service role can manage deep link tokens'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage deep link tokens" ON public.deep_link_tokens FOR ALL USING (auth.role() = ''service_role'');';
  END IF;
END $$;

-- 7. Create RLS policies for deep_link_token_audit table
-- Admin users can view deep link token audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'deep_link_token_audit'
      AND policyname = 'Admin users can view deep link token audit'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can view deep link token audit" ON public.deep_link_token_audit FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- Service role can insert deep link token audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'deep_link_token_audit'
      AND policyname = 'Service role can insert deep link token audit'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert deep link token audit" ON public.deep_link_token_audit FOR INSERT WITH CHECK (auth.role() = ''service_role'');';
  END IF;
END $$;

-- 8. Create RLS policies for email_outbox table
-- Service role can manage email outbox
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'email_outbox'
      AND policyname = 'Service role can manage email outbox'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage email outbox" ON public.email_outbox FOR ALL USING (auth.role() = ''service_role'');';
  END IF;
END $$;

-- Admin users can view email outbox
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'email_outbox'
      AND policyname = 'Admin users can view email outbox'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin users can view email outbox" ON public.email_outbox FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = current_setting(''request.jwt.claims'', true)::json->>''email'' AND is_active = true));';
  END IF;
END $$;

-- 9. Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON registrations TO authenticated;
GRANT INSERT ON registrations TO authenticated;
GRANT SELECT ON event_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_packages() TO authenticated;
GRANT EXECUTE ON FUNCTION is_registration_open() TO authenticated;
GRANT SELECT ON admin_registrations_view TO authenticated;

-- 10. Grant necessary permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON registrations TO service_role;
GRANT ALL ON event_settings TO service_role;
GRANT ALL ON admin_users TO service_role;
GRANT ALL ON admin_audit_logs TO service_role;
GRANT ALL ON deep_link_tokens TO service_role;
GRANT ALL ON deep_link_token_audit TO service_role;
GRANT ALL ON email_outbox TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT SELECT ON admin_registrations_view TO service_role;

-- 11. Create function to update registration review status (for admin actions)
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

-- 12. Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_param TEXT,
  registration_id_param TEXT,
  before_data JSONB DEFAULT NULL,
  after_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  admin_email TEXT;
  audit_id UUID;
BEGIN
  -- Get admin email from JWT claims
  admin_email := current_setting('request.jwt.claims', true)::json->>'email';
  
  -- Insert audit log
  INSERT INTO admin_audit_logs (
    admin_email,
    action,
    registration_id,
    before,
    after
  ) VALUES (
    admin_email,
    action_param,
    registration_id_param,
    before_data,
    after_data
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, TEXT, JSONB, JSONB) TO service_role;

-- 13. Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO service_role;

-- 14. Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO service_role;

-- 15. Create function to get current admin user info
CREATE OR REPLACE FUNCTION get_current_admin_user()
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  last_login_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.role,
    au.is_active,
    au.last_login_at
  FROM admin_users au
  WHERE au.email = current_setting('request.jwt.claims', true)::json->>'email'
  AND au.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_admin_user() TO service_role;

-- 16. Create function to update admin user last login
CREATE OR REPLACE FUNCTION update_admin_last_login(admin_email_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE admin_users 
  SET last_login_at = NOW()
  WHERE email = admin_email_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_admin_last_login(TEXT) TO service_role;

-- Migration completed successfully
SELECT 'Security and RLS policies migration completed successfully' as status;
