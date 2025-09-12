import type { APIRequestContext } from '@playwright/test';

/**
 * Canonical payment fixture for AC1-AC6 tests.
 * Provides idempotent builders and optional submitters for payment data.
 */

export type PaymentPayload = {
  label: 'PAYMENT_001';
  email: string; // matches a registration
  amount: number;
  slipImagePath?: string; // path to test asset if required by endpoint
  registrationId?: string; // tracking ID for the registration
};

/**
 * Builds a canonical payment payload tied to a registration.
 * @param regEmail Email of the registration this payment is for
 * @param ts Optional timestamp suffix for uniqueness (defaults to current timestamp)
 * @returns Complete payment payload ready for submission
 */
export function buildPayment(regEmail: string, ts?: string): PaymentPayload {
  const timestamp = ts || nowTs();
  
  return {
    label: 'PAYMENT_001',
    email: regEmail,
    amount: 5000, // Standard package price in THB
    slipImagePath: 'tests/fixtures/payment-slip.png', // Use existing test asset
    registrationId: `PAYMENT-${timestamp}`
  };
}

/**
 * Submits payment data to the registration update endpoint.
 * Handles idempotency by treating duplicate payments as success.
 * @param req Playwright API request context
 * @param data Payment payload to submit
 * @returns Promise resolving to payment validation result
 */
export async function submitPayment(
  req: APIRequestContext,
  data: PaymentPayload
): Promise<{ status: 'validated' | 'queued' | 'duplicate' }> {
  try {
    // First, we need to get a resubmit token for the registration
    const tokenResponse = await reqJson(req, 'POST', '/api/test/generate-resubmit-token', {
      email: data.email,
      dimension: 'payment'
    });
    
    if (!tokenResponse.ok || !tokenResponse.token) {
      throw new Error(`Failed to get resubmit token: ${tokenResponse.error}`);
    }
    
    // Submit payment update using the token
    const formData = new FormData();
    formData.append('registration_id', data.registrationId || '');
    formData.append('updates[payment][amount]', data.amount.toString());
    
    // If we have a test image, upload it
    if (data.slipImagePath) {
      try {
        const fileResponse = await req.fetch('/api/upload-file', {
          method: 'POST',
          body: (() => {
            const form = new FormData();
            form.append('file', new File(['test payment slip'], 'payment-slip.png', { type: 'image/png' }));
            form.append('folder', 'payment-slips');
            return form;
          })()
        });
        
        if (fileResponse.ok()) {
          const fileResult = await fileResponse.json();
          formData.append('updates[payment][payment_slip_url]', fileResult.url);
        }
      } catch (error) {
        console.warn('File upload failed, continuing without file:', error);
      }
    }
    
    const response = await req.fetch(`/api/user/${tokenResponse.token}/resubmit`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok()) {
      return { status: 'validated' };
    }
    
    // Handle duplicate payment as idempotent success
    if (result.code === 'DUPLICATE_PAYMENT' || response.status() === 409) {
      return { status: 'duplicate' };
    }
    
    throw new Error(`Payment submission failed: ${result.error || 'Unknown error'}`);
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