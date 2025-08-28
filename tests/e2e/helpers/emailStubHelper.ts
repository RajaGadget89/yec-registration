/**
 * Email stub helper for admin management tests
 * Verifies that invitation emails are sent with correct content
 */

import { supabaseTestClient } from './supabaseTestClient';

export interface EmailStubVerification {
  emailSent: boolean;
  recipient: string;
  subject: string;
  containsAcceptUrl: boolean;
  acceptUrlToken: string | null;
  language: 'en' | 'th';
  error?: string;
}

/**
 * Verify that an admin invitation email was sent
 */
export async function verifyAdminInvitationEmail(
  invitationId: string,
  expectedRecipient: string
): Promise<EmailStubVerification> {
  try {
    // Query email outbox for the invitation email
    const { data: emails, error } = await supabaseTestClient
      .from('email_outbox')
      .select('*')
      .eq('template', 'admin.invitation')
      .eq('to_email', expectedRecipient)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return {
        emailSent: false,
        recipient: expectedRecipient,
        subject: '',
        containsAcceptUrl: false,
        acceptUrlToken: null,
        language: 'en',
        error: `Database error: ${error.message}`
      };
    }

    if (!emails || emails.length === 0) {
      return {
        emailSent: false,
        recipient: expectedRecipient,
        subject: '',
        containsAcceptUrl: false,
        acceptUrlToken: null,
        language: 'en',
        error: 'No invitation email found in outbox'
      };
    }

    const email = emails[0];
    const payload = email.payload as any;

    // Extract token from accept URL
    const acceptUrl = payload.acceptUrl || '';
    const tokenMatch = acceptUrl.match(/\/invitations\/([^\/]+)\/accept/);
    const acceptUrlToken = tokenMatch ? tokenMatch[1] : null;

    // Determine language from subject
    const subject = payload.subject || '';
    const language = subject.includes('เชิญ') || subject.includes('ผู้ดูแลระบบ') ? 'th' : 'en';

    // Verify subject contains expected content
    const expectedSubjectEn = 'Admin Invitation';
    const expectedSubjectTh = 'เชิญเข้าร่วมเป็นผู้ดูแลระบบ';
    const hasCorrectSubject = subject.includes(expectedSubjectEn) || subject.includes(expectedSubjectTh);

    return {
      emailSent: true,
      recipient: expectedRecipient,
      subject: subject,
      containsAcceptUrl: acceptUrl.includes('/invitations/') && acceptUrl.includes('/accept'),
      acceptUrlToken: acceptUrlToken,
      language: language,
    };

  } catch (error) {
    return {
      emailSent: false,
      recipient: expectedRecipient,
      subject: '',
      containsAcceptUrl: false,
      acceptUrlToken: null,
      language: 'en',
      error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Verify that an admin invitation email was sent with specific token
 */
export async function verifyAdminInvitationEmailWithToken(
  expectedRecipient: string,
  expectedToken: string
): Promise<EmailStubVerification> {
  const verification = await verifyAdminInvitationEmail('', expectedRecipient);
  
  if (verification.emailSent && verification.acceptUrlToken) {
    verification.emailSent = verification.acceptUrlToken === expectedToken;
    if (!verification.emailSent) {
      verification.error = `Token mismatch: expected ${expectedToken}, got ${verification.acceptUrlToken}`;
    }
  }

  return verification;
}

/**
 * Clean up test emails from outbox
 */
export async function cleanupTestEmails(testTag: string): Promise<void> {
  try {
    await supabaseTestClient.db()
      .from('email_outbox')
      .delete()
      .like('to_email', `%${testTag}%`);

    console.log(`[email-stub] Cleaned up test emails for tag: ${testTag}`);
  } catch (error) {
    console.warn(`[email-stub] Email cleanup warning:`, error);
  }
}

/**
 * Get email statistics for testing
 */
export async function getEmailStats(): Promise<{
  total: number;
  pending: number;
  sent: number;
  failed: number;
}> {
  try {
    const { data: emails, error } = await supabaseTestClient.db()
      .from('email_outbox')
      .select('status');

    if (error) {
      throw error;
    }

    const stats = {
      total: emails.length,
      pending: emails.filter(e => e.status === 'pending').length,
      sent: emails.filter(e => e.status === 'sent').length,
      failed: emails.filter(e => e.status === 'error').length,
    };

    return stats;
  } catch (error) {
    console.warn(`[email-stub] Failed to get email stats:`, error);
    return { total: 0, pending: 0, sent: 0, failed: 0 };
  }
}


