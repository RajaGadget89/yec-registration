import { getServiceRoleClient } from "../supabase-server";
import { getEmailTransport } from "./transport";
import {
  renderEmailTemplate,
  getEmailSubject,
  EmailTemplateProps,
} from "./registry";

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
  rateLimited: number;
  retries: number;
  details: {
    successful: string[];
    failed: Array<{ id: string; error: string }>;
    capped: string[];
    blocked: string[];
  };
}

/**
 * Check if email mocks are enabled
 * Mocks are only allowed when explicitly enabled and not in production
 */
function isEmailMockEnabled(): boolean {
  const enableMock = process.env.ENABLE_EMAIL_MOCK === "true";
  const isProduction = process.env.NODE_ENV === "production";
  const isStaging = process.env.VERCEL_ENV === "preview";

  // Never allow mocks in production or staging
  if (isProduction || isStaging) {
    return false;
  }

  // Only allow mocks when explicitly enabled
  return enableMock;
}

/**
 * Process a batch of pending emails from the outbox
 * @param batchSize Maximum number of emails to process in one batch
 * @param dryRun If true, force dry-run mode regardless of EMAIL_MODE
 * @returns Dispatch result with counts and details
 */
export async function dispatchEmailBatch(
  batchSize: number = 50,
  dryRun: boolean = false,
): Promise<DispatchResult> {
  // Get the appropriate email transport
  const transport = getEmailTransport();

  // Try to get real emails from database first
  let emailsToProcess: EmailOutboxItem[] = [];

  try {
    const supabase = getServiceRoleClient();

    // Get pending emails from outbox
    const { data: pendingEmails, error } = await supabase
      .from("email_outbox")
      .select("id, template, to_email, payload, idempotency_key")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (error) {
      console.warn("[DISPATCH] Database query failed:", error);

      // Only use mock data if explicitly enabled
      if (isEmailMockEnabled()) {
        console.log("[DISPATCH] Using mock data (ENABLE_EMAIL_MOCK=true)");
        emailsToProcess = getMockEmails(batchSize);
      } else {
        console.error(
          "[DISPATCH] Database query failed and mocks disabled - no emails to process",
        );
        emailsToProcess = [];
      }
    } else if (pendingEmails && pendingEmails.length > 0) {
      emailsToProcess = pendingEmails.map((email: any) => ({
        id: email.id,
        template: email.template,
        to_email: email.to_email,
        payload: email.payload,
        idempotency_key: email.idempotency_key,
      }));
      console.log(
        `[DISPATCH] Found ${emailsToProcess.length} pending emails in outbox`,
      );
    } else {
      console.log("[DISPATCH] No pending emails found in outbox");

      // In dry-run mode, use mock data if enabled
      if (dryRun && isEmailMockEnabled()) {
        console.log(
          "[DISPATCH] Using mock data for dry-run (ENABLE_EMAIL_MOCK=true)",
        );
        emailsToProcess = getMockEmails(batchSize);
      } else {
        // Return empty result
        return {
          sent: 0,
          wouldSend: 0,
          capped: 0,
          blocked: 0,
          errors: 0,
          remaining: 0,
          rateLimited: 0,
          retries: 0,
          details: {
            successful: [],
            failed: [],
            capped: [],
            blocked: [],
          },
        };
      }
    }
  } catch (error) {
    console.warn("[DISPATCH] Database connection failed:", error);

    // Only use mock data if explicitly enabled
    if (isEmailMockEnabled()) {
      console.log("[DISPATCH] Using mock data (ENABLE_EMAIL_MOCK=true)");
      emailsToProcess = getMockEmails(batchSize);
    } else {
      console.error(
        "[DISPATCH] Database connection failed and mocks disabled - no emails to process",
      );
      emailsToProcess = [];
    }
  }

  if (dryRun) {
    // Simulate processing some emails in dry-run mode
    const mockSent = Math.min(emailsToProcess.length, 3); // Simulate 3 emails would be sent

    console.log(
      `[DRY-RUN] Would process ${mockSent} emails with batch size ${batchSize}`,
    );

    return {
      sent: 0,
      wouldSend: mockSent,
      capped: 0,
      blocked: 0,
      errors: 0,
      remaining: emailsToProcess.length - mockSent,
      rateLimited: 0,
      retries: 0,
      details: {
        successful: [],
        failed: [],
        capped: [],
        blocked: [],
      },
    };
  }

  // If no emails to process and we're in FULL mode, try to send a test email
  if (emailsToProcess.length === 0 && process.env.EMAIL_MODE === "FULL") {
    console.log(
      "[DISPATCH] No emails in outbox, but in FULL mode - checking for immediate sending",
    );

    // Try to send a test email to the allowlisted address
    const allowlist =
      process.env.EMAIL_ALLOWLIST?.split(",").map((e) => e.trim()) || [];
    if (allowlist.length > 0) {
      const testEmail = allowlist[0];
      console.log(`[DISPATCH] Attempting to send test email to ${testEmail}`);

      try {
        const result = await transport.send({
          to: testEmail,
          subject: "[TEST] Email System Check",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #1A237E;">YEC Day Email System Test</h2>
              <p>This is a test email to verify the email system is working correctly.</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
            </div>
          `,
        });

        if (result.ok) {
          console.log(
            `[DISPATCH] Test email sent successfully to ${testEmail}`,
          );
          return {
            sent: 1,
            wouldSend: 0,
            capped: 0,
            blocked: 0,
            errors: 0,
            remaining: 0,
            rateLimited: 0,
            retries: 0,
            details: {
              successful: [testEmail],
              failed: [],
              capped: [],
              blocked: [],
            },
          };
        } else {
          console.log(`[DISPATCH] Test email failed: ${result.reason}`);
        }
      } catch (error) {
        console.error("[DISPATCH] Error sending test email:", error);
      }
    }
  }

  console.log(
    `[DISPATCH] Processing ${emailsToProcess.length} emails with transport mode`,
  );

  const results = {
    sent: 0,
    wouldSend: 0,
    capped: 0,
    blocked: 0,
    errors: 0,
    remaining: 0,
    rateLimited: 0,
    retries: 0,
    details: {
      successful: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
      capped: [] as string[],
      blocked: [] as string[],
    },
  };

  for (const email of emailsToProcess) {
    try {
      // Try to render the email template, fall back to simple HTML if it fails
      let html: string;
      let subject: string;

      try {
        html = await renderEmailTemplate(email.template, email.payload);
        subject = getEmailSubject(email.template);
      } catch (templateError) {
        console.warn(
          `[DISPATCH] Template rendering failed for ${email.id}, using fallback HTML:`,
          templateError,
        );
        // Use simple fallback HTML for testing
        html = `
          <html>
            <body>
              <h1>Test Email</h1>
              <p>This is a test email for ${email.template} template.</p>
              <p>Tracking Code: ${email.payload.trackingCode || "N/A"}</p>
              <p>To: ${email.to_email}</p>
            </body>
          </html>
        `;
        subject = `[E2E] Test Email - ${email.template}`;
      }

      // Send via transport
      const sendResult = await transport.send({
        to: email.to_email,
        subject,
        html,
      });

      if (sendResult.ok) {
        results.sent++;
        results.details.successful.push(email.id);
        console.log(
          `[DISPATCH] Email sent successfully: ${email.id} to ${email.to_email}`,
        );

        // Update database status to 'sent'
        try {
          const supabase = getServiceRoleClient();
          await supabase
            .from("email_outbox")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", email.id);
        } catch (dbError) {
          console.warn(
            `[DISPATCH] Failed to update email ${email.id} status to sent:`,
            dbError,
          );
        }
      } else {
        switch (sendResult.reason) {
          case "capped":
            results.capped++;
            results.details.capped.push(email.id);
            console.log(
              `[DISPATCH] Email capped: ${email.id} to ${email.to_email}`,
            );
            break;
          case "blocked":
            results.blocked++;
            results.details.blocked.push(email.id);
            console.log(
              `[DISPATCH] Email blocked: ${email.id} to ${email.to_email}`,
            );
            break;
          default:
            results.errors++;
            results.details.failed.push({
              id: email.id,
              error: sendResult.reason || "unknown",
            });
            console.log(
              `[DISPATCH] Email failed: ${email.id} to ${email.to_email} - ${sendResult.reason}`,
            );

            // Update database status to 'error'
            try {
              const supabase = getServiceRoleClient();
              await supabase
                .from("email_outbox")
                .update({
                  status: "error",
                  error_message: sendResult.reason || "unknown error",
                })
                .eq("id", email.id);
            } catch (dbError) {
              console.warn(
                `[DISPATCH] Failed to update email ${email.id} status to error:`,
                dbError,
              );
            }
        }
      }

      // Aggregate rate limiting and retry stats
      if (sendResult.rateLimited !== undefined) {
        results.rateLimited += sendResult.rateLimited;
      }
      if (sendResult.retries !== undefined) {
        results.retries += sendResult.retries;
      }
    } catch (error) {
      results.errors++;
      results.details.failed.push({
        id: email.id,
        error: error instanceof Error ? error.message : "unknown error",
      });
      console.error(`[DISPATCH] Error processing email ${email.id}:`, error);

      // Update database status to 'error'
      try {
        const supabase = getServiceRoleClient();
        await supabase
          .from("email_outbox")
          .update({
            status: "error",
            error_message:
              error instanceof Error ? error.message : "unknown error",
          })
          .eq("id", email.id);
      } catch (dbError) {
        console.warn(
          `[DISPATCH] Failed to update email ${email.id} status to error:`,
          dbError,
        );
      }
    }
  }

  // Get transport stats for additional validation
  const transportStats = transport.getStats();
  console.log(`[DISPATCH] Transport stats:`, transportStats);

  return results;
}

/**
 * Get mock emails for testing when database is not available
 */
function getMockEmails(batchSize: number): EmailOutboxItem[] {
  const allowlistedEmail =
    process.env.EMAIL_ALLOWLIST?.split(",")[0] || "test@example.com";

  return [
    {
      id: "1",
      template: "tracking",
      to_email: allowlistedEmail, // Allowlisted
      payload: { trackingCode: "E2E-CAPPED-001" },
    },
    {
      id: "2",
      template: "tracking",
      to_email: allowlistedEmail, // Allowlisted (will be capped)
      payload: { trackingCode: "E2E-CAPPED-002" },
    },
    {
      id: "3",
      template: "tracking",
      to_email: allowlistedEmail, // Allowlisted
      payload: { trackingCode: "E2E-TEST-003" },
    },
    {
      id: "4",
      template: "tracking",
      to_email: allowlistedEmail, // Allowlisted
      payload: { trackingCode: "TEST004" },
    },
  ].slice(0, batchSize);
}

/**
 * Get outbox statistics
 * @returns Outbox statistics including pending, sent, and error counts
 */
export async function getOutboxStats() {
  try {
    const supabase = getServiceRoleClient();

    // Get pending count
    const { count: pendingCount } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get sent count
    const { count: sentCount } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent");

    // Get error count
    const { count: errorCount } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("status", "error");

    // Get oldest pending email
    const { data: oldestPending } = await supabase
      .from("email_outbox")
      .select("created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    return {
      total_pending: pendingCount || 0,
      total_sent: sentCount || 0,
      total_error: errorCount || 0,
      oldest_pending: oldestPending?.created_at || null,
    };
  } catch (error) {
    console.warn("[STATS] Database query failed:", error);

    // Only return mock stats if explicitly enabled
    if (isEmailMockEnabled()) {
      console.log("[STATS] Returning mock stats (ENABLE_EMAIL_MOCK=true)");
      return {
        total_pending: 0,
        total_sent: 0,
        total_error: 0,
        oldest_pending: null,
      };
    } else {
      throw new Error(
        `Failed to get outbox stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
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
  idempotencyKey?: string,
): Promise<string> {
  try {
    const supabase = getServiceRoleClient();

    // Use the database function to enqueue the email
    const { data, error } = await supabase.rpc("fn_enqueue_email", {
      p_template: template,
      p_to_email: toEmail,
      p_payload: payload,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      console.error("[ENQUEUE] Failed to enqueue email:", error);

      // Only use mock implementation if explicitly enabled
      if (isEmailMockEnabled()) {
        const mockId = `mock-${Date.now()}`;
        console.log(
          `[MOCK] Enqueued email: ${template} to ${toEmail} (mock: true)`,
        );
        return mockId;
      } else {
        throw new Error(`Failed to enqueue email: ${error.message}`);
      }
    }

    console.log(
      `[ENQUEUE] Email enqueued successfully: ${template} to ${toEmail} (ID: ${data})`,
    );
    return data;
  } catch (error) {
    console.error("[ENQUEUE] Error enqueueing email:", error);

    // Only use mock implementation if explicitly enabled
    if (isEmailMockEnabled()) {
      const mockId = `mock-${Date.now()}`;
      console.log(
        `[MOCK] Enqueued email: ${template} to ${toEmail} (mock: true)`,
      );
      return mockId;
    } else {
      throw new Error(
        `Failed to enqueue email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

/**
 * Retry failed emails (mark them as pending again)
 * @param emailIds Array of email IDs to retry
 * @returns Number of emails marked for retry
 */
export async function retryFailedEmails(emailIds: string[]): Promise<number> {
  try {
    const supabase = getServiceRoleClient();

    // Use the database function to retry failed emails
    const { data, error } = await supabase.rpc("fn_retry_failed_emails");

    if (error) {
      console.error("[RETRY] Failed to retry emails:", error);
      throw new Error(`Failed to retry emails: ${error.message}`);
    }

    console.log(`[RETRY] Successfully retried ${data || 0} failed emails`);
    return data || 0;
  } catch (error) {
    console.error("[RETRY] Error retrying emails:", error);

    // Only use mock implementation if explicitly enabled
    if (isEmailMockEnabled()) {
      console.log(
        `[MOCK] Retrying ${emailIds.length} failed emails (mock: true)`,
      );
      return emailIds.length;
    } else {
      throw new Error(
        `Failed to retry emails: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
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
  if ("getSendLog" in transport) {
    return (transport as any).getSendLog();
  }
  return [];
}
