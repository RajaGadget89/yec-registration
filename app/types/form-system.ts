// TypeScript types for the Multi-Form Registration System
// These types define the structure for the new form system alongside the traditional registration system

export interface FormType {
  id: string;
  form_key: string;
  name: string;
  description?: string;
  config: FormConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormConfig {
  fields: FormField[];
  approval_workflow: ApprovalWorkflowTemplate;
  pricing_config?: PricingConfig;
  badge_template?: BadgeTemplate;
  email_templates?: EmailTemplateConfig;
  tracking_id_format: TrackingIdFormat;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  validation?: FieldValidation;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  depends_on?: {
    field: string;
    value: string;
  };
  extra_field?: {
    id: string;
    label: string;
    type: FormFieldType;
    required?: boolean;
    validation?: FieldValidation;
  };
}

export type FormFieldType =
  | "text"
  | "email"
  | "tel"
  | "select"
  | "textarea"
  | "file"
  | "checkbox"
  | "radio"
  | "date"
  | "number";

export interface FieldValidation {
  pattern?: string;
  min_length?: number;
  max_length?: number;
  file_types?: string[];
  max_file_size?: number; // in MB
  custom_validation?: string; // function name
}

export type ApprovalWorkflowTemplate =
  | "payment_only"
  | "payment_profile"
  | "full_3d";

export interface PricingConfig {
  pricing_type: "fixed" | "tiered" | "early_bird";
  base_price: number;
  currency: string;
  tiers?: PricingTier[];
  early_bird_deadline?: string;
  early_bird_discount?: number;
}

export interface PricingTier {
  name: string;
  condition: string; // JSON condition
  price: number;
}

export interface BadgeTemplate {
  logo_url: string;
  title_text: string;
  background_color: string;
  fields: string[]; // field IDs to include
  layout: "vertical" | "horizontal";
}

export interface EmailTemplateConfig {
  tracking: EmailTemplate;
  approval: EmailTemplate;
  rejection: EmailTemplate;
  update_request: EmailTemplate;
}

export interface EmailTemplate {
  subject_template: string;
  body_variables: Record<string, string>;
  base_template: string;
}

export interface TrackingIdFormat {
  prefix: string;
  sequence_start: number;
  format: string; // e.g., "{PREFIX}-{SEQUENCE:06d}"
}

export interface FormRegistration {
  id: string;
  form_key: string;
  tracking_id: string;
  sequence_number: number;
  core_data: CoreRegistrationData;
  extra_data: Record<string, any>;
  pricing_data: PricingData;
  status: RegistrationStatus;
  dimension_status: DimensionStatus;
  badge_path?: string;
  import_job_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CoreRegistrationData {
  name: string;
  email: string;
  phone: string;
  organization?: string;
  [key: string]: any;
}

export interface PricingData {
  total_amount: number;
  currency: string;
  breakdown?: {
    base_price: number;
    surcharges: number;
    discounts: number;
    total: number;
  };
  is_early_bird?: boolean;
}

export type RegistrationStatus =
  | "waiting_for_review"
  | "waiting_for_update_payment"
  | "waiting_for_update_info"
  | "waiting_for_update_tcc"
  | "approved"
  | "rejected";

export interface DimensionStatus {
  [dimension: string]: {
    status: "pending" | "needs_update" | "passed" | "rejected";
    notes?: string;
  };
}

export interface FormPricingConfig {
  id: string;
  form_key: string;
  pricing_type: "fixed" | "tiered" | "early_bird";
  config: PricingConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormEmailTemplate {
  id: string;
  form_key: string;
  template_type: "tracking" | "approval" | "rejection" | "update_request";
  subject_template: string;
  body_variables: Record<string, string>;
  base_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormCheckinPoint {
  id: string;
  form_key: string;
  checkin_event_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormBatchCounter {
  form_key: string;
  counter: number;
  updated_at: string;
}

export interface FormImportJob {
  id: string;
  form_key: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  column_mapping?: Record<string, string>;
  validation_results?: any;
  total_rows?: number;
  valid_rows?: number;
  error_rows?: number;
  imported_rows?: number;
  failed_rows?: number;
  created_by: string;
  created_at: string;
  completed_at?: string;
}

export interface FormImportItem {
  id: string;
  job_id: string;
  row_number: number;
  raw_data: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  registration_id?: string;
  error_message?: string;
  created_at: string;
}

export interface FormCheckin {
  id: string;
  registration_id: string;
  form_key: string;
  tracking_id: string;
  checkin_point: string;
  checked_in_by: string;
  checked_in_at: string;
  meta: Record<string, any>;
}

// Unified view types for admin dashboard
export interface UnifiedRegistration {
  id: string;
  form_key: string;
  registration_id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  status: RegistrationStatus;
  price_applied?: number;
  currency?: string;
  dimension_status: DimensionStatus;
  badge_path?: string;
  created_at: string;
  updated_at: string;
  source_type: "multi-form" | "legacy";
}

// Service interfaces
export interface FormTypeService {
  create(
    formType: Omit<FormType, "id" | "created_at" | "updated_at">,
  ): Promise<FormType>;
  getById(id: string): Promise<FormType | null>;
  getByFormKey(formKey: string): Promise<FormType | null>;
  update(id: string, updates: Partial<FormType>): Promise<FormType>;
  delete(id: string): Promise<void>;
  list(active?: boolean): Promise<FormType[]>;
}

export interface FormRegistrationService {
  create(
    registration: Omit<FormRegistration, "id" | "created_at" | "updated_at">,
  ): Promise<FormRegistration>;
  getById(id: string): Promise<FormRegistration | null>;
  getByTrackingId(trackingId: string): Promise<FormRegistration | null>;
  update(
    id: string,
    updates: Partial<FormRegistration>,
  ): Promise<FormRegistration>;
  delete(id: string): Promise<void>;
  listByFormKey(
    formKey: string,
    status?: RegistrationStatus,
  ): Promise<FormRegistration[]>;
  listUnified(filters?: {
    form_key?: string;
    status?: RegistrationStatus;
    source_type?: "multi-form" | "legacy";
  }): Promise<UnifiedRegistration[]>;
}

export interface FormPricingService {
  calculatePrice(formKey: string, data: any): Promise<PricingData>;
  getConfig(formKey: string): Promise<FormPricingConfig | null>;
  updateConfig(
    formKey: string,
    config: Partial<FormPricingConfig>,
  ): Promise<FormPricingConfig>;
}

export interface FormTrackingIdService {
  generateTrackingId(
    formKey: string,
    payload?: any,
  ): Promise<{ tracking_id: string; sequence_number: number }>;
  generateBatchTrackingId(
    formKey: string,
    payload?: any,
  ): Promise<{ tracking_id: string; sequence_number: number }>;
}

export interface FormEmailService {
  getTemplates(formKey: string): Promise<FormEmailTemplate[]>;
  updateTemplate(
    formKey: string,
    templateType: string,
    template: Partial<FormEmailTemplate>,
  ): Promise<FormEmailTemplate>;
  sendEmail(
    formKey: string,
    templateType: string,
    registration: FormRegistration,
    variables?: Record<string, string>,
  ): Promise<boolean>;
}

export interface FormApprovalService {
  getApprovalDimensions(formKey: string): Promise<string[]>;
  markDimensionPass(
    formKey: string,
    registrationId: string,
    dimension: string,
    adminEmail: string,
  ): Promise<void>;
  approve(
    formKey: string,
    registrationId: string,
    adminEmail: string,
  ): Promise<void>;
  reject(
    formKey: string,
    registrationId: string,
    reason: string,
    adminEmail: string,
  ): Promise<void>;
}

export interface FormBadgeService {
  generateBadge(
    formKey: string,
    registration: FormRegistration,
  ): Promise<string>;
  getBadgeTemplate(formKey: string): Promise<BadgeTemplate | null>;
  updateBadgeTemplate(formKey: string, template: BadgeTemplate): Promise<void>;
}

export interface FormCheckinService {
  getCheckinPoints(formKey: string): Promise<FormCheckinPoint[]>;
  addCheckinPoint(
    formKey: string,
    checkinEventId: string,
  ): Promise<FormCheckinPoint>;
  removeCheckinPoint(formKey: string, checkinEventId: string): Promise<void>;
  processCheckin(
    formKey: string,
    trackingId: string,
    checkinPoint: string,
    checkedInBy: string,
  ): Promise<FormCheckin>;
}

export interface FormImportService {
  createJob(
    formKey: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    createdBy: string,
  ): Promise<FormImportJob>;
  processJob(jobId: string): Promise<void>;
  getJobStatus(jobId: string): Promise<FormImportJob>;
  getJobItems(jobId: string): Promise<FormImportItem[]>;
}
