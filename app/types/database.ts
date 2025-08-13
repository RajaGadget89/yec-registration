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
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      [key: string]: any;
    };
    Enums: {
      [key: string]: any;
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
      [key: string]: any;
    };
    Functions: {
      [key: string]: any;
    };
    Enums: {
      [key: string]: any;
    };
  };
}

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
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  form_data: any;
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
  status?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  form_data?: any;
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
  status?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  form_data?: any;
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
  last_login_at: string | null;
  is_active: boolean;
}

export interface AdminUserInsert {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  is_active?: boolean;
}

export interface AdminUserUpdate {
  id?: string;
  email?: string;
  role?: 'admin' | 'super_admin';
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  is_active?: boolean;
}

// Audit log table types
export interface AuditAccessLog {
  id: number;
  occurred_at_utc: string;
  action: string;
  method: string | null;
  resource: string | null;
  result: string;
  request_id: string;
  src_ip: string | null;
  user_agent: string | null;
  latency_ms: number | null;
  meta: any | null;
  created_at: string;
}

export interface AuditAccessLogInsert {
  occurred_at_utc?: string;
  action: string;
  method?: string | null;
  resource?: string | null;
  result: string;
  request_id: string;
  src_ip?: string | null;
  user_agent?: string | null;
  latency_ms?: number | null;
  meta?: any | null;
  created_at?: string;
}

export interface AuditEventLog {
  id: number;
  occurred_at_utc: string;
  action: string;
  resource: string;
  resource_id: string | null;
  actor_id: string | null;
  actor_role: 'user' | 'admin' | 'system';
  result: string;
  reason: string | null;
  correlation_id: string;
  meta: any | null;
  created_at: string;
}

export interface AuditEventLogInsert {
  occurred_at_utc?: string;
  action: string;
  resource: string;
  resource_id?: string | null;
  actor_id?: string | null;
  actor_role: 'user' | 'admin' | 'system';
  result: string;
  reason?: string | null;
  correlation_id: string;
  meta?: any | null;
  created_at?: string;
} 