import { Registration } from "../../types/database";

/**
 * Domain event types for registration lifecycle
 */
export type RegistrationEventType =
  | "registration.submitted"
  | "registration.batch_upserted"
  // Payment slip intelligence events (scaffold for OCR-based audit)
  | "payment.slip_uploaded"
  | "payment.slip_analyze_requested"
  | "payment.slip_analyzed"
  | "payment.amount_match"
  | "payment.amount_mismatch"
  | "admin.request_update"
  | "admin.mark_pass"
  | "admin.approved"
  | "admin.rejected"
  | "user.resubmitted"
  | "document.reuploaded"
  | "status.changed"
  | "login.submitted"
  | "login.succeeded"
  | "admin.review_track_updated"
  | "auto_reject.sweep_completed"
  | "email.retry_requested"
  | "admin.invitation.created"
  | "admin.invitation.accepted"
  | "admin.invitation.resent"
  | "admin.invitation.cancelled"
  | "admin.invitation.revoked"
  | "admin.role.assigned"
  | "admin.role.revoked"
  | "admin.suspended"
  | "admin.activated";

/**
 * Base event interface
 */
export interface DomainEvent<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  correlation_id?: string;
}

/**
 * Registration event payload
 */
export interface RegistrationEventPayload {
  registration: Registration;
  reason?: string;
  dimension?: "payment" | "profile" | "tcc";
  dimension_status?: "pending" | "needs_update" | "passed" | "rejected";
  track?: "payment" | "profile" | "tcc";
  track_status?: "pending" | "needs_update" | "passed" | "rejected";
  notes?: string;
  admin_email?: string;
  price_applied?: number;
  selected_package?: string;
  updates?: Record<string, any>;
  token_id?: string; // Token ID for secure deep-link resolution
}

/**
 * Payment slip analysis payloads
 */
export interface PaymentSlipUploadedPayload {
  application_id: string;
  file_path: string; // private storage path
  file_hash?: string;
}

export interface PaymentSlipAnalyzeRequestedPayload {
  application_id: string;
  file_path: string;
  file_hash?: string;
  request_id?: string;
}

export interface PaymentSlipAnalyzedPayload {
  application_id: string;
  file_path: string;
  amount_detected: number | null;
  currency?: string; // default THB
  confidence: number; // 0..1
  candidates?: Array<{ amount: number; confidence: number; label?: string }>;
  analyzer_version?: string;
}

export interface PaymentAmountComparePayload {
  application_id: string;
  expected_amount: number;
  detected_amount: number;
  delta: number; // detected - expected
  confidence: number;
}

/**
 * Admin management event payload
 */
export interface AdminEventPayload {
  invitation_id?: string;
  email?: string;
  invited_by?: string;
  admin_id?: string;
  role?: "admin" | "super_admin";
  status?: "active" | "suspended";
  metadata?: Record<string, any>;
}

/**
 * Registration event
 */
export interface RegistrationEvent
  extends DomainEvent<RegistrationEventPayload> {
  type: RegistrationEventType;
}

/**
 * Batch registration event payload
 */
export interface BatchRegistrationEventPayload {
  registrations: Registration[];
  admin_email?: string;
}

/**
 * Batch registration event
 */
export interface BatchRegistrationEvent
  extends DomainEvent<BatchRegistrationEventPayload> {
  type: "registration.batch_upserted";
}

/**
 * Auto-reject sweep event payload
 */
export interface AutoRejectSweepEventPayload {
  rejected_registrations: Array<{
    registration_id: string;
    reason: "deadline_missed" | "ineligible_rule_match";
    email: string;
    first_name: string;
    last_name: string;
  }>;
  sweep_timestamp: string;
}

/**
 * Auto-reject sweep event
 */
export interface AutoRejectSweepEvent
  extends DomainEvent<AutoRejectSweepEventPayload> {
  type: "auto_reject.sweep_completed";
}

/**
 * Email retry event payload
 */
export interface EmailRetryEventPayload {
  email_ids: string[];
  admin_email: string;
  reason?: string;
}

/**
 * Email retry event
 */
export interface EmailRetryEvent extends DomainEvent<EmailRetryEventPayload> {
  type: "email.retry_requested";
}

/**
 * Admin management event
 */
export interface AdminEvent extends DomainEvent<AdminEventPayload> {
  type:
    | "admin.invitation.created"
    | "admin.invitation.accepted"
    | "admin.invitation.revoked"
    | "admin.invitation.resent"
    | "admin.invitation.cancelled"
    | "admin.role.assigned"
    | "admin.role.revoked"
    | "admin.suspended"
    | "admin.activated";
}

