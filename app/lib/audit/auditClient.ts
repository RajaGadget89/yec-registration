import { config } from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
config({ path: envPath });

/**
 * Node-only audit client for logging to Supabase via RPC
 * This module must never be imported in browser code
 */

/**
 * Log API access to audit.access_log via RPC
 */
export async function logAccess(p: {
  action: string;
  method: string;
  resource: string;
  result: string;
  request_id: string;
  src_ip?: string;
  user_agent?: string;
  latency_ms?: number;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[audit] Missing Supabase environment variables for audit client');
      return;
    }

    // Debug logging for test environment
    if (process.env.PLAYWRIGHT_TEST) {
      console.debug('[audit] calling', `${supabaseUrl}/rest/v1/rpc/log_access`, 'rid=', p.request_id);
    }

    const response = await globalThis.fetch(`${supabaseUrl}/rest/v1/rpc/log_access`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Profile': 'audit',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p })
    });

    if (!response.ok) {
      console.error(`[audit] logAccess failed: ${response.status} ${response.statusText}`);
      if (process.env.PLAYWRIGHT_TEST) {
        const errorText = await response.text();
        console.error(`[audit] Error response: ${errorText}`);
      }
    } else {
      if (process.env.PLAYWRIGHT_TEST) {
        console.debug(`[audit] logAccess success: ${response.status}`);
      }
    }
  } catch (error) {
    // Fire-and-forget: never throw, only log in development
    if (process.env.PLAYWRIGHT_TEST) {
      console.error(`[audit] logAccess error:`, error);
    }
  }
}

/**
 * Log domain events to audit.event_log via RPC
 */
export async function logEvent(p: {
  action: string;
  resource: string;
  resource_id?: string;
  actor_id?: string;
  actor_role: 'user' | 'admin' | 'system';
  result: string;
  reason?: string;
  correlation_id: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[audit] Missing Supabase environment variables for audit client');
      return;
    }

    // Debug logging for test environment
    if (process.env.PLAYWRIGHT_TEST) {
      console.debug('[audit] calling', `${supabaseUrl}/rest/v1/rpc/log_event`, 'rid=', p.correlation_id);
    }

    const response = await globalThis.fetch(`${supabaseUrl}/rest/v1/rpc/log_event`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Profile': 'audit',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p })
    });

    if (!response.ok) {
      console.error(`[audit] logEvent failed: ${response.status} ${response.statusText}`);
      if (process.env.PLAYWRIGHT_TEST) {
        const errorText = await response.text();
        console.error(`[audit] Error response: ${errorText}`);
      }
    } else {
      if (process.env.PLAYWRIGHT_TEST) {
        console.debug(`[audit] logEvent success: ${response.status}`);
      }
    }
  } catch (error) {
    // Fire-and-forget: never throw, only log in development
    if (process.env.PLAYWRIGHT_TEST) {
      console.error(`[audit] logEvent error:`, error);
    }
  }
}
