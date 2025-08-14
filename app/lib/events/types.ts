import { Registration } from '../../types/database';

/**
 * Domain event types for registration lifecycle
 */
export type RegistrationEventType = 
  | 'registration.submitted'
  | 'registration.batch_upserted'
  | 'admin.request_update'
  | 'admin.mark_pass'
  | 'admin.approved'
  | 'admin.rejected'
  | 'user.resubmitted'
  | 'document.reuploaded'
  | 'status.changed'
  | 'login.submitted'
  | 'login.succeeded'
  | 'admin.review_track_updated'
  | 'auto_reject.sweep_completed';

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
  dimension?: 'payment' | 'profile' | 'tcc';
  dimension_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  track?: 'payment' | 'profile' | 'tcc';
  track_status?: 'pending' | 'needs_update' | 'passed' | 'rejected';
  notes?: string;
  admin_email?: string;
  price_applied?: number;
  selected_package?: string;
  updates?: Record<string, any>;
}

/**
 * Registration event
 */
export interface RegistrationEvent extends DomainEvent<RegistrationEventPayload> {
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
export interface BatchRegistrationEvent extends DomainEvent<BatchRegistrationEventPayload> {
  type: 'registration.batch_upserted';
}

/**
 * Auto-reject sweep event payload
 */
export interface AutoRejectSweepEventPayload {
  rejected_registrations: Array<{
    registration_id: string;
    reason: 'deadline_missed' | 'ineligible_rule_match';
    email: string;
    first_name: string;
    last_name: string;
  }>;
  sweep_timestamp: string;
}

/**
 * Auto-reject sweep event
 */
export interface AutoRejectSweepEvent extends DomainEvent<AutoRejectSweepEventPayload> {
  type: 'auto_reject.sweep_completed';
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
  'registration.submitted': 'waiting_for_review',
  'registration.batch_upserted': 'waiting_for_review',
  'admin.request_update': 'system', // Handled dynamically based on track
  'admin.mark_pass': 'system', // Handled by trigger function
  'admin.approved': 'approved',
  'admin.rejected': 'rejected',
  'user.resubmitted': 'system', // Handled by trigger function
  'document.reuploaded': 'waiting_for_review', // After re-upload, back to review
  'status.changed': 'system', // This is handled dynamically
  'login.submitted': 'system', // Login events don't change status
  'login.succeeded': 'system', // Login events don't change status
  'admin.review_track_updated': 'system', // Handled by trigger function
  'auto_reject.sweep_completed': 'system', // Handled by sweep function
};

/**
 * Track-specific status transitions for admin review updates
 */
export const TRACK_STATUS_TRANSITIONS: Record<string, string> = {
  'payment.needs_update': 'waiting_for_update_payment',
  'profile.needs_update': 'waiting_for_update_info',
  'tcc.needs_update': 'waiting_for_update_tcc',
  'payment.passed': 'system', // Check if all tracks passed
  'profile.passed': 'system', // Check if all tracks passed
  'tcc.passed': 'system', // Check if all tracks passed
  'payment.rejected': 'rejected',
  'profile.rejected': 'rejected',
  'tcc.rejected': 'rejected',
};

/**
 * Email template mapping for Phase 1
 */
export const EMAIL_TEMPLATES: Record<RegistrationEventType, string> = {
  'registration.submitted': 'tracking_code',
  'admin.request_update': 'request_update', // Will be determined by track
  'admin.mark_pass': 'system', // No email for mark pass
  'admin.approved': 'approval_badge',
  'admin.rejected': 'rejection',
  'user.resubmitted': 'system', // No email for resubmission
  'document.reuploaded': 'tracking_code',
  'status.changed': 'system', // Handled dynamically
  'login.submitted': 'system', // No email for login
  'login.succeeded': 'system', // No email for login
  'registration.batch_upserted': 'tracking_code',
  'admin.review_track_updated': 'system', // No email for track updates
  'auto_reject.sweep_completed': 'rejection', // Auto-rejection email
};

/**
 * Track-specific email templates
 */
export const TRACK_EMAIL_TEMPLATES: Record<string, string> = {
  'payment.needs_update': 'request_update_payment',
  'profile.needs_update': 'request_update_info',
  'tcc.needs_update': 'request_update_tcc',
};

/**
 * Event factory for creating events
 */
export class EventFactory {
  static createRegistrationSubmitted(registration: Registration, priceApplied?: number, selectedPackage?: string): RegistrationEvent {
    return {
      id: crypto.randomUUID(),
      type: 'registration.submitted',
      payload: {
        registration,
        price_applied: priceApplied,
        selected_package: selectedPackage,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  static createAdminRequestUpdate(
    registration: Registration, 
    adminEmail: string, 
    track: 'payment' | 'profile' | 'tcc',
    reason?: string
  ): RegistrationEvent {
    return {
      id: crypto.randomUUID(),
      type: 'admin.request_update',
      payload: {
        registration,
        admin_email: adminEmail,
        track,
        reason,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  static createAdminApproved(registration: Registration, adminEmail: string): RegistrationEvent {
    return {
      id: crypto.randomUUID(),
      type: 'admin.approved',
      payload: {
        registration,
        admin_email: adminEmail,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  static createAdminRejected(registration: Registration, adminEmail: string, reason?: string): RegistrationEvent {
    return {
      id: crypto.randomUUID(),
      type: 'admin.rejected',
      payload: {
        registration,
        admin_email: adminEmail,
        reason,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  static createDocumentReuploaded(registration: Registration): RegistrationEvent {
    return {
      id: crypto.randomUUID(),
      type: 'document.reuploaded',
      payload: {
        registration,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  static createAdminReviewTrackUpdated(
    registration: Registration,
    adminEmail: string,
    track: 'payment' | 'profile' | 'tcc',
    trackStatus: 'pending' | 'needs_update' | 'passed' | 'rejected'
  ): RegistrationEvent {
    return {
      id: crypto.randomUUID(),
      type: 'admin.review_track_updated',
      payload: {
        registration,
        admin_email: adminEmail,
        track,
        track_status: trackStatus,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  static createAutoRejectSweepCompleted(rejectedRegistrations: Array<{
    registration_id: string;
    reason: 'deadline_missed' | 'ineligible_rule_match';
    email: string;
    first_name: string;
    last_name: string;
  }>): AutoRejectSweepEvent {
    return {
      id: crypto.randomUUID(),
      type: 'auto_reject.sweep_completed',
      payload: {
        rejected_registrations: rejectedRegistrations,
        sweep_timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      correlation_id: `sweep_${Date.now()}`,
    };
  }
}
