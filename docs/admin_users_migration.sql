-- Migration: Create admin_users table for Supabase Auth integration
-- Run this in your Supabase SQL editor

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only authenticated users can read their own admin record
CREATE POLICY "Users can view own admin record" ON public.admin_users
    FOR SELECT USING (auth.uid() = id);

-- Only super_admins can view all admin users
CREATE POLICY "Super admins can view all admin users" ON public.admin_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.id = auth.uid() 
            AND au.role = 'super_admin' 
            AND au.is_active = true
        )
    );

-- Only super_admins can insert admin users
CREATE POLICY "Super admins can insert admin users" ON public.admin_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.id = auth.uid() 
            AND au.role = 'super_admin' 
            AND au.is_active = true
        )
    );

-- Only super_admins can update admin users
CREATE POLICY "Super admins can update admin users" ON public.admin_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.id = auth.uid() 
            AND au.role = 'super_admin' 
            AND au.is_active = true
        )
    );

-- Only super_admins can delete admin users
CREATE POLICY "Super admins can delete admin users" ON public.admin_users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.id = auth.uid() 
            AND au.role = 'super_admin' 
            AND au.is_active = true
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON public.admin_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT USAGE ON SEQUENCE public.admin_users_id_seq TO authenticated;

-- Insert a default super_admin user (replace with actual email)
-- This should be done after creating the user in Supabase Auth
-- INSERT INTO public.admin_users (id, email, role) 
-- VALUES ('your-user-id-here', 'superadmin@your.org', 'super_admin');
