-- Migration: Initial Database Schema
-- Version: 1.0
-- Description: Creates the core database schema for YEC Registration system
-- Date: 2025-01-27

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Create event_settings table (singleton)
CREATE TABLE IF NOT EXISTS event_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_deadline_utc TIMESTAMPTZ NOT NULL,
  early_bird_deadline_utc TIMESTAMPTZ NOT NULL,
  price_packages JSONB NOT NULL,
  eligibility_rules JSONB,
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid(),
  registration_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  business_type TEXT,
  yec_province TEXT NOT NULL,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  update_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT registrations_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'needs_update'))
);

-- 3. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'super_admin'))
);

-- 4. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Add primary key constraints only for tables that don't have them in CREATE TABLE
-- event_settings already has PRIMARY KEY in CREATE TABLE, so we skip it
DO $$
BEGIN
  -- Add primary key to admin_users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_users_pkey' 
    AND conrelid = 'admin_users'::regclass
  ) THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);
  END IF;
  
  -- Add primary key to admin_audit_logs if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_audit_logs_pkey' 
    AND conrelid = 'admin_audit_logs'::regclass
  ) THEN
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);
  END IF;
  
  -- Add primary key to registrations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'registrations_pkey' 
    AND conrelid = 'registrations'::regclass
  ) THEN
    ALTER TABLE registrations ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);
  END IF;
  
  -- Note: event_settings already has PRIMARY KEY in CREATE TABLE, so we don't add it here
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_company_name ON registrations(company_name);
CREATE INDEX IF NOT EXISTS idx_registrations_business_type ON registrations(business_type);
CREATE INDEX IF NOT EXISTS idx_registrations_yec_province ON registrations(yec_province);
CREATE INDEX IF NOT EXISTS idx_registrations_status_created_at ON registrations(status, created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_status_province ON registrations(status, yec_province);
CREATE INDEX IF NOT EXISTS idx_registrations_update_reason ON registrations(update_reason) WHERE update_reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON admin_audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_registration_id ON admin_audit_logs(registration_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to tables
DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;
CREATE TRIGGER update_registrations_updated_at
    BEFORE UPDATE ON registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_settings_updated_at ON event_settings;
CREATE TRIGGER update_event_settings_updated_at
    BEFORE UPDATE ON event_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updating registration status
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the status based on review_notes
    IF NEW.review_notes IS NOT NULL AND OLD.review_notes IS DISTINCT FROM NEW.review_notes THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_registration_status ON registrations;
CREATE TRIGGER trigger_update_registration_status
    BEFORE UPDATE ON registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_registration_status();
