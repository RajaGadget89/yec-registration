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
      import_sessions: {
        Row: ImportSession;
        Insert: ImportSessionInsert;
        Update: ImportSessionUpdate;
      };
      import_audit_logs: {
        Row: ImportAuditLog;
        Insert: ImportAuditLogInsert;
        Update: ImportAuditLogUpdate;
      };
      import_batches: {
        Row: ImportBatch;
        Insert: ImportBatchInsert;
        Update: ImportBatchUpdate;
      };
      user_checkins: {
        Row: UserCheckin;
        Insert: UserCheckinInsert;
        Update: UserCheckinUpdate;
      };
      checkin_events: {
        Row: CheckinEvent;
        Insert: CheckinEventInsert;
        Update: CheckinEventUpdate;
      };
      event_types: {
        Row: EventType;
        Insert: EventTypeInsert;
        Update: EventTypeUpdate;
      };
      payment_slip_analysis: {
        Row: PaymentSlipAnalysis;
        Insert: PaymentSlipAnalysisInsert;
        Update: PaymentSlipAnalysisUpdate;
      };
      update_tokens: {
        Row: UpdateToken;
        Insert: UpdateTokenInsert;
        Update: UpdateTokenUpdate;
      };
      email_queue: {
        Row: EmailQueue;
        Insert: EmailQueueInsert;
        Update: EmailQueueUpdate;
      };
      landing_page_sections: {
        Row: LandingPageSection;
        Insert: LandingPageSectionInsert;
        Update: LandingPageSectionUpdate;
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
  | "checker_admin"
  | "cms_admin"
  | "istm_admin";

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
  status: "active" | "suspended";
}

export interface AdminUserInsert {
  email: string;
  role?: "admin" | "super_admin";
  business_roles?: BusinessRole[];
  is_active?: boolean;
  status?: "active" | "suspended";
  created_at?: string;
  updated_at?: string;
}

