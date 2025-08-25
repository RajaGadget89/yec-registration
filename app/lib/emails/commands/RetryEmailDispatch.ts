import { EventFactory } from "../../events/eventFactory";
import { EventService } from "../../events/eventService";
import { getServiceRoleClient } from "../../supabase-server";

/**
 * Core use case for retrying failed emails
 * Publishes a domain event that triggers the retry process
 */
export class RetryEmailDispatch {
  /**
   * Execute the retry command
   */
  async execute(
    emailIds: string[],
    adminEmail: string,
    reason?: string,
  ): Promise<void> {
    try {
      // Validate input
      if (!emailIds || emailIds.length === 0) {
        throw new Error("No email IDs provided for retry");
      }

      if (!adminEmail) {
        throw new Error("Admin email is required for retry operation");
      }

      // Verify that the emails exist and are in failed status
      const supabase = getServiceRoleClient();
      const { data: emails, error } = await supabase
        .from("email_outbox")
        .select("id, status")
        .in("id", emailIds);

      if (error) {
        throw new Error(`Failed to verify email status: ${error.message}`);
      }

      if (!emails || emails.length === 0) {
        throw new Error("No emails found with the provided IDs");
      }

      // Check that all emails are in failed status
      const nonFailedEmails = emails.filter(
        (email) => email.status !== "failed",
      );
      if (nonFailedEmails.length > 0) {
        const nonFailedIds = nonFailedEmails.map((email) => email.id);
        throw new Error(
          `Cannot retry emails that are not in failed status: ${nonFailedIds.join(", ")}`,
        );
      }

      // Create and emit the retry event
      const retryEvent = EventFactory.createEmailRetryRequested(
        emailIds,
        adminEmail,
        reason,
      );

      await EventService.emit(retryEvent);

      console.log(
        `[RETRY] Email retry event emitted for ${emailIds.length} emails`,
        {
          eventId: retryEvent.id,
          emailIds,
          adminEmail,
        },
      );
    } catch (error) {
      console.error("[RETRY] Failed to retry emails:", error);
      throw new Error(
        `Failed to retry emails: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
