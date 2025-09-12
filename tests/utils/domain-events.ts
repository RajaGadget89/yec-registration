/**
 * Domain Events Helper - Read-only utilities for querying domain events
 * 
 * This helper provides read-only access to domain events through existing
 * diagnostic endpoints. It does not modify any server state.
 * Enhanced to work with correlation IDs from session adaptors.
 */

export type EventQuery = {
  correlationId: string; // required, use session tracking helper to derive
  eventName?: string;
  headers?: Record<string, string>; // optional headers for authenticated requests
};

export type DomainEvent = {
  id: string;
  event_name: string;
  created_at?: string;
  payload?: Record<string, unknown>;
  correlation_id: string;
};

/**
 * List domain events matching the query criteria
 * @param query Query parameters to filter events
 * @returns Promise resolving to array of matching domain events
 */
export async function listEvents(query: EventQuery): Promise<DomainEvent[]> {
  // Use Playwright baseURL or fallback to localhost for test environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  process.env.PLAYWRIGHT_BASE_URL || 
                  process.env.APP_BASE_URL || 
                  'http://localhost:8080';

  if (!query.correlationId) {
    throw new Error('correlationId is required for domain event queries');
  }

  try {
    // Use the existing diagnostic endpoint for audit queries
    const url = new URL('/api/diag/audit-query', baseUrl);
    url.searchParams.set('action', query.eventName || 'registration.submitted');
    url.searchParams.set('resource_id', query.correlationId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Test-Helpers-Enabled': '1',
        'Content-Type': 'application/json',
        'X-Correlation-ID': query.correlationId,
        ...(query.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch domain events: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.eventError) {
      throw new Error(`Domain events query error: ${data.eventError}`);
    }

    // Transform audit event logs to domain events format
    const events: DomainEvent[] = (data.events || []).map((event: any) => ({
      id: event.id?.toString() || 'unknown',
      event_name: event.action || 'unknown',
      created_at: event.occurred_at_utc || event.created_at,
      payload: event.meta || {},
      correlation_id: event.correlation_id || query.correlationId,
    }));

    // Apply client-side filtering by correlation ID
    const filteredEvents = events.filter(event => 
      event.correlation_id === query.correlationId
    );

    return filteredEvents;
  } catch (error) {
    throw new Error(`Domain events query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Expect to find a sequence of events in the specified order
 * @param query Query parameters including correlationId and namesInOrder
 * @returns Promise resolving to array of matching domain events
 * @throws Error if the expected sequence is not found
 */
export async function expectEventSequence(query: { correlationId: string; namesInOrder: string[] }): Promise<DomainEvent[]> {
  const events = await listEvents({ correlationId: query.correlationId });
  
  if (events.length === 0) {
    throw new Error(
      `No events found for correlation ID ${query.correlationId}. ` +
      `Expected sequence: ${query.namesInOrder.join(' -> ')}`
    );
  }

  // Check if the expected sequence exists in the events
  const eventNames = events.map(e => e.event_name);
  const expectedSequence = query.namesInOrder;
  
  // Simple sequence validation - check if all expected events exist
  const missingEvents = expectedSequence.filter(expected => 
    !eventNames.includes(expected)
  );
  
  if (missingEvents.length > 0) {
    throw new Error(
      `Expected event sequence not found for correlation ID ${query.correlationId}. ` +
      `Missing events: ${missingEvents.join(', ')}. ` +
      `Found events: ${eventNames.join(', ')}`
    );
  }
  
  return events;
}

/**
 * List domain events using correlation ID from session adaptor
 * @param correlationId Correlation ID from session adaptor
 * @param eventName Optional event name filter
 * @param headers Optional headers for authenticated requests
 * @returns Promise resolving to array of matching domain events
 */
export async function listEventsWithCorrelation(
  correlationId: string, 
  eventName?: string, 
  headers?: Record<string, string>
): Promise<DomainEvent[]> {
  return listEvents({ correlationId, eventName, headers });
}