export interface AdminUserUpdate {
  email?: string;
  role?: "admin" | "super_admin";
  business_roles?: BusinessRole[];
  is_active?: boolean;
  status?: "active" | "suspended";
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

// Import session table types
export interface ImportSession {
  id: string;
  admin_user_id: string;
  csv_filename: string;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  status: "pending" | "processing" | "completed" | "failed" | "rolled_back";
  metadata: any;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ImportSessionInsert {
  admin_user_id: string;
  csv_filename: string;
  total_records: number;
  processed_records?: number;
  successful_records?: number;
  failed_records?: number;
  status?: "pending" | "processing" | "completed" | "failed" | "rolled_back";
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface ImportSessionUpdate {
  admin_user_id?: string;
  csv_filename?: string;
  total_records?: number;
  processed_records?: number;
  successful_records?: number;
  failed_records?: number;
  status?: "pending" | "processing" | "completed" | "failed" | "rolled_back";
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

// Import audit log table types
export interface ImportAuditLog {
  id: string;
  import_session_id: string;
  admin_user_id: string;
  event_type: string;
  event_details: any;
  created_at: string;
}

export interface ImportAuditLogInsert {
  import_session_id: string;
  admin_user_id: string;
  event_type: string;
  event_details: any;
  created_at?: string;
}

export interface ImportAuditLogUpdate {
  import_session_id?: string;
  admin_user_id?: string;
  event_type?: string;
  event_details?: any;
  created_at?: string;
}

// Import batch table types
export interface ImportBatch {
  id: string;
  import_session_id: string;
  batch_number: number;
  status: "pending" | "processing" | "completed" | "failed";
  records_count: number;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  error_log: any;
  created_at: string;
  updated_at: string;
}

export interface ImportBatchInsert {
  import_session_id: string;
  batch_number: number;
  status?: "pending" | "processing" | "completed" | "failed";
  records_count: number;
  processed_count?: number;
  successful_count?: number;
  failed_count?: number;
  error_log?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ImportBatchUpdate {
  import_session_id?: string;
  batch_number?: number;
  status?: "pending" | "processing" | "completed" | "failed";
  records_count?: number;
  processed_count?: number;
  successful_count?: number;
  failed_count?: number;
  error_log?: any;
  created_at?: string;
  updated_at?: string;
}

// User checkin table types
export interface UserCheckin {
  id: string;
  registration_id: string;
  checkin_event_id: string;
  event_type_id: string;
  checkin_time: string;
  location: string | null;
  notes: string | null;
  checked_in_by: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface UserCheckinInsert {
  registration_id: string;
  checkin_event_id: string;
  event_type_id: string;
  checkin_time: string;
  location?: string | null;
  notes?: string | null;
  checked_in_by: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface UserCheckinUpdate {
  registration_id?: string;
  checkin_event_id?: string;
  event_type_id?: string;
  checkin_time?: string;
  location?: string | null;
  notes?: string | null;
  checked_in_by?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

// Checkin event table types
export interface CheckinEvent {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  event_type_id: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckinEventInsert {
  name: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  event_type_id: string;
  created_by: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CheckinEventUpdate {
  name?: string;
  description?: string | null;
  location?: string | null;
  start_time?: string;
  end_time?: string;
  event_type_id?: string;
  created_by?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Event type table types
export interface EventType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  business_rule_category: string;
  created_at: string;
  updated_at: string;
}

export interface EventTypeInsert {
  name: string;
  description?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  business_rule_category: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventTypeUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  business_rule_category?: string;
  created_at?: string;
  updated_at?: string;
}

// Payment slip analysis table types
export interface PaymentSlipAnalysis {
  id: string;
  application_id: string;
  file_path: string;
  result_json: any;
  analyzer_version: string;
  created_at: string;
}

export interface PaymentSlipAnalysisInsert {
  application_id: string;
  file_path: string;
  result_json: any;
  analyzer_version: string;
  created_at?: string;
}

export interface PaymentSlipAnalysisUpdate {
  application_id?: string;
  file_path?: string;
  result_json?: any;
  analyzer_version?: string;
  created_at?: string;
}

// Update token table types
export interface UpdateToken {
  id: string;
  token_hash: string;
  registration_id: string;
  dimension: "payment" | "profile" | "tcc";
  created_by: string;
  notes: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateTokenInsert {
  token_hash: string;
  registration_id: string;
  dimension: "payment" | "profile" | "tcc";
  created_by: string;
  notes?: string | null;
  expires_at: string;
  used_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateTokenUpdate {
  token_hash?: string;
  registration_id?: string;
  dimension?: "payment" | "profile" | "tcc";
  created_by?: string;
  notes?: string | null;
  expires_at?: string;
  used_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Email queue table types
export interface EmailQueue {
  id: string;
  to_email: string;
  subject: string;
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

export interface EmailQueueInsert {
  to_email: string;
  subject: string;
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

export interface EmailQueueUpdate {
  to_email?: string;
  subject?: string;
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

// Landing page sections table types
export interface LandingPageSection {
  id: string;
  section_key:
    | "hero"
    | "news"
    | "banner"
    | "activity_cards"
    | "registration_form"
    | "registration_cta";
  section_name: string;
  is_active: boolean;
  section_order: number;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface LandingPageSectionInsert {
  section_key:
    | "hero"
    | "news"
    | "banner"
    | "activity_cards"
    | "registration_form"
    | "registration_cta";
  section_name: string;
  is_active?: boolean;
  section_order?: number;
  updated_by?: string | null;
  updated_at?: string;
  created_at?: string;
}

export interface LandingPageSectionUpdate {
  section_key?:
    | "hero"
    | "news"
    | "banner"
    | "registration_form"
    | "registration_cta";
  section_name?: string;
  is_active?: boolean;
  section_order?: number;
  updated_by?: string | null;
  updated_at?: string;
  created_at?: string;
}
