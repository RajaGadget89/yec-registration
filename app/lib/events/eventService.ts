import { eventBus } from './eventBus';
import { EventFactory } from './eventFactory';
import { EventHandlerResult } from './types';

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
    priceApplied?: number,
    selectedPackage?: string,
    requestId?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createRegistrationSubmitted(registration, priceApplied, selectedPackage);
    
    // If requestId is provided, set it in the event correlation_id for correlation
    if (requestId) {
      event.correlation_id = requestId;
    }
    
    return await this.emitEvent(event);
  }

  /**
   * Emit a registration batch upserted event
   */
  static async emitRegistrationBatchUpserted(
    registrations: any[],
    adminEmail?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createRegistrationBatchUpserted(registrations, adminEmail);
    return await this.emitEvent(event);
  }

  /**
   * Emit an admin request update event
   */
  static async emitAdminRequestUpdate(
    registration: any,
    adminEmail: string,
    track: 'payment' | 'profile' | 'tcc',
    reason?: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createAdminRequestUpdate(registration, adminEmail, track, reason);
    return await this.emitEvent(event);
  }

  /**
   * Emit an admin approved event
   */
  static async emitAdminApproved(
    registration: any,
    adminEmail: string
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createAdminApproved(registration, adminEmail);
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
    registration: any
  ): Promise<EventHandlerResult[]> {
    const event = EventFactory.createDocumentReuploaded(registration);
    return await this.emitEvent(event);
  }

  // Note: StatusChanged, LoginSubmitted, and LoginSucceeded events are not supported in the new EventFactory
  // These methods have been removed as they are not part of the current event system

  /**
   * Emit a generic event
   */
  static async emit(event: any): Promise<EventHandlerResult[]> {
    return await this.emitEvent(event);
  }

  /**
   * Emit an event and return results
   */
  private static async emitEvent(event: any): Promise<EventHandlerResult[]> {
    try {
      console.log(`Emitting event: ${event.type}`, { 
        correlationId: event.correlation_id,
        resourceId: event.payload?.registration?.registration_id 
      });
      
      const results = await eventBus.emit(event);
      
      console.log(`Event ${event.type} processed successfully`, {
        resultsCount: results.length,
        correlationId: event.correlation_id
      });
      
      return results;
    } catch (error) {
      console.error(`Error emitting event ${event.type}:`, error);
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
