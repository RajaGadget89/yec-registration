/**
 * Seed utility for creating test emails in the outbox for e2e testing
 * This creates deterministic test data for capped email dispatch testing
 */

import { getServiceRoleClient } from '../../app/lib/supabase-server';

export interface TestEmail {
  template: string;
  to_email: string;
  payload: any;
  subject?: string;
}

/**
 * Seed test emails into the outbox for e2e testing
 * @param emails Array of test emails to seed
 * @returns Array of created email IDs
 */
export async function seedTestEmails(emails: TestEmail[]): Promise<string[]> {
  const supabase = getServiceRoleClient();
  const createdIds: string[] = [];

  console.log(`[SEED] Seeding ${emails.length} test emails into outbox`);

  for (const email of emails) {
    try {
      // Insert into email_outbox table
      const { data, error } = await supabase
        .from('email_outbox')
        .insert({
          template: email.template,
          to_email: email.to_email,
          payload: email.payload,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error(`[SEED] Failed to seed email to ${email.to_email}:`, error);
        continue;
      }

      createdIds.push(data.id);
      console.log(`[SEED] Created email ${data.id} to ${email.to_email}`);
    } catch (error) {
      console.error(`[SEED] Error seeding email to ${email.to_email}:`, error);
    }
  }

  console.log(`[SEED] Successfully seeded ${createdIds.length}/${emails.length} emails`);
  return createdIds;
}

/**
 * Clean up test emails from the outbox
 * @param emailIds Array of email IDs to delete
 * @returns Number of emails deleted
 */
export async function cleanupTestEmails(emailIds: string[]): Promise<number> {
  const supabase = getServiceRoleClient();
  let deletedCount = 0;

  console.log(`[CLEANUP] Cleaning up ${emailIds.length} test emails`);

  for (const id of emailIds) {
    try {
      const { error } = await supabase
        .from('email_outbox')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[CLEANUP] Failed to delete email ${id}:`, error);
      } else {
        deletedCount++;
      }
    } catch (error) {
      console.error(`[CLEANUP] Error deleting email ${id}:`, error);
    }
  }

  console.log(`[CLEANUP] Successfully deleted ${deletedCount}/${emailIds.length} emails`);
  return deletedCount;
}

/**
 * Get predefined test emails for capped e2e testing
 * @returns Array of test emails with allowlisted and non-allowlisted addresses
 */
export function getCappedTestEmails(): TestEmail[] {
  return [
    {
      template: 'tracking',
      to_email: 'raja.gadgets89@gmail.com', // Allowlisted
      payload: { trackingCode: 'E2E-CAPPED-001' },
      subject: '[E2E] CAPPED Test #1'
    },
    {
      template: 'tracking',
      to_email: 'raja.gadgets89@gmail.com', // Allowlisted (will be capped)
      payload: { trackingCode: 'E2E-CAPPED-002' },
      subject: '[E2E] CAPPED Test #2'
    },
    {
      template: 'tracking',
      to_email: 'blocked@example.com', // Non-allowlisted (will be blocked)
      payload: { trackingCode: 'E2E-BLOCKED-001' },
      subject: '[E2E] BLOCKED Test #1'
    }
  ];
}

/**
 * Get outbox statistics for verification
 * @returns Outbox statistics
 */
export async function getOutboxStats(): Promise<{
  total_pending: number;
  total_sent: number;
  total_error: number;
  oldest_pending: string | null;
}> {
  const supabase = getServiceRoleClient();

  try {
    // Get pending count
    const { count: pendingCount } = await supabase
      .from('email_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get sent count
    const { count: sentCount } = await supabase
      .from('email_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent');

    // Get error count
    const { count: errorCount } = await supabase
      .from('email_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'error');

    // Get oldest pending email
    const { data: oldestPending } = await supabase
      .from('email_outbox')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return {
      total_pending: pendingCount || 0,
      total_sent: sentCount || 0,
      total_error: errorCount || 0,
      oldest_pending: oldestPending?.created_at || null
    };
  } catch (error) {
    console.error('[STATS] Error getting outbox stats:', error);
    return {
      total_pending: 0,
      total_sent: 0,
      total_error: 0,
      oldest_pending: null
    };
  }
}
