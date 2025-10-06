import { getSupabaseServiceClient } from "../supabase-server";
import { sendApprovalEmail } from "../emails/enhancedEmailService";

export interface EmailNotificationResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export interface EmailNotificationData {
  registrationId: string;
  email: string;
  firstName: string;
  lastName: string;
  badgeUrl: string;
  trackingCode: string;
}

export class EmailNotificationService {
  private supabase: any;

  constructor() {
    this.supabase = getSupabaseServiceClient();
  }

  /**
   * Send congratulation email with badge to imported registration
   * Uses the same template as traditional system for consistency
   */
  async sendImportCongratulationEmail(
    data: EmailNotificationData,
  ): Promise<EmailNotificationResult> {
    try {
      console.log(`📧 Sending import congratulation email to: ${data.email}`);

      // Prepare email data using traditional approval-badge template
      const emailData = {
        to: data.email,
        subject:
          "[YEC Day] อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar",
        template: "approval-badge",
        data: {
          applicantName: `${data.firstName} ${data.lastName}`.trim(),
          trackingCode: data.trackingCode,
          badgeUrl: data.badgeUrl,
          supportEmail: process.env.EMAIL_FROM || "info@yecday.com",
          brandTokens: {
            logoUrl: process.env.BRAND_LOGO_URL,
            primaryColor: process.env.BRAND_PRIMARY_COLOR || "#2F68C9",
            secondaryColor: process.env.BRAND_SECONDARY_COLOR || "#1A237E",
          },
        },
      };

      // Create a registration object for the email service
      const registration = {
        first_name: data.firstName,
        last_name: data.lastName,
        registration_id: data.trackingCode,
        email: data.email,
      } as any; // Type assertion for compatibility

      // Send email using existing email service
      const result = await sendApprovalEmail(
        registration,
        data.badgeUrl,
        emailData.data.brandTokens,
      );

      if (result.ok) {
        // Update registration with email sent status
        await this.updateEmailSentStatus(data.registrationId, true);

        console.log(`✅ Import congratulation email sent to: ${data.email}`);
        return {
          success: true,
          emailId: result.trackingCode || data.trackingCode,
        };
      } else {
        throw new Error(result.error || "Email sending failed");
      }
    } catch (error: any) {
      console.error(
        `❌ Failed to send import congratulation email to ${data.email}:`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send congratulation emails for multiple registrations in batch
   */
  async sendBatchCongratulationEmails(
    registrations: EmailNotificationData[],
  ): Promise<EmailNotificationResult[]> {
    const results: EmailNotificationResult[] = [];

    // Process in batches to avoid overwhelming the email service
    const batchSize = 10;
    for (let i = 0; i < registrations.length; i += batchSize) {
      const batch = registrations.slice(i, i + batchSize);

      const batchPromises = batch.map((registration) =>
        this.sendImportCongratulationEmail(registration),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < registrations.length) {
        await this.delay(2000); // 2 second delay between batches
      }
    }

    return results;
  }

  /**
   * Queue email for later sending (for batch processing)
   * Uses the same template as traditional system for consistency
   */
  async queueImportEmail(
    data: EmailNotificationData,
  ): Promise<EmailNotificationResult> {
    try {
      console.log(`📬 Queueing import email for: ${data.email}`);

      // Use the existing database function to enqueue email (same as traditional system)
      const { data: emailId, error } = await this.supabase.rpc(
        "fn_enqueue_email",
        {
          p_template: "approval-badge",
          p_to_email: data.email,
          p_payload: {
            applicantName: `${data.firstName} ${data.lastName}`.trim(),
            trackingCode: data.trackingCode,
            badgeUrl: data.badgeUrl,
            supportEmail: process.env.EMAIL_FROM || "info@yecday.com",
            brandTokens: {
              logoUrl: process.env.BRAND_LOGO_URL,
              primaryColor: process.env.BRAND_PRIMARY_COLOR || "#2F68C9",
              secondaryColor: process.env.BRAND_SECONDARY_COLOR || "#1A237E",
            },
          },
          p_idempotency_key: `import:${data.trackingCode}:${data.email}`,
        },
      );

      if (error) {
        throw new Error(`Failed to queue email: ${error.message}`);
      }

      return {
        success: true,
        emailId: emailId,
      };
    } catch (error: any) {
      console.error(
        `❌ Failed to queue import email for ${data.email}:`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update registration email sent status
   */
  private async updateEmailSentStatus(
    registrationId: string,
    emailSent: boolean,
  ): Promise<void> {
    try {
      const updateData: any = { email_sent: emailSent };

      if (emailSent) {
        updateData.email_sent_at = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from("registrations")
        .update(updateData)
        .eq("registration_id", registrationId);

      if (error) {
        throw new Error(`Failed to update email status: ${error.message}`);
      }

      console.log(
        `✅ Email status updated for registration: ${registrationId}`,
      );
    } catch (error: any) {
      console.error(
        `❌ Failed to update email status for ${registrationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get email statistics for import session
   */
  async getImportEmailStats(sessionId: string): Promise<{
    totalRegistrations: number;
    emailsSent: number;
    emailsPending: number;
    emailsFailed: number;
  }> {
    try {
      // Get registrations created in this import session
      const { data: session } = await this.supabase
        .from("import_sessions")
        .select("created_at")
        .eq("id", sessionId)
        .single();

      if (!session) {
        throw new Error("Import session not found");
      }

      // Count total registrations
      const { count: totalRegistrations } = await this.supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", session.created_at);

      // Count emails sent
      const { count: emailsSent } = await this.supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", session.created_at)
        .eq("email_sent", true);

      // Count pending emails in outbox (using traditional template)
      const { count: emailsPending } = await this.supabase
        .from("email_outbox")
        .select("*", { count: "exact", head: true })
        .eq("template", "approval-badge")
        .eq("status", "pending");

      // Count failed emails in outbox (using traditional template)
      const { count: emailsFailed } = await this.supabase
        .from("email_outbox")
        .select("*", { count: "exact", head: true })
        .eq("template", "approval-badge")
        .eq("status", "failed");

      return {
        totalRegistrations: totalRegistrations || 0,
        emailsSent: emailsSent || 0,
        emailsPending: emailsPending || 0,
        emailsFailed: emailsFailed || 0,
      };
    } catch (error: any) {
      console.error("❌ Failed to get import email stats:", error);
      throw error;
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
