import { createClient } from '../supabase-server';
import { getEmailTransport, EmailTransport } from './transport';
import { renderEmailTemplate, getEmailSubject, EmailTemplateProps } from './registry';
import { auditEvent } from '../audit/auditClient';

/**
 * Email dispatcher for processing outbox emails
 * Handles batch processing of queued emails with error handling and retry logic
 */

export interface EmailOutboxItem {
  id: string;
  template: string;
  to_email: string;
  payload: EmailTemplateProps;
  idempotency_key?: string;
}

export interface DispatchResult {
  sent: number;
  wouldSend: number;
  capped: number;
  blocked: number;
  errors: number;
  remaining: number;
  details: {
    successful: string[];
    failed: Array<{ id: string; error: string }>;
    capped: string[];
    blocked: string[];
  };
}

/**
 * Process a batch of pending emails from the outbox
 * @param batchSize Maximum number of emails to process in one batch
 * @param dryRun If true, force dry-run mode regardless of EMAIL_MODE
 * @returns Dispatch result with counts and details
 */
export async function dispatchEmailBatch(batchSize: number = 50, dryRun: boolean = false): Promise<DispatchResult> {
  // Get the appropriate email transport
  const transport = getEmailTransport();
  
  // For now, we'll simulate processing emails since the database functions aren't fully set up
  // This allows us to test the transport layer and endpoint structure
  
  if (dryRun) {
    // Simulate processing some emails in dry-run mode
    const mockSent = Math.min(batchSize, 3); // Simulate 3 emails would be sent
    
    console.log(`[DRY-RUN] Would process ${mockSent} emails with batch size ${batchSize}`);
    
    return {
      sent: 0,
      wouldSend: mockSent,
      capped: 0,
      blocked: 0,
      errors: 0,
      remaining: 0,
      details: { 
        successful: [],
        failed: [],
        capped: [],
        blocked: []
      }
    };
  }

  // For non-dry-run mode, simulate real email processing with the transport
  const mockEmails = [
    { id: '1', template: 'tracking', to_email: 'test1@example.com', payload: { trackingCode: 'TEST001' } },
    { id: '2', template: 'tracking', to_email: 'test2@example.com', payload: { trackingCode: 'TEST002' } },
    { id: '3', template: 'tracking', to_email: 'blocked@example.com', payload: { trackingCode: 'TEST003' } },
    { id: '4', template: 'tracking', to_email: 'test3@example.com', payload: { trackingCode: 'TEST004' } },
  ];

  const emailsToProcess = mockEmails.slice(0, batchSize);
  const results = {
    sent: 0,
    wouldSend: 0,
    capped: 0,
    blocked: 0,
    errors: 0,
    remaining: 0,
    details: {
      successful: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
      capped: [] as string[],
      blocked: [] as string[]
    }
  };

  console.log(`[DISPATCH] Processing ${emailsToProcess.length} emails with transport mode`);

  for (const email of emailsToProcess) {
    try {
      // Render the email template
      const html = renderEmailTemplate(email.template, email.payload);
      const subject = getEmailSubject(email.template);
      
      // Send via transport
      const sendResult = await transport.send({
        to: email.to_email,
        subject,
        html
      });

      if (sendResult.ok) {
        results.sent++;
        results.details.successful.push(email.id);
        console.log(`[DISPATCH] Email sent successfully: ${email.id} to ${email.to_email}`);
      } else {
        switch (sendResult.reason) {
          case 'capped':
            results.capped++;
            results.details.capped.push(email.id);
            console.log(`[DISPATCH] Email capped: ${email.id} to ${email.to_email}`);
            break;
          case 'blocked':
            results.blocked++;
            results.details.blocked.push(email.id);
            console.log(`[DISPATCH] Email blocked: ${email.id} to ${email.to_email}`);
            break;
          default:
            results.errors++;
            results.details.failed.push({ id: email.id, error: sendResult.reason || 'unknown' });
            console.log(`[DISPATCH] Email failed: ${email.id} to ${email.to_email} - ${sendResult.reason}`);
        }
      }
    } catch (error) {
      results.errors++;
      results.details.failed.push({ 
        id: email.id, 
        error: error instanceof Error ? error.message : 'unknown error' 
      });
      console.error(`[DISPATCH] Error processing email ${email.id}:`, error);
    }
  }

  // Get transport stats for additional validation
  const transportStats = transport.getStats();
  console.log(`[DISPATCH] Transport stats:`, transportStats);

  return results;
}

/**
 * Get outbox statistics
 * @returns Outbox statistics including pending, sent, and error counts
 */
export async function getOutboxStats() {
  // Mock stats for testing
  return {
    total_pending: 0,
    total_sent: 0,
    total_error: 0,
    oldest_pending: null
  };
}

/**
 * Enqueue an email in the outbox
 * @param template Email template name
 * @param toEmail Recipient email address
 * @param payload Email template props
 * @param idempotencyKey Optional idempotency key to prevent duplicates
 * @returns Outbox item ID
 */
export async function enqueueEmail(
  template: string,
  toEmail: string,
  payload: EmailTemplateProps,
  idempotencyKey?: string
): Promise<string> {
  // Mock implementation for testing
  const mockId = `mock-${Date.now()}`;
  
  console.log(`[MOCK] Enqueued email: ${template} to ${toEmail}`);
  
  return mockId;
}

/**
 * Retry failed emails (mark them as pending again)
 * @param emailIds Array of email IDs to retry
 * @returns Number of emails marked for retry
 */
export async function retryFailedEmails(emailIds: string[]): Promise<number> {
  // Mock implementation for testing
  console.log(`[MOCK] Retrying ${emailIds.length} failed emails`);
  return emailIds.length;
}

/**
 * Clean up old sent emails (older than specified days)
 * @param daysOld Number of days old to consider for cleanup
 * @returns Number of emails deleted
 */
export async function cleanupOldEmails(daysOld: number = 30): Promise<number> {
  // Mock implementation for testing
  console.log(`[MOCK] Cleaning up emails older than ${daysOld} days`);
  return 0;
}

/**
 * Get current email transport stats (for testing/debugging)
 */
export function getTransportStats() {
  const transport = getEmailTransport();
  return transport.getStats();
}

/**
 * Reset transport stats (for testing)
 */
export function resetTransportStats() {
  const transport = getEmailTransport();
  transport.resetStats();
}

/**
 * Get send log from transport (for testing)
 */
export function getTransportSendLog() {
  const transport = getEmailTransport();
  if ('getSendLog' in transport) {
    return (transport as any).getSendLog();
  }
  return [];
}
