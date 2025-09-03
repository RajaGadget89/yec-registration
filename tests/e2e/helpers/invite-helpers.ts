import { APIRequestContext } from '@playwright/test';
import { supabaseTestClient } from './supabaseTestClient';

/**
 * Send an admin invitation via the real server route
 * @param request - Playwright API request context
 * @param email - Email address to invite
 * @returns Promise<{ id: string; token: string }> - Invitation details
 */
export async function sendAdminInvite(
  request: APIRequestContext, 
  email: string
): Promise<{ id: string; token: string }> {
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'raja.gadgets89@gmail.com';
  
  const response = await request.post('/api/admin/management/invite', {
    headers: { 
      'Content-Type': 'application/json', 
      'X-Request-ID': `uat04s-invite-${Date.now()}`,
      'admin-email': SUPER_ADMIN_EMAIL 
    },
    data: { email, roles: ['admin'] }
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to send admin invitation: ${response.status()} - ${errorText}`);
  }

  const result = await response.json();
  
  // Normalize possible response shapes
  const id = result.id ?? result.invitation_id ?? result.invitation?.id;
  const token = result.token ?? result.invitation?.token;
  
  if (!id || !token) {
    throw new Error(`Invalid invitation response: missing id or token`);
  }

  console.log(`[invite-helpers] Admin invitation sent successfully for ${email}`);
  return { id, token };
}

/**
 * Get the accept URL for an admin invitation
 * Priority: 1. Dev/test endpoint, 2. Email outbox, 3. Token table
 * @param request - Playwright API request context
 * @param email - Email address that was invited
 * @returns Promise<string> - Accept URL
 */
export async function getAcceptUrl(
  request: APIRequestContext, 
  email: string
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
  
  try {
    // Method 1: Try dev/test endpoint (with E2E RBAC header)
    if (process.env.E2E_TEST_MODE === 'true') {
      try {
        // For now, skip the test endpoint approach since newContext is not available
        // This can be implemented later if needed
        console.log(`[invite-helpers] E2E test mode enabled, but test endpoint not yet implemented`);
      } catch (error) {
        console.log(`[invite-helpers] Test endpoint failed, falling back to database: ${error}`);
      }
    }

    // Method 2: Read from email_outbox table via Supabase service role
    try {
      const { data: emails, error } = await supabaseTestClient.db()
        .from('email_outbox')
        .select('*')
        .eq('template', 'admin.invitation')
        .eq('to_email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && emails && emails.length > 0) {
        const emailData = emails[0];
        const payload = emailData.payload as any;
        
        if (payload.acceptUrl) {
          console.log(`[invite-helpers] Retrieved accept URL from email outbox: ${payload.acceptUrl}`);
          return payload.acceptUrl;
        }
      }
    } catch (error) {
      console.log(`[invite-helpers] Email outbox query failed: ${error}`);
    }

    // Method 3: Read latest token from admin_invitations table and build URL
    try {
      const { data: invitations, error } = await supabaseTestClient.db()
        .from('admin_invitations')
        .select('token')
        .eq('email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && invitations && invitations.length > 0) {
        const token = invitations[0].token;
        const acceptUrl = `${baseUrl}/admin/accept?token=${token}`;
        console.log(`[invite-helpers] Built accept URL from token: ${acceptUrl}`);
        return acceptUrl;
      }
    } catch (error) {
      console.log(`[invite-helpers] Token table query failed: ${error}`);
    }

    throw new Error(`Could not retrieve accept URL for ${email} using any method`);
  } catch (error) {
    console.error(`[invite-helpers] Failed to get accept URL for ${email}:`, error);
    throw error;
  }
}

/**
 * Wait for an invitation email to appear in the outbox
 * @param email - Email address to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Promise<{ id: string; token: string }> - Invitation details
 */
export async function waitForInvitationEmail(
  email: string,
  timeoutMs: number = 10000
): Promise<{ id: string; token: string }> {
  const startTime = Date.now();
  const pollInterval = 500; // 500ms

  while (Date.now() - startTime < timeoutMs) {
    try {
      const { data: invitations, error } = await supabaseTestClient.db()
        .from('admin_invitations')
        .select('id, token')
        .eq('email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && invitations && invitations.length > 0) {
        const invitation = invitations[0];
        console.log(`[invite-helpers] Found invitation email for ${email} after ${Date.now() - startTime}ms`);
        return { id: invitation.id, token: invitation.token };
      }
    } catch (error) {
      console.log(`[invite-helpers] Polling error: ${error}`);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timeout waiting for invitation email for ${email} after ${timeoutMs}ms`);
}
