import { EventHandler, RegistrationEvent } from "../types";
import { logEvent } from "../../audit/auditClient";
import { getRequestId } from "../../audit/requestContext";
import { maskEmail, extractSafeRegistrationData } from "../../audit/pii";

/**
 * Audit domain handler that translates domain events to logEvent() calls
 * Ensures PII safety and proper correlation with request IDs
 */
export class AuditDomainHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    try {
      // Try to get correlation ID from event correlation_id first, then fall back to request context
      const correlationId = event.correlation_id || getRequestId();

      // Debug logging for test environment
      if (process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST) {
        console.debug(
          `[AUDIT] Processing event ${event.type} with correlation_id ${correlationId}`,
        );
      }

      switch (event.type) {
        case "registration.submitted":
          await this.handleRegistrationSubmitted(event, correlationId);
          break;

        case "registration.batch_upserted":
          await this.handleRegistrationBatchUpserted(event, correlationId);
          break;

        case "admin.request_update":
          await this.handleAdminRequestUpdate(event, correlationId);
          break;

        case "admin.approved":
          await this.handleAdminApproved(event, correlationId);
          break;

        case "admin.rejected":
          await this.handleAdminRejected(event, correlationId);
          break;

        case "document.reuploaded":
          await this.handleDocumentReuploaded(event, correlationId);
          break;

        case "status.changed":
          await this.handleStatusChanged(event, correlationId);
          break;

        case "login.submitted":
          await this.handleLoginSubmitted(event, correlationId);
          break;

        case "login.succeeded":
          await this.handleLoginSucceeded(event, correlationId);
          break;

        default:
          console.warn(
            `Unhandled event type in AuditDomainHandler: ${(event as any).type}`,
          );
      }
    } catch (error) {
      // Fire-and-forget: never throw, only log in development
      if (process.env.NODE_ENV === "development") {
        console.warn("Audit domain handler error:", error);
      }
    }
  }

  private async handleRegistrationSubmitted(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { registration } = event.payload as any;

    // Log RegisterSubmitted event
    await logEvent({
      action: "RegisterSubmitted",
      resource: "User",
      correlation_id: correlationId,
      actor_role: "user",
      result: "success",
      meta: {
        email_masked: maskEmail(registration.email),
      },
    });

    // Log RegistrationCreated event
    await logEvent({
      action: "RegistrationCreated",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "system",
      result: "success",
      meta: extractSafeRegistrationData(registration),
    });

    // Log StatusChanged event for initial status
    await logEvent({
      action: "StatusChanged",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "system",
      result: "success",
      reason: "Initial status set",
      meta: {
        before_status: "pending",
        after_status: "waiting_for_review",
      },
    });
  }

  private async handleRegistrationBatchUpserted(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { registrations, updatedCount } = event.payload as any;

    // Log batch registration creation
    await logEvent({
      action: "RegistrationCreated",
      resource: "Registration",
      correlation_id: correlationId,
      actor_role: "admin",
      result: "success",
      meta: { count: updatedCount },
    });

    // Log status changes for each registration
    for (const registration of registrations) {
      await logEvent({
        action: "StatusChanged",
        resource: "Registration",
        correlation_id: correlationId,
        resource_id: registration.registration_id,
        actor_role: "admin",
        result: "success",
        reason: "Batch registration processed",
        meta: {
          before_status: registration.status,
          after_status: "waiting_for_review",
        },
      });
    }
  }

  private async handleAdminRequestUpdate(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { registration, reason } = event.payload as any;

    // Log AdminReviewed event (sendback)
    await logEvent({
      action: "AdminReviewed",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "admin",
      result: "success",
      reason: reason || "Update requested",
      meta: extractSafeRegistrationData(registration),
    });

    // Log StatusChanged event
    await logEvent({
      action: "StatusChanged",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "admin",
      result: "success",
      reason: reason || "Update requested",
      meta: {
        before_status: registration.status,
        after_status: "pending",
      },
    });
  }

  private async handleAdminApproved(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { registration, reason } = event.payload as any;

    // Log AdminReviewed event (approved)
    await logEvent({
      action: "AdminReviewed",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "admin",
      result: "success",
      reason: reason || "Registration approved",
      meta: extractSafeRegistrationData(registration),
    });

    // Log StatusChanged event
    await logEvent({
      action: "StatusChanged",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "admin",
      result: "success",
      reason: reason || "Registration approved",
      meta: {
        before_status: registration.status,
        after_status: "approved",
      },
    });

    // Log BadgeIssued event (if badge URL exists)
    if (registration.badge_url) {
      await logEvent({
        action: "BadgeIssued",
        resource: "Badge",
        correlation_id: correlationId,
        resource_id: registration.registration_id,
        actor_role: "system",
        result: "success",
        meta: {
          badge_url: registration.badge_url,
        },
      });
    }
  }

  private async handleAdminRejected(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { registration, reason } = event.payload as any;

    // Log AdminReviewed event (rejected)
    await logEvent({
      action: "AdminReviewed",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "admin",
      result: "success",
      reason: reason || "Registration rejected",
      meta: extractSafeRegistrationData(registration),
    });

    // Log StatusChanged event
    await logEvent({
      action: "StatusChanged",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "admin",
      result: "success",
      reason: reason || "Registration rejected",
      meta: {
        before_status: registration.status,
        after_status: "rejected",
      },
    });
  }

  private async handleDocumentReuploaded(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { registration, documentType } = event.payload as any;

    // Log DocumentReuploaded event
    await logEvent({
      action: "DocumentReuploaded",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "user",
      result: "success",
      meta: { type: documentType },
    });

    // Log StatusChanged event (back to waiting for review)
    await logEvent({
      action: "StatusChanged",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: "user",
      result: "success",
      reason: `Document ${documentType} re-uploaded`,
      meta: {
        before_status: registration.status,
        after_status: "waiting_for_review",
      },
    });
  }

  private async handleStatusChanged(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { registration, beforeStatus, afterStatus, reason, actorRole } =
      event.payload as any;

    // Log StatusChanged event
    await logEvent({
      action: "StatusChanged",
      resource: "Registration",
      correlation_id: correlationId,
      resource_id: registration.registration_id,
      actor_role: actorRole,
      result: "success",
      reason: reason || `Status changed from ${beforeStatus} to ${afterStatus}`,
      meta: {
        before_status: beforeStatus,
        after_status: afterStatus,
      },
    });
  }

  private async handleLoginSubmitted(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { email } = event.payload as any;

    // Log LoginSubmitted event
    await logEvent({
      action: "LoginSubmitted",
      resource: "User",
      correlation_id: correlationId,
      actor_role: "user",
      result: "success",
      meta: {
        email_masked: maskEmail(email),
      },
    });
  }

  private async handleLoginSucceeded(
    event: RegistrationEvent,
    correlationId: string,
  ): Promise<void> {
    const { email, adminEmail } = event.payload as any;

    // Log LoginSucceeded event
    await logEvent({
      action: "LoginSucceeded",
      resource: "User",
      correlation_id: correlationId,
      actor_role: "system",
      result: "success",
      meta: {
        email_masked: maskEmail(email),
        admin_email_masked: adminEmail ? maskEmail(adminEmail) : undefined,
      },
    });
  }
}