/**
 * Event handler interface
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Event handler result
 */
export interface EventHandlerResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Status transition rules based on Phase 1 Authoritative Model
 */
export const STATUS_TRANSITIONS: Record<RegistrationEventType, string> = {
  "registration.submitted": "waiting_for_review",
  "registration.batch_upserted": "waiting_for_review",
  // Payment intelligence events do not change registration status
  "payment.slip_uploaded": "system",
  "payment.slip_analyze_requested": "system",
  "payment.slip_analyzed": "system",
  "payment.amount_match": "system",
  "payment.amount_mismatch": "system",
  "admin.request_update": "system", // Handled dynamically based on track
  "admin.mark_pass": "system", // Handled by trigger function
  "admin.approved": "approved",
  "admin.rejected": "rejected",
  "user.resubmitted": "system", // Handled by trigger function
  "document.reuploaded": "waiting_for_review", // After re-upload, back to review
  "status.changed": "system", // This is handled dynamically
  "login.submitted": "system", // Login events don't change status
  "login.succeeded": "system", // Login events don't change status
  "admin.review_track_updated": "system", // Handled by trigger function
  "auto_reject.sweep_completed": "system", // Handled by sweep function
  "email.retry_requested": "system", // Email retry doesn't change registration status
  "admin.invitation.created": "system", // Admin events don't change registration status
  "admin.invitation.accepted": "system", // Admin events don't change registration status
  "admin.invitation.resent": "system", // Admin events don't change registration status
  "admin.invitation.cancelled": "system", // Admin events don't change registration status
  "admin.invitation.revoked": "system", // Admin events don't change registration status
  "admin.role.assigned": "system", // Admin events don't change registration status
  "admin.role.revoked": "system", // Admin events don't change registration status
  "admin.suspended": "system", // Admin events don't change registration status
  "admin.activated": "system", // Admin events don't change registration status
};

/**
 * Track-specific status transitions for admin review updates
 */
export const TRACK_STATUS_TRANSITIONS: Record<string, string> = {
  "payment.needs_update": "waiting_for_update_payment",
  "profile.needs_update": "waiting_for_update_info",
  "tcc.needs_update": "waiting_for_update_tcc",
  "payment.passed": "system", // Check if all tracks passed
  "profile.passed": "system", // Check if all tracks passed
  "tcc.passed": "system", // Check if all tracks passed
  "payment.rejected": "rejected",
  "profile.rejected": "rejected",
  "tcc.rejected": "rejected",
};

/**
 * Email template mapping for Phase 1
 */
export const EMAIL_TEMPLATES: Record<RegistrationEventType, string> = {
  "registration.submitted": "tracking",
  // No emails for payment slip intelligence in v1
  "payment.slip_uploaded": "system",
  "payment.slip_analyze_requested": "system",
  "payment.slip_analyzed": "system",
  "payment.amount_match": "system",
  "payment.amount_mismatch": "system",

  "admin.request_update": "request_update", // Will be determined by track
  "admin.mark_pass": "system", // No email for mark pass
  "admin.approved": "approval_badge",
  "admin.rejected": "rejection",
  "user.resubmitted": "system", // No email for resubmission

  "document.reuploaded": "tracking",
  "status.changed": "system", // Handled dynamically
  "login.submitted": "system", // No email for login
  "login.succeeded": "system", // No email for login
  "registration.batch_upserted": "tracking",

  "admin.review_track_updated": "system", // No email for track updates
  "auto_reject.sweep_completed": "rejection", // Auto-rejection email
  "email.retry_requested": "system", // No email template for retry events
  "admin.invitation.created": "admin_invite", // Admin invitation email
  "admin.invitation.accepted": "system", // No email for acceptance
  "admin.invitation.resent": "admin_invite", // Admin invitation email (resent)
  "admin.invitation.cancelled": "system", // No email for cancellation
  "admin.invitation.revoked": "system", // No email for revocation
  "admin.role.assigned": "system", // No email for role assignment
  "admin.role.revoked": "system", // No email for role revocation
  "admin.suspended": "system", // No email for suspension
  "admin.activated": "system", // No email for activation
};

/**
 * Track-specific email templates
 */
export const TRACK_EMAIL_TEMPLATES: Record<string, string> = {
  "payment.needs_update": "request_update_payment",
  "profile.needs_update": "request_update_info",
  "tcc.needs_update": "request_update_tcc",
};
