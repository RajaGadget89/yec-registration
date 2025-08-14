import { randomUUID } from 'crypto';
import { 
  RegistrationEvent,
  BatchRegistrationEvent,
  AutoRejectSweepEvent
} from './types';
import { Registration } from '../../types/database';

/**
 * Factory for creating domain events
 * Ensures consistent event structure and validation
 */
export class EventFactory {
  /**
   * Create a registration submitted event
   */
  static createRegistrationSubmitted(
    registration: Registration,
    priceApplied?: number,
    selectedPackage?: string
  ): RegistrationEvent {
    return {
      id: randomUUID(),
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

  /**
   * Create a registration batch upserted event
   */
  static createRegistrationBatchUpserted(
    registrations: Registration[],
    adminEmail?: string
  ): BatchRegistrationEvent {
    return {
      id: randomUUID(),
      type: 'registration.batch_upserted',
      payload: {
        registrations,
        admin_email: adminEmail,
      },
      timestamp: new Date().toISOString(),
      correlation_id: `batch_${Date.now()}`,
    };
  }

  /**
   * Create an admin request update event
   */
  static createAdminRequestUpdate(
    registration: Registration,
    adminEmail: string,
    track: 'payment' | 'profile' | 'tcc',
    reason?: string
  ): RegistrationEvent {
    return {
      id: randomUUID(),
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

  /**
   * Create an admin approved event
   */
  static createAdminApproved(
    registration: Registration,
    adminEmail: string
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: 'admin.approved',
      payload: {
        registration,
        admin_email: adminEmail,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create an admin rejected event
   */
  static createAdminRejected(
    registration: Registration,
    adminEmail: string,
    reason?: string
  ): RegistrationEvent {
    return {
      id: randomUUID(),
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

  /**
   * Create a document re-uploaded event
   */
  static createDocumentReuploaded(
    registration: Registration
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: 'document.reuploaded',
      payload: {
        registration,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create an admin review track updated event
   */
  static createAdminReviewTrackUpdated(
    registration: Registration,
    adminEmail: string,
    track: 'payment' | 'profile' | 'tcc',
    trackStatus: 'pending' | 'needs_update' | 'passed' | 'rejected'
  ): RegistrationEvent {
    return {
      id: randomUUID(),
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

  /**
   * Create an auto-reject sweep completed event
   */
  static createAutoRejectSweepCompleted(rejectedRegistrations: Array<{
    registration_id: string;
    reason: 'deadline_missed' | 'ineligible_rule_match';
    email: string;
    first_name: string;
    last_name: string;
  }>): AutoRejectSweepEvent {
    return {
      id: randomUUID(),
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
