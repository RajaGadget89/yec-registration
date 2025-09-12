import type { APIRequestContext } from '@playwright/test';

/**
 * Canonical registration fixture for AC1-AC6 tests.
 * Provides idempotent builders and optional submitters for registration data.
 */

export type RegistrationPayload = {
  label: 'REG_001';
  email: string; // unique per run
  fullName: string;
  phone: string;
  // Additional required fields based on current registration form
  title: string;
  firstName: string;
  lastName: string;
  nickname: string;
  lineId: string;
  companyName: string;
  businessType: string;
  yecProvince: string;
  hotelChoice: string;
  roomType?: string; // Required when hotelChoice is 'in-quota'
  travelType: string;
  selectedPackage?: string;
};

/**
 * Builds a canonical registration payload with stable, deterministic data.
 * @param ts Optional timestamp suffix for uniqueness (defaults to current timestamp)
 * @returns Complete registration payload ready for submission
 */
export function buildRegistration(ts?: string): RegistrationPayload {
  const timestamp = ts || nowTs();
  // Support optional real email override for manual verification (tests-only change)
  const email = process.env.TEST_REAL_EMAIL ?? uniqueEmail('REG_001', timestamp);
  
  return {
    label: 'REG_001',
    email,
    fullName: `Test User ${timestamp}`,
    phone: '0812345678',
    title: 'Mr.',
    firstName: 'Test',
    lastName: 'User',
    nickname: `testuser${timestamp.slice(-6)}`,
    lineId: `testline${timestamp.slice(-6)}`,
    companyName: 'Test Company Ltd.',
    businessType: 'technology',
    yecProvince: 'Bangkok',
    hotelChoice: 'in-quota',
    roomType: 'single', // Required when hotelChoice is 'in-quota'
    travelType: 'private-car',
    selectedPackage: 'standard'
  };
}

/**
 * Submits registration data to the public registration endpoint.
 * Handles idempotency by treating duplicate emails as success.
 * @param req Playwright API request context
 * @param data Registration payload to submit
 * @returns Promise resolving to registration result with id and email
 */
export async function submitRegistration(
  req: APIRequestContext, 
  data: RegistrationPayload
): Promise<{ id: string; email: string; status: 'created' | 'duplicate' }> {
  try {
    const response = await reqJson(req, 'POST', '/api/register', data);
    
    // Check for success response structure
    if (response.success) {
      return {
        id: response.registration_id || response.id || 'unknown',
        email: data.email,
        status: 'created'
      };
    }
    
    // Handle duplicate email as idempotent success
    if (response.code === 'DUPLICATE_EMAIL' || response.status === 409) {
      return {
        id: response.existing_id || 'existing',
        email: data.email,
        status: 'duplicate'
      };
    }
    
    throw new Error(`Registration failed: ${response.error || response.message || 'Unknown error'}`);
  } catch (error) {
    // If it's a network error that might indicate duplicate, treat as success
    if (error instanceof Error && error.message.includes('409')) {
      return {
        id: 'existing',
        email: data.email,
        status: 'duplicate'
      };
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
 * Utility function to generate unique email addresses.
 */
function uniqueEmail(prefix: string, ts: string): string {
  return `test+${prefix}-${ts}@example.com`;
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
    // Enhanced error reporting
    const errorDetails = {
      status: response.status(),
      statusText: response.statusText(),
      responseText: text.slice(0, 500),
      jsonResponse: json,
      url: url
    };
    console.error('API Error Details:', errorDetails);
    throw new Error(`HTTP ${response.status()}: ${json.error || json.message || text.slice(0, 200)}`);
  }
  
  return json;
}