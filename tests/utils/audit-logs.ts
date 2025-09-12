/**
 * Audit Logs Helper - Read-only utilities for querying audit logs
 * 
 * This helper provides read-only access to audit logs through existing
 * diagnostic endpoints. It does not modify any server state.
 */

export type AuditQuery = {
  correlationId?: string;
  action?: string; // e.g., registration.create, payment.validate, tcc.bind
  actorEmail?: string;
};

export type AuditLog = {
  id: string;
  action: string;
  actor?: string;
  target_id?: string;
  row_hash?: string;
  created_at?: string;
  correlation_id?: string;
};

/**
 * Find audit logs matching the query criteria
 * @param query Query parameters to filter audit logs
 * @returns Promise resolving to array of matching audit logs
 */
export async function findAudit(query: AuditQuery): Promise<AuditLog[]> {
  // Use Playwright baseURL or fallback to localhost for test environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  process.env.PLAYWRIGHT_BASE_URL || 
                  process.env.APP_BASE_URL || 
                  'http://localhost:8080';

  try {
    // Use the existing diagnostic endpoint for audit queries
    const url = new URL('/api/diag/audit-query', baseUrl);
    
    if (query.action) {
      url.searchParams.set('action', query.action);
    }
    
    if (query.correlationId) {
      url.searchParams.set('resource_id', query.correlationId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Test-Helpers-Enabled': '1',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.eventError && data.accessError) {
      throw new Error(`Audit query errors - Events: ${data.eventError}, Access: ${data.accessError}`);
    }

    // Combine event logs and access logs
    const eventLogs = (data.events || []).map((log: any) => ({
      id: log.id?.toString() || 'unknown',
      action: log.action || 'unknown',
      actor: log.actor_id || log.actor_role,
      target_id: log.resource_id,
      created_at: log.occurred_at_utc || log.created_at,
      correlation_id: log.correlation_id,
    }));

    const accessLogs = (data.access_logs || []).map((log: any) => ({
      id: log.id?.toString() || 'unknown',
      action: log.action || 'unknown',
      actor: log.src_ip || 'system',
      target_id: log.resource,
      created_at: log.occurred_at_utc || log.created_at,
      correlation_id: log.request_id,
    }));

    const allLogs = [...eventLogs, ...accessLogs];

    // Apply client-side filtering
    const filteredLogs = allLogs.filter(log => {
      if (query.correlationId && log.correlation_id !== query.correlationId) return false;
      if (query.action && log.action !== query.action) return false;
      // Note: actorEmail filtering would require server-side support
      return true;
    });

    return filteredLogs;
  } catch (error) {
    throw new Error(`Audit logs query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Expect to find at least the specified number of audit logs matching the query
 * @param query Query parameters to filter audit logs
 * @param expectAtLeast Minimum number of logs expected (default: 1)
 * @returns Promise resolving to array of matching audit logs
 * @throws Error if fewer than expected logs are found
 */
export async function expectAuditMatch(query: AuditQuery, expectAtLeast = 1): Promise<AuditLog[]> {
  const results = await findAudit(query);
  
  if (results.length < expectAtLeast) {
    throw new Error(
      `Expected at least ${expectAtLeast} audit logs matching query ${JSON.stringify(query)}, but found ${results.length}. ` +
      `Review the test step and ensure audit logging is working properly.`
    );
  }
  
  return results;
}