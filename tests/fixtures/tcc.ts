import type { APIRequestContext } from '@playwright/test';

/**
 * Canonical TCC (Thai Chamber of Commerce) fixture for AC1-AC6 tests.
 * Provides idempotent builders and optional submitters for TCC card binding data.
 */

export type TccPayload = {
  label: 'TCC_001';
  email: string; // matches registration
  tccNumber: string;
  holderName: string;
  cardImagePath?: string; // path to test asset if required by endpoint
  registrationId?: string; // tracking ID for the registration
};

/**
 * Builds a canonical TCC payload tied to a registration.
 * @param regEmail Email of the registration this TCC is for
 * @param ts Optional timestamp suffix for uniqueness (defaults to current timestamp)
 * @returns Complete TCC payload ready for submission
 */
export function buildTcc(regEmail: string, ts?: string): TccPayload {
  const timestamp = ts || nowTs();
  
  return {
    label: 'TCC_001',
    email: regEmail,
    tccNumber: `TCC${timestamp.slice(-8)}`, // Generate deterministic but fake TCC number
    holderName: `Test Company ${timestamp.slice(-6)}`,
    cardImagePath: 'tests/fixtures/tcc.jpg', // Use existing test asset
    registrationId: `TCC-${timestamp}`
  };
}

/**
 * Submits TCC data to the registration update endpoint.
 * Handles idempotency by treating duplicate TCC bindings as success.
 * @param req Playwright API request context
 * @param data TCC payload to submit
 * @returns Promise resolving to TCC binding result
 */
export async function submitTcc(
  req: APIRequestContext,
  data: TccPayload
): Promise<{ status: 'bound' | 'duplicate' }> {
  try {
    // Use the test endpoint with proper authentication
    const response = await req.post('/api/test/test-resubmit', {
      data: {
        email: data.email,
        dimension: 'tcc',
        updates: {
          tcc: {
            tcc_number: data.tccNumber,
            holder_name: data.holderName,
            tcc_card_url: 'https://example.com/test-tcc-card.jpg' // Mock URL for testing
          }
        }
      },
      headers: {
        'X-Test-Helpers-Enabled': '1',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret-not-configured'}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok()) {
      return { status: 'bound' };
    }
    
    // Handle duplicate TCC binding as idempotent success
    if (result.code === 'DUPLICATE_TCC' || response.status() === 409) {
      return { status: 'duplicate' };
    }
    
    throw new Error(`TCC submission failed: ${result.error || 'Unknown error'}`);
  } catch (error) {
    // If it's a network error that might indicate duplicate, treat as success
    if (error instanceof Error && error.message.includes('409')) {
      return { status: 'duplicate' };
    }
    throw error;
  }
}

/**
 * Utility function to generate timestamp in YYYYMMDD-HHmmss format.
 */
function nowTs(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Thin wrapper for API requests that respects Playwright baseURL.
 */
async function reqJson(
  req: APIRequestContext,
  method: string,
  url: string,
  body?: unknown
): Promise<any> {
  const response = await req.fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    data: body ? JSON.stringify(body) : undefined,
  });
  
  const text = await response.text();
  let json;
  
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
  
  if (!response.ok()) {
    throw new Error(`HTTP ${response.status()}: ${json.error || text.slice(0, 200)}`);
  }
  
  return json;
}