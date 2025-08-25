import { EventHandler, EmailRetryEvent } from "../types";
import { getServiceRoleClient } from "../../supabase-server";

/**
 * Handler for email retry events
 * Marks failed emails as pending for retry
 */
export class EmailRetryHandler implements EventHandler<EmailRetryEvent> {
  async handle(event: EmailRetryEvent): Promise<void> {
    try {
      const { email_ids, admin_email } = event.payload;

      console.log(
        `[EMAIL_RETRY_HANDLER] Processing retry for ${email_ids.length} emails`,
        {
          eventId: event.id,
          adminEmail: admin_email,
        },
      );

      const supabase = getServiceRoleClient();

      // Mark the emails as pending for retry
      const { data, error } = await supabase
        .from("email_outbox")
        .update({
          status: "pending",
          attempts: 0,
          next_attempt: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .in("id", email_ids)
        .eq("status", "failed")
        .select("id");

      if (error) {
        console.error(
          "[EMAIL_RETRY_HANDLER] Failed to update email status:",
          error,
        );
        throw new Error(`Failed to retry emails: ${error.message}`);
      }

      const retriedCount = data?.length || 0;
      console.log(
        `[EMAIL_RETRY_HANDLER] Successfully marked ${retriedCount} emails for retry`,
        {
          eventId: event.id,
          retriedEmails: data?.map((email) => email.id) || [],
        },
      );

      // Log to audit system
      await supabase.from("audit_logs").insert({
        event_type: "email.outbox.retry",
        event_data: {
          eventId: event.id,
          adminEmail: admin_email,
          emailIds: email_ids,
          retriedCount,
          correlationId: event.correlation_id,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "[EMAIL_RETRY_HANDLER] Error processing retry event:",
        error,
      );
      // Don't re-throw - handlers should be fire-and-forget
    }
  }
}
