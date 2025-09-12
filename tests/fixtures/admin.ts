import type { APIRequestContext } from '@playwright/test';

/**
 * Canonical admin fixture for AC1-AC6 tests.
 * Provides idempotent builders and optional submitters for admin invitation data.
 */

export type AdminInvite = {
  label: 'ADMIN_001';
  email: string; // invitee
  role: 'admin' | 'viewer' | 'super_admin';
};

/**
 * Builds a canonical admin invitation payload.
 * @param ts Optional timestamp suffix for uniqueness (defaults to current timestamp)
 * @param role Admin role to assign (defaults to 'admin')
 * @returns Complete admin invitation payload ready for submission
 */
export function buildAdminInvite(ts?: string, role?: AdminInvite['role']): AdminInvite {
  const timestamp = ts || nowTs();
  const email = uniqueEmail('ADMIN_001', timestamp);
  
  return {
    label: 'ADMIN_001',
    email,
    role: role || 'admin'
  };
}

/**
 * Issues an admin invitation using the admin management endpoint.
 * Handles idempotency by treating duplicate invitations as success.
 * @param req Playwright API request context
 * @param data Admin invitation payload to submit
 * @returns Promise resolving to invitation result with invite ID
 */
export async function issueAdminInvite(
  req: APIRequestContext,
  data: AdminInvite
): Promise<{ inviteId: string; status: 'created' | 'duplicate' }> {
  try {
    // Note: This endpoint requires super_admin authentication
    // In test environment, we'll need to use test helpers or mock authentication
    const response = await reqJson(req, 'POST', '/api/admin/management/invite', {
      email: data.email,
      roles: [data.role]
    });
    
    if (response.ok) {
      return {
        inviteId: response.invitation_id || response.id || 'unknown',
        status: 'created'
      };
    }
    
    // Handle duplicate invitation as idempotent success
    if (response.code === 'INVITE_EXISTS' || response.status === 409) {
      return {
        inviteId: response.invitation_id || 'existing',
        status: 'duplicate'
      };
    }
    
    throw new Error(`Admin invitation failed: ${response.error || 'Unknown error'}`);
  } catch (error) {
    // If it's a network error that might indicate duplicate, treat as success
    if (error instanceof Error && error.message.includes('409')) {
      return {
        inviteId: 'existing',
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
    throw new Error(`HTTP ${response.status()}: ${json.error || text.slice(0, 200)}`);
  }
  
  return json;
}