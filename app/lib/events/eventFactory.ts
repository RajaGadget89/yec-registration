import { randomUUID } from 'crypto';
import { 
  RegistrationEvent, 
  RegistrationSubmittedEvent,
  RegistrationBatchUpsertedEvent,
  AdminRequestUpdateEvent,
  AdminApprovedEvent,
  AdminRejectedEvent,
  DocumentReuploadedEvent,
  StatusChangedEvent,
  LoginSubmittedEvent,
  LoginSucceededEvent,
  RegistrationSubmittedPayload,
  RegistrationBatchUpsertedPayload,
  AdminActionPayload,
  DocumentReuploadedPayload,
  StatusChangedPayload,
  LoginSubmittedPayload,
  LoginSucceededPayload
} from './types';

/**
 * Factory for creating domain events
 * Ensures consistent event structure and validation
 */
export class EventFactory {
  /**
   * Create a registration submitted event
   */
  static createRegistrationSubmitted(
    registration: any,
    adminEmail?: string
  ): RegistrationSubmittedEvent {
    return {
      id: randomUUID(),
      type: 'registration.submitted',
      payload: {
        registration,
        adminEmail
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'registration-api',
        version: '1.0'
      }
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
      id: randomUUID(),
      type: 'registration.batch_upserted',
      payload: {
        registrations,
        adminEmail,
        updatedCount
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'admin-api',
        version: '1.0',
        batchSize: registrations.length
      }
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
      id: randomUUID(),
      type: 'admin.request_update',
      payload: {
        registration,
        adminEmail,
        reason
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'admin-api',
        version: '1.0',
        action: 'sendback'
      }
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
      id: randomUUID(),
      type: 'admin.approved',
      payload: {
        registration,
        adminEmail,
        reason
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'admin-api',
        version: '1.0',
        action: 'approve'
      }
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
      id: randomUUID(),
      type: 'admin.rejected',
      payload: {
        registration,
        adminEmail,
        reason
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'admin-api',
        version: '1.0',
        action: 'reject'
      }
    };
  }

  /**
   * Create a document re-uploaded event
   */
  static createDocumentReuploaded(
    registration: any,
    documentType: string,
    userId?: string,
    adminEmail?: string
  ): DocumentReuploadedEvent {
    return {
      id: randomUUID(),
      type: 'document.reuploaded',
      payload: {
        registration,
        documentType,
        userId,
        adminEmail
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'registration-api',
        version: '1.0',
        documentType
      }
    };
  }

  /**
   * Create a status changed event
   */
  static createStatusChanged(
    registration: any,
    beforeStatus: string,
    afterStatus: string,
    reason?: string,
    actorRole: 'user' | 'admin' | 'system' = 'system',
    adminEmail?: string
  ): StatusChangedEvent {
    return {
      id: randomUUID(),
      type: 'status.changed',
      payload: {
        registration,
        beforeStatus,
        afterStatus,
        reason,
        actorRole,
        adminEmail
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'system',
        version: '1.0',
        actorRole
      }
    };
  }

  /**
   * Create a login submitted event
   */
  static createLoginSubmitted(
    email: string,
    userId?: string
  ): LoginSubmittedEvent {
    return {
      id: randomUUID(),
      type: 'login.submitted',
      payload: {
        email,
        userId
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'auth-api',
        version: '1.0'
      }
    };
  }

  /**
   * Create a login succeeded event
   */
  static createLoginSucceeded(
    email: string,
    userId: string,
    adminEmail?: string
  ): LoginSucceededEvent {
    return {
      id: randomUUID(),
      type: 'login.succeeded',
      payload: {
        email,
        userId,
        adminEmail
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'auth-api',
        version: '1.0'
      }
    };
  }

  /**
   * Validate event structure
   */
  static validateEvent(event: RegistrationEvent): boolean {
    // Basic validation
    if (!event.id || !event.type || !event.payload || !event.timestamp) {
      return false;
    }

    // Type-specific validation
    switch (event.type) {
      case 'registration.submitted':
        return this.validateRegistrationSubmittedPayload(event.payload as RegistrationSubmittedPayload);
      case 'registration.batch_upserted':
        return this.validateRegistrationBatchUpsertedPayload(event.payload as RegistrationBatchUpsertedPayload);
      case 'admin.request_update':
      case 'admin.approved':
      case 'admin.rejected':
        return this.validateAdminActionPayload(event.payload as AdminActionPayload);
      case 'document.reuploaded':
        return this.validateDocumentReuploadedPayload(event.payload as DocumentReuploadedPayload);
      case 'status.changed':
        return this.validateStatusChangedPayload(event.payload as StatusChangedPayload);
      case 'login.submitted':
        return this.validateLoginSubmittedPayload(event.payload as LoginSubmittedPayload);
      case 'login.succeeded':
        return this.validateLoginSucceededPayload(event.payload as LoginSucceededPayload);
      default:
        return false;
    }
  }

  private static validateRegistrationSubmittedPayload(payload: RegistrationSubmittedPayload): boolean {
    return !!(payload.registration && payload.registration.registration_id);
  }

  private static validateRegistrationBatchUpsertedPayload(payload: RegistrationBatchUpsertedPayload): boolean {
    return !!(payload.registrations && Array.isArray(payload.registrations) && payload.adminEmail && typeof payload.updatedCount === 'number');
  }

  private static validateAdminActionPayload(payload: AdminActionPayload): boolean {
    return !!(payload.registration && payload.registration.registration_id && payload.adminEmail);
  }

  private static validateDocumentReuploadedPayload(payload: DocumentReuploadedPayload): boolean {
    return !!(payload.registration && payload.registration.registration_id && payload.documentType);
  }

  private static validateStatusChangedPayload(payload: StatusChangedPayload): boolean {
    return !!(payload.registration && payload.registration.registration_id && 
              payload.beforeStatus && payload.afterStatus && payload.actorRole);
  }

  private static validateLoginSubmittedPayload(payload: LoginSubmittedPayload): boolean {
    return !!(payload.email && payload.email.includes('@'));
  }

  private static validateLoginSucceededPayload(payload: LoginSucceededPayload): boolean {
    return !!(payload.email && payload.email.includes('@') && payload.userId);
  }
}
