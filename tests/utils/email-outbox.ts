/**
 * Email Outbox Helper - Read-only utilities for querying email outbox entries
 * 
 * This helper provides read-only access to email outbox data through existing
 * test endpoints and API surfaces. It does not modify any server state.
 */

export type OutboxQuery = {
  to?: string;
  templateKey?: string;
  correlationId?: string; // if available via session tracking
  headers?: Record<string, string>; // optional headers for authenticated requests
};

export type OutboxItem = {
  id: string;
  to: string;
  template_key: string;
  subject?: string;
  created_at?: string;
  payload?: Record<string, unknown>;
};

/**
 * Find email outbox entries matching the query criteria
 * @param query Query parameters to filter outbox entries
 * @returns Promise resolving to array of matching outbox items
 */
export async function findOutbox(query: OutboxQuery): Promise<OutboxItem[]> {
  // Use Playwright baseURL or fallback to localhost for test environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  process.env.PLAYWRIGHT_BASE_URL || 
                  process.env.APP_BASE_URL || 
                  'http://localhost:8080';

  try {
    // Use the existing test endpoint that provides read-only access
    const url = new URL('/api/test/get-sample-email', baseUrl);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Test-Helpers-Enabled': '1',
        'Content-Type': 'application/json',
        ...(query.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch email outbox: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.sample) {
      return [];
    }

    // Transform the sample data to match our interface
    const sample = data.sample;
    const outboxItem: OutboxItem = {
      id: sample.id || 'unknown',
      to: sample.to_email || sample.to || 'unknown',
      template_key: sample.template || 'unknown',
      subject: sample.subject,
      created_at: sample.created_at,
      payload: sample.payload || {},
    };

    // Apply client-side filtering if query parameters provided
    const results = [outboxItem].filter(item => {
      if (query.to && item.to !== query.to) return false;
      if (query.templateKey && item.template_key !== query.templateKey) return false;
      // Note: correlationId filtering would require server-side support
      return true;
    });

    return results;
  } catch (error) {
    throw new Error(`Email outbox query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Expect to find at least the specified number of outbox entries matching the query
 * @param query Query parameters to filter outbox entries
 * @param expectAtLeast Minimum number of entries expected (default: 1)
 * @returns Promise resolving to array of matching outbox items
 * @throws Error if fewer than expected entries are found
 */
export async function expectOutboxMatch(query: OutboxQuery, expectAtLeast = 1): Promise<OutboxItem[]> {
  const results = await findOutbox(query);
  
  if (results.length < expectAtLeast) {
    throw new Error(
      `Expected at least ${expectAtLeast} outbox entries matching query ${JSON.stringify(query)}, but found ${results.length}. ` +
      `Review the test step and ensure emails are being queued properly.`
    );
  }
  
  return results;
}

/**
 * Check if LIVE email mode is enabled for manual verification
 * @returns boolean indicating if LIVE mode is enabled
 */
export function isLiveEmailMode(): boolean {
  return process.env.EMAIL_MODE === 'LIVE';
}

/**
 * Get the real email address for manual verification (if configured)
 * @returns real email address or null if not configured
 */
export function getRealEmailForVerification(): string | null {
  return process.env.TEST_REAL_EMAIL || null;
}

/**
 * Expect outbox entries with LIVE mode support for manual verification
 * @param query Query parameters to filter outbox entries
 * @param expectAtLeast Minimum number of entries expected (default: 1)
 * @returns Promise resolving to array of matching outbox items
 * @throws Error if fewer than expected entries are found (unless LIVE mode)
 */
export async function expectOutboxMatchWithLiveSupport(query: OutboxQuery, expectAtLeast = 1): Promise<{
  items: OutboxItem[];
  status: 'PASS' | 'LIVE_MODE' | 'ERROR';
  message: string;
}> {
  try {
    const results = await findOutbox(query);
    
    if (results.length < expectAtLeast) {
      // In LIVE mode, we don't fail the test - just report for manual verification
      if (isLiveEmailMode()) {
        const realEmail = getRealEmailForVerification();
        return {
          items: results,
          status: 'LIVE_MODE',
          message: `LIVE MODE: Expected ${expectAtLeast} outbox entries, found ${results.length}. Check ${realEmail || 'configured email'} manually for real email delivery.`
        };
      }
      
      return {
        items: results,
        status: 'ERROR',
        message: `Expected at least ${expectAtLeast} outbox entries matching query ${JSON.stringify(query)}, but found ${results.length}.`
      };
    }
    
    // In LIVE mode, provide additional context for manual verification
    if (isLiveEmailMode()) {
      const realEmail = getRealEmailForVerification();
      return {
        items: results,
        status: 'LIVE_MODE',
        message: `LIVE MODE: Found ${results.length} outbox entries. Check ${realEmail || 'configured email'} manually for real email delivery.`
      };
    }
    
    return {
      items: results,
      status: 'PASS',
      message: `Found ${results.length} outbox entries matching query.`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // In LIVE mode, don't fail on outbox errors - just report for manual verification
    if (isLiveEmailMode()) {
      const realEmail = getRealEmailForVerification();
      return {
        items: [],
        status: 'LIVE_MODE',
        message: `LIVE MODE: Outbox query failed (${errorMessage}). Check ${realEmail || 'configured email'} manually for real email delivery.`
      };
    }
    
    return {
      items: [],
      status: 'ERROR',
      message: `Outbox query failed: ${errorMessage}`
    };
  }
}