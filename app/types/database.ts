// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      registrations: {
        Row: Registration;
        Insert: RegistrationInsert;
        Update: RegistrationUpdate;
      };
      admin_users: {
        Row: AdminUser;
        Insert: AdminUserInsert;
        Update: AdminUserUpdate;
      };
      event_settings: {
        Row: EventSettings;
        Insert: EventSettingsInsert;
        Update: EventSettingsUpdate;
      };
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
    Enums: {
      [key: string]: unknown;
    };
  };
  audit: {
    Tables: {
      access_log: {
        Row: AuditAccessLog;
        Insert: AuditAccessLogInsert;
        Update: never;
      };
      event_log: {
        Row: AuditEventLog;
        Insert: AuditEventLogInsert;
        Update: never;
      };
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
    Enums: {
      [key: string]: unknown;
    };
  };
}

// Form data type for registration
type FormData = Record<string, unknown> | unknown[] | string | number | boolean | null;

// Registration table types
export interface Registration {
  id: number;
  registration_id: string;
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  line_id: string;
  email: string;
  company_name: string;
  business_type: string;
  business_type_other: string | null;
  yec_province: string;
  hotel_choice: 'in-quota' | 'out-of-quota';
  room_type: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info: string | null;
  roommate_phone: string | null;
  external_hotel_name: string | null;
  travel_type: 'private-car' | 'van';
  profile_image_url: string | null;
  chamber_card_url: string | null;
  payment_slip_url: string | null;
  badge_url: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  // Phase 1: New status model
  status: 'waiting_for_review' | 'waiting_for_update_payment' | 'waiting_for_update_info' | 'waiting_for_update_tcc' | 'approved' | 'rejected';
  update_reason: 'payment' | 'info' | 'tcc' | null;
  rejected_reason: string | null;
  // Phase 1: 3-track checklist
  payment_review_status: 'pending' | 'needs_update' | 'passed' | 'rejected';
  profile_review_status: 'pending' | 'needs_update' | 'passed' | 'rejected';
  tcc_review_status: 'pending' | 'needs_update' | 'passed' | 'rejected';
  // Phase 1: Comprehensive review workflow
  review_checklist: {
    payment: { status: 'pending' | 'needs_update' | 'passed' | 'rejected'; notes?: string };
    profile: { status: 'pending' | 'needs_update' | 'passed' | 'rejected'; notes?: string };
    tcc: { status: 'pending' | 'needs_update' | 'passed' | 'rejected'; notes?: string };
  };
  // Phase 1: Pricing fields
  price_applied: number | null;
  currency: string;
  selected_package_code: string | null;
  ip_address: string | null;
  user_agent: string | null;
  form_data: FormData;
  created_at: string;
  updated_at: string;
}

export interface RegistrationInsert {
  registration_id: string;
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  line_id: string;
  email: string;
  company_name: string;
  business_type: string;
  business_type_other?: string | null;
  yec_province: string;
  hotel_choice: 'in-quota' | 'out-of-quota';
  room_type?: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info?: string | null;
  roommate_phone?: string | null;
  external_hotel_name?: string | null;
  travel_type: 'private-car' | 'van';
  profile_image_url?: string | null;
  chamber_card_url?: string | null;
  payment_slip_url?: string | null;
  badge_url?: string | null;
  email_sent?: boolean;
  email_sent_at?: string | null;
  // Phase 1: New status model
  status?: 'waiting_for_review' | 'waiting_for_update_payment' | 'waiting_for_update_info' | 'waiting_for_update_tcc' | 'approved' | 'rejected';
  update_reason?: 'payment' | 'info' | 'tcc' | null;
  rejected_reason?: string | null;
  // Phase 1: 3-track checklist
  payment_review_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  profile_review_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  tcc_review_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  // Phase 1: Pricing fields
  price_applied?: number | null;
  currency?: string;
  selected_package_code?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  form_data?: FormData;
  created_at?: string;
  updated_at?: string;
}

export interface RegistrationUpdate {
  registration_id?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone?: string;
  line_id?: string;
  email?: string;
  company_name?: string;
  business_type?: string;
  business_type_other?: string | null;
  yec_province?: string;
  hotel_choice?: 'in-quota' | 'out-of-quota';
  room_type?: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info?: string | null;
  roommate_phone?: string | null;
  external_hotel_name?: string | null;
  travel_type?: 'private-car' | 'van';
  profile_image_url?: string | null;
  chamber_card_url?: string | null;
  payment_slip_url?: string | null;
  badge_url?: string | null;
  email_sent?: boolean;
  email_sent_at?: string | null;
  // Phase 1: New status model
  status?: 'waiting_for_review' | 'waiting_for_update_payment' | 'waiting_for_update_info' | 'waiting_for_update_tcc' | 'approved' | 'rejected';
  update_reason?: 'payment' | 'info' | 'tcc' | null;
  rejected_reason?: string | null;
  // Phase 1: 3-track checklist
  payment_review_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  profile_review_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  tcc_review_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  // Phase 1: Comprehensive review workflow
  review_checklist?: {
    payment: { status: 'pending' | 'needs_update' | 'passed' | 'rejected'; notes?: string };
    profile: { status: 'pending' | 'needs_update' | 'passed' | 'rejected'; notes?: string };
    tcc: { status: 'pending' | 'needs_update' | 'passed' | 'rejected'; notes?: string };
  };
  // Phase 1: Pricing fields
  price_applied?: number | null;
  currency?: string;
  selected_package_code?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  form_data?: FormData;
  created_at?: string;
  updated_at?: string;
}

// Admin user table types
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

export interface AdminUserInsert {
  email: string;
  role?: 'admin' | 'super_admin';
  created_at?: string;
  updated_at?: string;
}

export interface AdminUserUpdate {
  email?: string;
  role?: 'admin' | 'super_admin';
  created_at?: string;
  updated_at?: string;
}

// Event settings table types (Phase 1)
export interface EventSettings {
  id: string;
  registration_deadline_utc: string;
  early_bird_deadline_utc: string;
  price_packages: PricePackage[];
  eligibility_rules: EligibilityRules | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface EventSettingsInsert {
  registration_deadline_utc: string;
  early_bird_deadline_utc: string;
  price_packages: PricePackage[];
  eligibility_rules?: EligibilityRules | null;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventSettingsUpdate {
  registration_deadline_utc?: string;
  early_bird_deadline_utc?: string;
  price_packages?: PricePackage[];
  eligibility_rules?: EligibilityRules | null;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

// Price package types (Phase 1)
export interface PricePackage {
  code: string;
  name: string;
  currency: string;
  early_bird_amount: number;
  regular_amount: number;
}

// Eligibility rules types (Phase 1)
export interface EligibilityRules {
  blocked_emails: string[];
  blocked_domains: string[];
  blocked_keywords: string[];
}

// Audit table types
export interface AuditAccessLog {
  id: string;
  timestamp: string;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  correlation_id: string | null;
}

export interface AuditAccessLogInsert {
  timestamp?: string;
  user_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  correlation_id?: string | null;
}

export interface AuditEventLog {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  correlation_id: string | null;
  resource_id: string | null;
  actor_role: string | null;
  result: string;
  reason: string | null;
  meta: any;
}

export interface AuditEventLogInsert {
  timestamp?: string;
  action: string;
  resource: string;
  correlation_id?: string | null;
  resource_id?: string | null;
  actor_role?: string | null;
  result: string;
  reason?: string | null;
  meta?: any;
} 