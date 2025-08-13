import { supabaseTestClient } from './supabaseTestClient';

export interface PollConfig {
  timeoutMs: number;
  intervalMs: number;
  maxRetries?: number;
  startTs?: Date; // Time window start for filtering
}

const DEFAULT_CONFIG: PollConfig = {
  timeoutMs: 30000, // 30 seconds
  intervalMs: 1000, // 1 second
  maxRetries: 3
};

/**
 * Add jitter to polling interval (50-150ms)
 */
function getJitteredInterval(baseInterval: number): number {
  const jitter = Math.random() * 100 + 50; // 50-150ms
  return baseInterval + jitter;
}

/**
 * Wait for audit logs to appear in Supabase
 * Uses polling with exponential backoff and time window filtering
 */
export async function waitForLogs(
  requestId: string,
  expectedAccessCount: number = 1,
  expectedEventCount: number = 0,
  config: Partial<PollConfig> = {}
): Promise<{ accessLogs: any[]; eventLogs: any[] }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  if (process.env.PLAYWRIGHT_TEST === '1') {
    console.debug(`[poll] Starting poll for request_id=${requestId}, tables: ['audit.access_log', 'audit.event_log']`);
  }

  while (Date.now() - startTime < finalConfig.timeoutMs) {
    try {
      const [accessLogs, eventLogs] = await Promise.all([
        supabaseTestClient.getAccessLogsByRequestId(requestId, finalConfig.startTs),
        supabaseTestClient.getEventLogsByCorrelationId(requestId, finalConfig.startTs)
      ]);

      // Enhanced logging for test environment
      if (process.env.PLAYWRIGHT_TEST === '1') {
        const accessActions = accessLogs.map(log => log.action);
        const eventActions = eventLogs.map(log => log.action);
        const eventActionSet = new Set(eventActions);
        console.debug(`[poll] access=${accessLogs.length} events=${eventLogs.length} actions=<Set([${Array.from(eventActionSet).join(', ')}])>`);
      }

      // Check if we have the expected number of logs
      if (accessLogs.length >= expectedAccessCount && eventLogs.length >= expectedEventCount) {
        if (process.env.PLAYWRIGHT_TEST === '1') {
          console.debug(`[poll] ✅ Found expected logs: ${accessLogs.length} access, ${eventLogs.length} events`);
        }
        return { accessLogs, eventLogs };
      }

      // Wait before next poll with jitter
      const jitteredInterval = getJitteredInterval(finalConfig.intervalMs);
      await new Promise(resolve => setTimeout(resolve, jitteredInterval));
    } catch (error) {
      console.error(`[poll] Error during polling:`, error);
      // Continue polling even if there's an error
      const jitteredInterval = getJitteredInterval(finalConfig.intervalMs);
      await new Promise(resolve => setTimeout(resolve, jitteredInterval));
    }
  }

  // Timeout reached
  const errorMessage = `Timeout waiting for audit logs. Expected: ${expectedAccessCount} access, ${expectedEventCount} events. Request ID: ${requestId}`;
  if (process.env.PLAYWRIGHT_TEST === '1') {
    console.error(`[poll] ❌ ${errorMessage}`);
  }
  throw new Error(errorMessage);
}

/**
 * Wait for specific events to appear
 */
export async function waitForSpecificEvents(
  requestId: string,
  expectedActions: Set<string>,
  config: Partial<PollConfig> = {}
): Promise<{ accessLogs: any[]; eventLogs: any[] }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  if (process.env.PLAYWRIGHT_TEST === '1') {
    console.debug(`[poll] Waiting for specific events: ${Array.from(expectedActions).join(', ')}`);
  }

  while (Date.now() - startTime < finalConfig.timeoutMs) {
    try {
      const [accessLogs, eventLogs] = await Promise.all([
        supabaseTestClient.getAccessLogsByRequestId(requestId, finalConfig.startTs),
        supabaseTestClient.getEventLogsByCorrelationId(requestId, finalConfig.startTs)
      ]);

      const foundActions = new Set(eventLogs.map(log => log.action));
      const missingActions = new Set([...expectedActions].filter(action => !foundActions.has(action)));

      if (missingActions.size === 0) {
        if (process.env.PLAYWRIGHT_TEST === '1') {
          console.debug(`[poll] ✅ Found all expected events: ${Array.from(expectedActions).join(', ')}`);
        }
        return { accessLogs, eventLogs };
      }

      if (process.env.PLAYWRIGHT_TEST === '1') {
        console.debug(`[poll] Waiting for: ${Array.from(missingActions).join(', ')}`);
      }
      const jitteredInterval = getJitteredInterval(finalConfig.intervalMs);
      await new Promise(resolve => setTimeout(resolve, jitteredInterval));
    } catch (error) {
      console.error(`[poll] Error during specific event polling:`, error);
      throw error;
    }
  }

  const errorMessage = `Timeout waiting for specific events: ${Array.from(expectedActions).join(', ')}`;
  if (process.env.PLAYWRIGHT_TEST === '1') {
    console.error(`[poll] ❌ ${errorMessage}`);
  }
  throw new Error(errorMessage);
}

/**
 * Verify audit log consistency
 */
export function verifyAuditLogConsistency(
  accessLogs: any[],
  eventLogs: any[],
  requestId: string
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check that all access logs have the correct request_id
  const invalidAccessLogs = accessLogs.filter(log => log.request_id !== requestId);
  if (invalidAccessLogs.length > 0) {
    issues.push(`Found ${invalidAccessLogs.length} access logs with incorrect request_id`);
  }

  // Check that all event logs have the correct correlation_id
  const invalidEventLogs = eventLogs.filter(log => log.correlation_id !== requestId);
  if (invalidEventLogs.length > 0) {
    issues.push(`Found ${invalidEventLogs.length} event logs with incorrect correlation_id`);
  }

  // Check that access logs have required fields
  const incompleteAccessLogs = accessLogs.filter(log => 
    !log.action || !log.resource || !log.request_id || !log.occurred_at_utc
  );
  if (incompleteAccessLogs.length > 0) {
    issues.push(`Found ${incompleteAccessLogs.length} access logs with missing required fields (audit.access_log)`);
  }

  // Check that event logs have required fields
  const incompleteEventLogs = eventLogs.filter(log => 
    !log.action || !log.resource || !log.correlation_id || !log.occurred_at_utc
  );
  if (incompleteEventLogs.length > 0) {
    issues.push(`Found ${incompleteEventLogs.length} event logs with missing required fields (audit.event_log)`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
