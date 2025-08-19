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

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS ux_event_settings_singleton ON event_settings ((true));

-- 2. Create registrations table with all columns
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(10) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  nickname VARCHAR(30) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  line_id VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  business_type_other VARCHAR(50),
  yec_province VARCHAR(50) NOT NULL,
  hotel_choice VARCHAR(20) NOT NULL,
  room_type VARCHAR(20),
  roommate_info VARCHAR(100),
  roommate_phone VARCHAR(15),
  external_hotel_name VARCHAR(100),
  travel_type VARCHAR(20) NOT NULL,
  profile_image_url TEXT,
  chamber_card_url TEXT,
  payment_slip_url TEXT,
  badge_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  form_data JSONB,
  
  -- Status model fields
  status TEXT NOT NULL DEFAULT 'waiting_for_review',
  update_reason TEXT NULL,
  rejected_reason TEXT NULL,
  
  -- 3-track checklist fields
  payment_review_status TEXT NOT NULL DEFAULT 'pending',
  profile_review_status TEXT NOT NULL DEFAULT 'pending',
  tcc_review_status TEXT NOT NULL DEFAULT 'pending',
  
  -- Comprehensive review workflow
  review_checklist JSONB DEFAULT '{
    "payment": {"status": "pending"},
    "profile": {"status": "pending"},
    "tcc": {"status": "pending"}
  }'::jsonb,
  
  -- Pricing fields
  price_applied NUMERIC(12,2) NULL,
  currency TEXT DEFAULT 'THB',
  selected_package_code TEXT NULL,
  
  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('waiting_for_review', 'waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc', 'approved', 'rejected')),
  CONSTRAINT chk_update_reason CHECK (update_reason IS NULL OR update_reason IN ('payment', 'info', 'tcc')),
  CONSTRAINT chk_review_statuses CHECK (
    payment_review_status IN ('pending', 'needs_update', 'passed', 'rejected') AND
    profile_review_status IN ('pending', 'needs_update', 'passed', 'rejected') AND
    tcc_review_status IN ('pending', 'needs_update', 'passed', 'rejected')
  ),
  CONSTRAINT chk_hotel_choice CHECK (hotel_choice IN ('in-quota', 'out-of-quota')),
  CONSTRAINT chk_room_type CHECK (room_type IS NULL OR room_type IN ('single', 'double', 'suite', 'no-accommodation')),
  CONSTRAINT chk_travel_type CHECK (travel_type IN ('private-car', 'van')),
  CONSTRAINT room_type_required_when_in_quota CHECK (
    (hotel_choice = 'in-quota' AND room_type IS NOT NULL) OR 
    (hotel_choice = 'out-of-quota' AND room_type IS NULL)
  ),
  CONSTRAINT roommate_info_required_for_double CHECK (
    (room_type = 'double' AND roommate_info IS NOT NULL AND roommate_phone IS NOT NULL) OR 
    (room_type != 'double')
  )
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

-- Add primary key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_users_pkey' 
    AND table_name = 'admin_users'
  ) THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 4. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  before JSONB,
  after JSONB
);

-- Add primary key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_audit_logs_pkey' 
    AND table_name = 'admin_audit_logs'
  ) THEN
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 5. Create indexes for performance
-- Registrations table indexes
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_company_name ON registrations(company_name);
CREATE INDEX IF NOT EXISTS idx_registrations_yec_province ON registrations(yec_province);
CREATE INDEX IF NOT EXISTS idx_registrations_business_type ON registrations(business_type);
CREATE INDEX IF NOT EXISTS idx_registrations_update_reason ON registrations(update_reason) WHERE update_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_review_checklist ON registrations USING GIN (review_checklist);
CREATE INDEX IF NOT EXISTS idx_registrations_status_created_at ON registrations(status, created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_status_province ON registrations(status, yec_province);

-- Admin audit logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON admin_audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_registration_id ON admin_audit_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);

-- 6. Insert default event settings
INSERT INTO event_settings (
  registration_deadline_utc,
  early_bird_deadline_utc,
  price_packages,
  eligibility_rules,
  timezone
) VALUES (
  (NOW() + INTERVAL '30 days')::timestamptz,
  (NOW() + INTERVAL '7 days')::timestamptz,
  '[
    {"code": "standard", "name": "Standard Package", "currency": "THB", "early_bird_amount": 1500, "regular_amount": 2000},
    {"code": "premium", "name": "Premium Package", "currency": "THB", "early_bird_amount": 2500, "regular_amount": 3000},
    {"code": "vip", "name": "VIP Package", "currency": "THB", "early_bird_amount": 3500, "regular_amount": 4000},
    {"code": "student", "name": "Student Package", "currency": "THB", "early_bird_amount": 800, "regular_amount": 1200}
  ]'::jsonb,
  '{"blocked_emails": [], "blocked_domains": [], "blocked_keywords": []}'::jsonb,
  'Asia/Bangkok'
) ON CONFLICT DO NOTHING;

-- Migration completed successfully
SELECT 'Initial database schema migration completed successfully' as status;
