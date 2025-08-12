import { eventBus } from './eventBus';
import { EventFactory } from './eventFactory';
import { RegistrationEvent, EventHandlerResult } from './types';

/**
 * Main event service for the registration system
 * Provides a clean API for emitting domain events
 */
export class EventService {
  /**
   * Emit a registration submitted event
   */
  static async emitRegistrationSubmitted(
    registration: any,
    adminEmail?: string,
    requestId?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createRegistrationSubmitted(registration, adminEmail);
    
    // If requestId is provided, set it in the event metadata for correlation
    if (requestId) {
      event.metadata = { ...event.metadata, requestId };
    }
    
    return await this.emitEvent(event);
  }

  /**
   * Emit a registration batch upserted event
   */
  static async emitRegistrationBatchUpserted(
    registrations: any[],
    adminEmail: string,
    updatedCount: number
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createRegistrationBatchUpserted(registrations, adminEmail, updatedCount);
    return await this.emitEvent(event);
  }

  /**
   * Emit an admin request update event
   */
  static async emitAdminRequestUpdate(
    registration: any,
    adminEmail: string,
    reason?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createAdminRequestUpdate(registration, adminEmail, reason);
    return await this.emitEvent(event);
  }

  /**
   * Emit an admin approved event
   */
  static async emitAdminApproved(
    registration: any,
    adminEmail: string,
    reason?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createAdminApproved(registration, adminEmail, reason);
    return await this.emitEvent(event);
  }

  /**
   * Emit an admin rejected event
   */
  static async emitAdminRejected(
    registration: any,
    adminEmail: string,
    reason?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createAdminRejected(registration, adminEmail, reason);
    return await this.emitEvent(event);
  }

  /**
   * Emit a document re-uploaded event
   */
  static async emitDocumentReuploaded(
    registration: any,
    documentType: string,
    userId?: string,
    adminEmail?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createDocumentReuploaded(registration, documentType, userId, adminEmail);
    return await this.emitEvent(event);
  }

  /**
   * Emit a status changed event
   */
  static async emitStatusChanged(
    registration: any,
    beforeStatus: string,
    afterStatus: string,
    reason?: string,
    actorRole: 'user' | 'admin' | 'system' = 'system',
    adminEmail?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createStatusChanged(registration, beforeStatus, afterStatus, reason, actorRole, adminEmail);
    return await this.emitEvent(event);
  }

  /**
   * Emit a login submitted event
   */
  static async emitLoginSubmitted(
    email: string,
    userId?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createLoginSubmitted(email, userId);
    return await this.emitEvent(event);
  }

  /**
   * Emit a login succeeded event
   */
  static async emitLoginSucceeded(
    email: string,
    userId: string,
    adminEmail?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createLoginSucceeded(email, userId, adminEmail);
    return await this.emitEvent(event);
  }

  /**
   * Emit a custom event (for advanced use cases)
   */
  static async emitEvent(event: RegistrationEvent): Promise<EventHandlerResult[]> {
    // Validate the event before emitting
    if (!EventFactory.validateEvent(event)) {
      throw new Error(`Invalid event structure: ${event.type}`);
    }

    console.log(`Emitting event: ${event.type} (${event.id})`);
    
    try {
      const results = await eventBus.emit(event);
      
      // Log results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      console.log(`Event ${event.type} processed: ${successCount} successful, ${failureCount} failed`);
      
      if (failureCount > 0) {
        console.warn('Some event handlers failed:', results.filter(r => !r.success));
      }
      
      return results;
    } catch (error) {
      console.error(`Failed to emit event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Get event bus statistics
   */
  static getStats() {
    return eventBus.getStats();
  }
}
