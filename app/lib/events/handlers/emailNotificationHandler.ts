import { EventHandler, RegistrationEvent } from "../types";
import { hasEmailConfig } from "../../config";
import { enqueueEmail } from "../../emails/dispatcher";
import { getEmailSubject } from "../../emails/registry";
import { getBaseUrl, getEmailFromAddress } from "../../config";

/**
 * Enhanced handler for sending email notifications based on events
 * Uses the outbox pattern for reliable email delivery
 */
export class EmailNotificationHandler
  implements EventHandler<RegistrationEvent>
{
  async handle(event: RegistrationEvent): Promise<void> {
    // Check if email configuration is available
    if (!hasEmailConfig()) {
      console.warn(
        "Email configuration not available, skipping email notification",
      );
      return;
    }

    try {
      let result;

      switch (event.type) {
        case "registration.submitted":
          result = await this.enqueueTrackingEmail(event.payload.registration, event.id as string);
          break;

        case "admin.request_update":
          result = await this.enqueueUpdateRequestEmail(
            event.payload.registration,
            event.payload.admin_email,
            event.payload.dimension,
            event.payload.notes,
            event.id as string
          );
          break;

        case "admin.approved":
          result = await this.enqueueApprovalEmail(
            event.payload.registration,
            event.payload.admin_email,
            event.id as string
          );
          break;

        case "admin.rejected":
          result = await this.enqueueRejectionEmail(
            event.payload.registration,
            event.payload.admin_email,
            event.payload.reason as "deadline_missed" | "ineligible_rule_match" | "other",
            event.id as string
          );
          break;

        case "registration.batch_upserted":
          // For batch updates, send tracking email to notify of changes
          result = await this.enqueueTrackingEmail(event.payload.registration, event.id as string);
          break;

        case "admin.mark_pass":
          // When admin marks a dimension as passed, check if all are passed for auto-approval
          // This will be handled by the database trigger, but we can log it
          console.log(
            `Admin marked ${event.payload.dimension} as passed for registration ${event.payload.registration.id}`,
          );
          return;

        case "user.resubmitted":
          // When user resubmits, we don't send an email immediately
          // The system will process the resubmission and potentially trigger approval
          console.log(
            `User resubmitted for registration ${event.payload.registration.id}`,
          );
          return;

        default:
          console.warn(
            `No email template defined for event type: ${event.type}`,
          );
          return;
      }

      if (result) {
        console.log(`Email enqueued successfully for event ${event.type}:`, {
          outboxId: result,
          eventId: event.id,
          correlationId: event.correlation_id,
        });
      }
    } catch (error) {
      console.error("EmailNotificationHandler error:", error);
      // Don't throw error to prevent event processing from failing
      // Email failures should not break the main workflow
    }
  }

  /**
   * Enqueue tracking email for new registrations
   */
  private async enqueueTrackingEmail(
    registration: any,
    eventId?: string
  ): Promise<string | null> {
    const applicantName = `${registration.first_name} ${registration.last_name}`.trim();
    
    const payload = {
      applicantName,
      trackingCode: registration.registration_id,
      supportEmail: getEmailFromAddress(),
      brandTokens: {
        logoUrl: process.env.EMAIL_LOGO_URL,
        primaryColor: process.env.EMAIL_PRIMARY_COLOR || "#1A237E",
        secondaryColor: process.env.EMAIL_SECONDARY_COLOR || "#4285C5",
      },
    };

    const idempotencyKey = `tracking:${registration.id}:${eventId || `event-${Date.now()}`}`;

    try {
      const outboxId = await enqueueEmail(
        "tracking",
        registration.email,
        payload,
        idempotencyKey
      );

      console.log(`Tracking email enqueued for ${registration.email}:`, {
        outboxId,
        trackingCode: registration.registration_id,
      });

      return outboxId;
    } catch (error) {
      console.error("Failed to enqueue tracking email:", error);
      return null;
    }
  }

  /**
   * Enqueue update request email with deep-link token
   */
  private async enqueueUpdateRequestEmail(
    registration: any,
    adminEmail: string,
    dimension: "payment" | "profile" | "tcc",
    notes?: string,
    eventId?: string
  ): Promise<string | null> {
    const applicantName = `${registration.first_name} ${registration.last_name}`.trim();
    
    // Determine template based on dimension
    let template: string;
    switch (dimension) {
      case "payment":
        template = "update-payment";
        break;
      case "profile":
        template = "update-info";
        break;
      case "tcc":
        template = "update-tcc";
        break;
      default:
        throw new Error(`Invalid dimension: ${dimension}`);
    }

    const payload = {
      applicantName,
      trackingCode: registration.registration_id,
      dimension,
      notes,
      supportEmail: getEmailFromAddress(),
      brandTokens: {
        logoUrl: process.env.EMAIL_LOGO_URL,
        primaryColor: process.env.EMAIL_PRIMARY_COLOR || "#1A237E",
        secondaryColor: process.env.EMAIL_SECONDARY_COLOR || "#4285C5",
      },
      // Add payment-specific props for payment template
      ...(dimension === "payment" && {
        priceApplied: registration.price_applied?.toString() || "0",
        packageName: registration.selected_package_code || "Standard Package",
      }),
    };

    const idempotencyKey = `update-request:${registration.id}:${dimension}:${eventId || `event-${Date.now()}`}`;

    try {
      const outboxId = await enqueueEmail(
        template,
        registration.email,
        payload,
        idempotencyKey
      );

      console.log(`Update request email enqueued for ${registration.email}:`, {
        outboxId,
        template,
        dimension,
      });

      return outboxId;
    } catch (error) {
      console.error("Failed to enqueue update request email:", error);
      return null;
    }
  }

  /**
   * Enqueue approval email with badge
   */
  private async enqueueApprovalEmail(
    registration: any,
    adminEmail: string,
    eventId?: string
  ): Promise<string | null> {
    const applicantName = `${registration.first_name} ${registration.last_name}`.trim();
    
    const payload = {
      applicantName,
      trackingCode: registration.registration_id,
      badgeUrl: "", // Will be generated by the email dispatcher
      supportEmail: getEmailFromAddress(),
      brandTokens: {
        logoUrl: process.env.EMAIL_LOGO_URL,
        primaryColor: process.env.EMAIL_PRIMARY_COLOR || "#1A237E",
        secondaryColor: process.env.EMAIL_SECONDARY_COLOR || "#4285C5",
      },
    };

    const idempotencyKey = `approval:${registration.id}:${eventId || `event-${Date.now()}`}`;

    try {
      const outboxId = await enqueueEmail(
        "approval-badge",
        registration.email,
        payload,
        idempotencyKey
      );

      console.log(`Approval email enqueued for ${registration.email}:`, {
        outboxId,
      });

      return outboxId;
    } catch (error) {
      console.error("Failed to enqueue approval email:", error);
      return null;
    }
  }

  /**
   * Enqueue rejection email
   */
  private async enqueueRejectionEmail(
    registration: any,
    adminEmail: string,
    rejectedReason: "deadline_missed" | "ineligible_rule_match" | "other",
    eventId?: string
  ): Promise<string | null> {
    const applicantName = `${registration.first_name} ${registration.last_name}`.trim();
    
    const payload = {
      applicantName,
      trackingCode: registration.registration_id,
      rejectedReason,
      supportEmail: getEmailFromAddress(),
      brandTokens: {
        logoUrl: process.env.EMAIL_LOGO_URL,
        primaryColor: process.env.EMAIL_PRIMARY_COLOR || "#1A237E",
        secondaryColor: process.env.EMAIL_SECONDARY_COLOR || "#4285C5",
      },
    };

    const idempotencyKey = `rejection:${registration.id}:${eventId || `event-${Date.now()}`}`;

    try {
      const outboxId = await enqueueEmail(
        "rejection",
        registration.email,
        payload,
        idempotencyKey
      );

      console.log(`Rejection email enqueued for ${registration.email}:`, {
        outboxId,
        reason: rejectedReason,
      });

      return outboxId;
    } catch (error) {
      console.error("Failed to enqueue rejection email:", error);
      return null;
    }
  }
}
