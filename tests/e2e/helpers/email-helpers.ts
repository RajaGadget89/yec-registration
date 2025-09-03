import { supabaseTestClient } from './supabaseTestClient';

export interface EmailLink {
  type: 'accept' | 'magic';
  url: string;
  email: string;
  timestamp: string;
}

/**
 * Wait for a specific type of email link to appear in the outbox
 * @param type - Type of link to wait for ('accept' or 'magic')
 * @param email - Email address to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Promise<EmailLink> - The email link details
 */
export async function waitForOutboxLink(
  type: 'accept' | 'magic',
  email: string,
  timeoutMs: number = 10000
): Promise<EmailLink> {
  const startTime = Date.now();
  const pollInterval = 500; // 500ms

  console.log(`[email-helpers] Waiting for ${type} link for ${email}...`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Query email outbox for the specific type and email
      const { data: emails, error } = await supabaseTestClient.db()
        .from('email_outbox')
        .select('*')
        .eq('template', type === 'accept' ? 'admin.invitation' : 'magic.link')
        .eq('to_email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && emails && emails.length > 0) {
        const emailData = emails[0];
        const payload = emailData.payload as any;
        
        let url: string | null = null;
        
        if (type === 'accept') {
          // Extract accept URL from invitation email
          url = payload.acceptUrl || null;
        } else if (type === 'magic') {
          // Extract magic link URL from magic link email
          url = payload.magicLinkUrl || payload.callbackUrl || null;
        }

        if (url) {
          const link: EmailLink = {
            type,
            url,
            email,
            timestamp: emailData.created_at
          };
          
          console.log(`[email-helpers] Found ${type} link for ${email} after ${Date.now() - startTime}ms`);
          return link;
        }
      }
    } catch (error) {
      console.log(`[email-helpers] Polling error: ${error}`);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timeout waiting for ${type} link for ${email} after ${timeoutMs}ms`);
}

/**
 * Get the latest email link from outbox without waiting
 * @param type - Type of link to get ('accept' or 'magic')
 * @param email - Email address to search for
 * @returns Promise<EmailLink | null> - The email link details or null if not found
 */
export async function getLatestOutboxLink(
  type: 'accept' | 'magic',
  email: string
): Promise<EmailLink | null> {
  try {
    const { data: emails, error } = await supabaseTestClient.db()
      .from('email_outbox')
      .select('*')
      .eq('template', type === 'accept' ? 'admin.invitation' : 'magic.link')
      .eq('to_email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !emails || emails.length === 0) {
      return null;
    }

    const emailData = emails[0];
    const payload = emailData.payload as any;
    
    let url: string | null = null;
    
    if (type === 'accept') {
      url = payload.acceptUrl || null;
    } else if (type === 'magic') {
      url = payload.magicLinkUrl || payload.callbackUrl || null;
    }

    if (url) {
      return {
        type,
        url,
        email,
        timestamp: emailData.created_at
      };
    }

    return null;
  } catch (error) {
    console.error(`[email-helpers] Error getting latest outbox link: ${error}`);
    return null;
  }
}

/**
 * Clean up test emails from outbox
 * @param email - Email address to clean up
 * @param tag - Optional tag to identify test emails
 */
export async function cleanupTestEmails(email: string, tag?: string): Promise<void> {
  try {
    const searchPattern = tag ? `%${tag}%` : `%${email}%`;
    
    // Clean up email outbox entries
    const { error: outboxError } = await supabaseTestClient.db()
      .from('email_outbox')
      .delete()
      .or(`to_email.ilike.${searchPattern},to_email.eq.${email}`);

    if (outboxError) {
      console.error(`[email-helpers] Error cleaning up email outbox: ${outboxError}`);
    }

    console.log(`[email-helpers] Cleaned up test emails for ${email}`);
  } catch (error) {
    console.error(`[email-helpers] Error in cleanupTestEmails: ${error}`);
  }
}
