import { RegistrationEvent, EventHandler, EventHandlerResult } from './types';
import { StatusUpdateHandler } from './handlers/statusUpdateHandler';
import { EmailNotificationHandler } from './handlers/emailNotificationHandler';
import { TelegramNotificationHandler } from './handlers/telegramNotificationHandler';
import { AuditLogHandler } from './handlers/auditLogHandler';
import { AUTH_TRACE, AUTH_NO_EVENTS, getCallerInfo } from './trace';

/**
 * Event bus for handling domain events
 * Provides centralized event routing and handler management
 */
export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private processedEvents: Set<string> = new Set(); // For idempotency

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default handlers for all event types
   */
  private registerDefaultHandlers(): void {
    const statusHandler = new StatusUpdateHandler();
    const emailHandler = new EmailNotificationHandler();
    const telegramHandler = new TelegramNotificationHandler();
    const auditHandler = new AuditLogHandler();

    // Register handlers for all event types
    const eventTypes: RegistrationEvent['type'][] = [
      'registration.submitted',
      'registration.batch_upserted',
      'admin.request_update',
      'admin.approved',
      'admin.rejected',
    ];

    eventTypes.forEach(eventType => {
      this.registerHandler(eventType, statusHandler);
      this.registerHandler(eventType, emailHandler);
      this.registerHandler(eventType, telegramHandler);
      this.registerHandler(eventType, auditHandler);
    });
  }

  /**
   * Register a handler for a specific event type
   */
  registerHandler(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Emit an event and route it to all registered handlers
   */
  async emit(event: RegistrationEvent): Promise<EventHandlerResult[]> {
    const eventId = event.id;
    
    // Check for idempotency - if event was already processed, skip
    if (this.processedEvents.has(eventId)) {
      console.log(`Event ${eventId} already processed, skipping for idempotency`);
      return [];
    }

    // Auth debugging: Check if events should be disabled
    if (AUTH_NO_EVENTS) {
      console.log(`[auth-debug] events disabled for event ${event.type} (${eventId})`);
      return [];
    }

    const handlers = this.handlers.get(event.type) || [];
    const results: EventHandlerResult[] = [];

    // Auth tracing: Log event emission details
    if (AUTH_TRACE) {
      const caller = getCallerInfo();
      const payloadKeys = Object.keys(event.payload || {});
      console.log(`[auth-debug] emitting event: ${event.type} (${eventId})`);
      console.log(`[auth-debug]   caller: ${caller}`);
      console.log(`[auth-debug]   payload keys: [${payloadKeys.join(', ')}]`);
      console.log(`[auth-debug]   handlers: ${handlers.length}`);
    }

    console.log(`Emitting event ${event.type} to ${handlers.length} handlers`);

    // Process all handlers concurrently
    const handlerPromises = handlers.map(async (handler, index) => {
      try {
        const startTime = Date.now();
        await handler.handle(event);
        const duration = Date.now() - startTime;
        
        // Auth tracing: Log handler completion
        if (AUTH_TRACE) {
          console.log(`[auth-debug] handler ${index + 1}/${handlers.length} completed in ${duration}ms`);
        }
        
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Handler failed for event ${event.type}:`, error);
        
        // Auth tracing: Log handler failure
        if (AUTH_TRACE) {
          console.log(`[auth-debug] handler ${index + 1}/${handlers.length} failed: ${errorMessage}`);
        }
        
        return { success: false, error: errorMessage };
      }
    });

    // Wait for all handlers to complete
    const handlerResults = await Promise.allSettled(handlerPromises);
    
    // Process results
    handlerResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Handler rejected',
        });
      }
    });

    // Auth tracing: Log final results
    if (AUTH_TRACE) {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      console.log(`[auth-debug] event ${event.type} completed: ${successCount} success, ${failureCount} failed`);
    }

    // Mark event as processed for idempotency
    this.processedEvents.add(eventId);

    // Clean up old processed events (keep last 1000)
    if (this.processedEvents.size > 1000) {
      const eventsArray = Array.from(this.processedEvents);
      this.processedEvents = new Set(eventsArray.slice(-500));
    }

    return results;
  }

  /**
   * Get statistics about the event bus
   */
  getStats(): {
    registeredHandlers: number;
    processedEvents: number;
    eventTypes: string[];
  } {
    const registeredHandlers = Array.from(this.handlers.values())
      .reduce((total, handlers) => total + handlers.length, 0);
    
    return {
      registeredHandlers,
      processedEvents: this.processedEvents.size,
      eventTypes: Array.from(this.handlers.keys()),
    };
  }
}

// Export singleton instance
export const eventBus = new EventBus();
