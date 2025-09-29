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
      admin_invitations: {
        Row: AdminInvitation;
        Insert: AdminInvitationInsert;
        Update: AdminInvitationUpdate;
      };
      email_outbox: {
        Row: EmailOutbox;
        Insert: EmailOutboxInsert;
        Update: EmailOutboxUpdate;
      };
      deep_link_tokens: {
        Row: DeepLinkToken;
        Insert: DeepLinkTokenInsert;
        Update: DeepLinkTokenUpdate;
      };
      admin_audit_logs: {
        Row: AdminAuditLog;
        Insert: AdminAuditLogInsert;
        Update: AdminAuditLogUpdate;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      audit_events: {
        Row: AuditEvent;
        Insert: AuditEventInsert;
        Update: AuditEventUpdate;
      };
      event_log: {
        Row: EventLog;
        Insert: EventLogInsert;
        Update: EventLogUpdate;
      };
      access_log: {
        Row: AccessLog;
        Insert: AccessLogInsert;
        Update: AccessLogUpdate;
      };
      "information_schema.columns": {
        Row: InformationSchemaColumn;
        Insert: never;
        Update: never;
      };
      "information_schema.schemata": {
        Row: InformationSchemaSchemata;
        Insert: never;
        Update: never;
      };
      "information_schema.tables": {
        Row: InformationSchemaTable;
        Insert: never;
        Update: never;
      };
      "supabase_migrations.schema_migrations": {
        Row: SchemaMigration;
        Insert: never;
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
type FormData =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

// Registration table types
export interface Registration {
  id: string;
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
  hotel_choice: "in-quota" | "out-of-quota";
  room_type: "single" | "double" | "suite" | "no-accommodation" | null;
  roommate_info: string | null;
  roommate_phone: string | null;
  external_hotel_name: string | null;
  travel_type: "private-car" | "van";
  profile_image_url: string | null;
  chamber_card_url: string | null;
  payment_slip_url: string | null;
  badge_url: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  // Phase 1: New status model
  status:
    | "waiting_for_review"
    | "waiting_for_update_payment"
    | "waiting_for_update_info"
    | "waiting_for_update_tcc"
    | "approved"
    | "rejected";
  update_reason: "payment" | "profile" | "tcc" | null;
  rejected_reason: string | null;
  // Phase 1: 3-track checklist
  payment_review_status: "pending" | "needs_update" | "passed" | "rejected";
  profile_review_status: "pending" | "needs_update" | "passed" | "rejected";
  tcc_review_status: "pending" | "needs_update" | "passed" | "rejected";
  // Phase 1: Comprehensive review workflow
  review_checklist: {
    payment: {
      status: "pending" | "needs_update" | "passed" | "rejected";
      notes?: string;
    };
    profile: {
      status: "pending" | "needs_update" | "passed" | "rejected";
      notes?: string;
    };
    tcc: {
      status: "pending" | "needs_update" | "passed" | "rejected";
      notes?: string;
    };
  };
  // Phase 1: Pricing fields
  price_applied: number | null;
  currency: string;
  selected_package_code: string | null;
  // Package Pricing System: New pricing fields
  price_breakdown: {
    basePrice: number;
    roomSurcharge: number;
    total: number;
  } | null;
  is_early_bird: boolean;
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
  hotel_choice: "in-quota" | "out-of-quota";
  room_type?: "single" | "double" | "suite" | "no-accommodation" | null;
  roommate_info?: string | null;
  roommate_phone?: string | null;
  external_hotel_name?: string | null;
  travel_type: "private-car" | "van";
  profile_image_url?: string | null;
  chamber_card_url?: string | null;
  payment_slip_url?: string | null;
  badge_url?: string | null;
  email_sent?: boolean;
  email_sent_at?: string | null;
  // Phase 1: New status model
  status?:
    | "waiting_for_review"
    | "waiting_for_update_payment"
    | "waiting_for_update_info"
    | "waiting_for_update_tcc"
    | "approved"
    | "rejected";
  update_reason?: "payment" | "info" | "tcc" | null;
  rejected_reason?: string | null;
  // Phase 1: 3-track checklist
  payment_review_status?: "pending" | "needs_update" | "passed" | "rejected";
  profile_review_status?: "pending" | "needs_update" | "passed" | "rejected";
  tcc_review_status?: "pending" | "needs_update" | "passed" | "rejected";
  // Phase 1: Pricing fields
  price_applied?: number | null;
  currency?: string;
  selected_package_code?: string | null;
  // Package Pricing System: New pricing fields
  price_breakdown?: {
    basePrice: number;
    roomSurcharge: number;
    total: number;
  } | null;
  is_early_bird?: boolean;
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
  hotel_choice?: "in-quota" | "out-of-quota";
  room_type?: "single" | "double" | "suite" | "no-accommodation" | null;
  roommate_info?: string | null;
  roommate_phone?: string | null;
  external_hotel_name?: string | null;
  travel_type?: "private-car" | "van";
  profile_image_url?: string | null;
  chamber_card_url?: string | null;
  payment_slip_url?: string | null;
  badge_url?: string | null;
  email_sent?: boolean;
  email_sent_at?: string | null;
  // Phase 1: New status model
  status?:
    | "waiting_for_review"
    | "waiting_for_update_payment"
    | "waiting_for_update_info"
    | "waiting_for_update_tcc"
    | "approved"
    | "rejected";
  update_reason?: "payment" | "profile" | "tcc" | null;
  rejected_reason?: string | null;
  // Phase 1: 3-track checklist
  payment_review_status?: "pending" | "needs_update" | "passed" | "rejected";
  profile_review_status?: "pending" | "needs_update" | "passed" | "rejected";
  tcc_review_status?: "pending" | "needs_update" | "passed" | "rejected";
  // Phase 1: Comprehensive review workflow
  review_checklist?: {
    payment: {
      status: "pending" | "needs_update" | "passed" | "rejected";
      notes?: string;
    };
    profile: {
      status: "pending" | "needs_update" | "passed" | "rejected";
      notes?: string;
    };
    tcc: {
      status: "pending" | "needs_update" | "passed" | "rejected";
      notes?: string;
    };
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

// Business role types for granular admin permissions
export type BusinessRole =
  | "user_profile"
  | "payment_slip"
  | "tcc_card"
  | "checker_admin";

// Admin user table types
export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  business_roles: BusinessRole[];
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

export interface AdminUserInsert {
  email: string;
  role?: "admin" | "super_admin";
  business_roles?: BusinessRole[];
  created_at?: string;
  updated_at?: string;
}

export interface AdminUserUpdate {
  email?: string;
  role?: "admin" | "super_admin";
  business_roles?: BusinessRole[];
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
  // Package Pricing System: New pricing configuration
  pricing_config: {
    early_bird_deadline: string;
    prices: {
      early_bird_out_of_quota: number;
      early_bird_in_quota_double: number;
      early_bird_in_quota_single: number;
      normal_out_of_quota: number;
      normal_in_quota_double: number;
      normal_in_quota_single: number;
    };
    allow_in_quota_after_early_bird: boolean;
    in_quota_surcharge_after_early_bird: number;
  } | null;
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

// Admin invitation table types
export interface AdminInvitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  created_by: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  roles: string[];
  correlation_id: string;
  resend_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AdminInvitationInsert {
  email: string;
  token: string;
  expires_at: string;
  created_by: string;
  status?: "pending" | "accepted" | "expired" | "revoked";
  roles: string[];
  correlation_id: string;
  resend_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminInvitationUpdate {
  email?: string;
  token?: string;
  expires_at?: string;
  created_by?: string;
  status?: "pending" | "accepted" | "expired" | "revoked";
  roles?: string[];
  correlation_id?: string;
  resend_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Email outbox table types
export interface EmailOutbox {
  id: string;
  to_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  template: string;
  payload: any;
  status: "pending" | "sent" | "failed" | "retrying";
  attempts: number;
  max_attempts: number;
  next_attempt: string | null;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailOutboxInsert {
  to_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  template: string;
  payload: any;
  status?: "pending" | "sent" | "failed" | "retrying";
  attempts?: number;
  max_attempts?: number;
  next_attempt?: string | null;
  sent_at?: string | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmailOutboxUpdate {
  to_email?: string;
  subject?: string;
  html_content?: string;
  text_content?: string;
  template?: string;
  payload?: any;
  status?: "pending" | "sent" | "failed" | "retrying";
  attempts?: number;
  max_attempts?: number;
  next_attempt?: string | null;
  sent_at?: string | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Deep link token table types
export interface DeepLinkToken {
  token_id: string;
  token: string;
  registration_id: string;
  dimension: "payment" | "profile" | "tcc";
  admin_email: string;
  notes: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeepLinkTokenInsert {
  token_id: string;
  token: string;
  registration_id: string;
  dimension: "payment" | "profile" | "tcc";
  admin_email: string;
  notes?: string | null;
  expires_at: string;
  used_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeepLinkTokenUpdate {
  token_id?: string;
  token?: string;
  registration_id?: string;
  dimension?: "payment" | "profile" | "tcc";
  admin_email?: string;
  notes?: string | null;
  expires_at?: string;
  used_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Admin audit log table types
export interface AdminAuditLog {
  id: string;
  admin_email: string;
  action: string;
  registration_id: string | null;
  before: any;
  after: any;
  timestamp: string;
  metadata: any;
}

export interface AdminAuditLogInsert {
  admin_email: string;
  action: string;
  registration_id?: string | null;
  before?: any;
  after?: any;
  timestamp?: string;
  metadata?: any;
}

export interface AdminAuditLogUpdate {
  admin_email?: string;
  action?: string;
  registration_id?: string | null;
  before?: any;
  after?: any;
  timestamp?: string;
  metadata?: any;
}

// Audit log table types
export interface AuditLog {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

export interface AuditLogInsert {
  event_type: string;
  event_data: any;
  created_at?: string;
}

export interface AuditLogUpdate {
  event_type?: string;
  event_data?: any;
  created_at?: string;
}

// Audit event table types
export interface AuditEvent {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

export interface AuditEventInsert {
  event_type: string;
  event_data: any;
  created_at?: string;
}

export interface AuditEventUpdate {
  event_type?: string;
  event_data?: any;
  created_at?: string;
}

// Event log table types
export interface EventLog {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

export interface EventLogInsert {
  event_type: string;
  event_data: any;
  created_at?: string;
}

export interface EventLogUpdate {
  event_type?: string;
  event_data?: any;
  created_at?: string;
}

// Access log table types
export interface AccessLog {
  id: string;
  action: string;
  method: string;
  resource: string;
  result: string;
  request_id: string;
  src_ip: string;
  user_agent: string;
  latency_ms: number;
  meta: any;
}

export interface AccessLogInsert {
  action: string;
  method: string;
  resource: string;
  result: string;
  request_id: string;
  src_ip: string;
  user_agent: string;
  latency_ms: number;
  meta?: any;
}

export interface AccessLogUpdate {
  action?: string;
  method?: string;
  resource?: string;
  result?: string;
  request_id?: string;
  src_ip?: string;
  user_agent?: string;
  latency_ms?: number;
  meta?: any;
}

// Information schema types
export interface InformationSchemaColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface InformationSchemaSchemata {
  schema_name: string;
}

export interface InformationSchemaTable {
  table_name: string;
  table_schema: string;
}

// Schema migration types
export interface SchemaMigration {
  version: string;
  statements: string[];
  name: string;
}
