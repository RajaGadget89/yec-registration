import { 
  RegistrationEvent, 
  RegistrationSubmittedEvent,
  RegistrationBatchUpsertedEvent,
  AdminRequestUpdateEvent,
  AdminApprovedEvent,
  AdminRejectedEvent
} from './types';
import { getThailandTimeISOString } from '../timezoneUtils';

/**
 * Factory for creating domain events with proper formatting
 */
export class EventFactory {
  /**
   * Generate a unique event ID
   */
  private static generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a registration submitted event
   */
  static createRegistrationSubmitted(
    registration: any,
    adminEmail?: string
  ): RegistrationSubmittedEvent {
    return {
      id: this.generateEventId(),
      type: 'registration.submitted',
      payload: {
        registration,
        adminEmail,
      },
      timestamp: getThailandTimeISOString(),
    };
  }

  /**
   * Create a registration batch upserted event
   */
  static createRegistrationBatchUpserted(
    registrations: any[],
    adminEmail: string,
    updatedCount: number
  ): RegistrationBatchUpsertedEvent {
    return {
      id: this.generateEventId(),
      type: 'registration.batch_upserted',
      payload: {
        registrations,
        adminEmail,
        updatedCount,
      },
      timestamp: getThailandTimeISOString(),
    };
  }

  /**
   * Create an admin request update event
   */
  static createAdminRequestUpdate(
    registration: any,
    adminEmail: string,
    reason?: string
  ): AdminRequestUpdateEvent {
    return {
      id: this.generateEventId(),
      type: 'admin.request_update',
      payload: {
        registration,
        adminEmail,
        reason,
      },
      timestamp: getThailandTimeISOString(),
    };
  }

  /**
   * Create an admin approved event
   */
  static createAdminApproved(
    registration: any,
    adminEmail: string,
    reason?: string
  ): AdminApprovedEvent {
    return {
      id: this.generateEventId(),
      type: 'admin.approved',
      payload: {
        registration,
        adminEmail,
        reason,
      },
      timestamp: getThailandTimeISOString(),
    };
  }

  /**
   * Create an admin rejected event
   */
  static createAdminRejected(
    registration: any,
    adminEmail: string,
    reason?: string
  ): AdminRejectedEvent {
    return {
      id: this.generateEventId(),
      type: 'admin.rejected',
      payload: {
        registration,
        adminEmail,
        reason,
      },
      timestamp: getThailandTimeISOString(),
    };
  }

  /**
   * Validate that an event has all required fields
   */
  static validateEvent(event: RegistrationEvent): boolean {
    if (!event.id || !event.type || !event.payload || !event.timestamp) {
      return false;
    }

    // Validate payload based on event type
    switch (event.type) {
      case 'registration.submitted':
        return !!(event.payload.registration);
      
      case 'registration.batch_upserted':
        return !!(event.payload.registrations && 
                  event.payload.adminEmail && 
                  typeof event.payload.updatedCount === 'number');
      
      case 'admin.request_update':
      case 'admin.approved':
      case 'admin.rejected':
        return !!(event.payload.registration && event.payload.adminEmail);
      
      default:
        return false;
    }
  }
}
