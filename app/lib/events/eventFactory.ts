import { randomUUID } from "crypto";
import {
  RegistrationEvent,
  BatchRegistrationEvent,
  AutoRejectSweepEvent,
  EmailRetryEvent,
  AdminEvent,
} from "./types";
import { Registration } from "../../types/database";

/**
 * Factory for creating domain events
 * Ensures consistent event structure and validation
 */
export class EventFactory {
  /**
   * Create a registration submitted event
   */
  static createRegistrationSubmitted(
    registration: Registration,
    priceApplied?: number,
    selectedPackage?: string,
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "registration.submitted",
      payload: {
        registration,
        price_applied: priceApplied,
        selected_package: selectedPackage,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create a registration batch upserted event
   */
  static createRegistrationBatchUpserted(
    registrations: Registration[],
    adminEmail?: string,
  ): BatchRegistrationEvent {
    return {
      id: randomUUID(),
      type: "registration.batch_upserted",
      payload: {
        registrations,
        admin_email: adminEmail,
      },
      timestamp: new Date().toISOString(),
      correlation_id: `batch_${Date.now()}`,
    };
  }

  /**
   * Create an admin request update event
   */
  static createAdminRequestUpdate(
    registration: Registration,
    adminEmail: string,
    dimension: "payment" | "profile" | "tcc",
    notes?: string,
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "admin.request_update",
      payload: {
        registration,
        admin_email: adminEmail,
        dimension,
        notes,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create an admin approved event
   */
  static createAdminApproved(
    registration: Registration,
    adminEmail: string,
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "admin.approved",
      payload: {
        registration,
        admin_email: adminEmail,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create an admin rejected event
   */
  static createAdminRejected(
    registration: Registration,
    adminEmail: string,
    reason?: string,
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "admin.rejected",
      payload: {
        registration,
        admin_email: adminEmail,
        reason,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create a document re-uploaded event
   */
  static createDocumentReuploaded(
    registration: Registration,
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "document.reuploaded",
      payload: {
        registration,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create an admin review track updated event
   */
  static createAdminReviewTrackUpdated(
    registration: Registration,
    adminEmail: string,
    dimension: "payment" | "profile" | "tcc",
    dimensionStatus: "pending" | "needs_update" | "passed" | "rejected",
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "admin.review_track_updated",
      payload: {
        registration,
        admin_email: adminEmail,
        dimension,
        dimension_status: dimensionStatus,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create an admin mark pass event
   */
  static createAdminMarkPass(
    registration: Registration,
    adminEmail: string,
    dimension: "payment" | "profile" | "tcc",
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "admin.mark_pass",
      payload: {
        registration,
        admin_email: adminEmail,
        dimension,
        dimension_status: "passed",
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create a user resubmitted event
   */
  static createUserResubmitted(
    registration: Registration,
    updates: Record<string, any>,
  ): RegistrationEvent {
    return {
      id: randomUUID(),
      type: "user.resubmitted",
      payload: {
        registration,
        updates,
      },
      timestamp: new Date().toISOString(),
      correlation_id: registration.registration_id,
    };
  }

  /**
   * Create an auto-reject sweep completed event
   */
  static createAutoRejectSweepCompleted(
    rejectedRegistrations: Array<{
      registration_id: string;
      reason: "deadline_missed" | "ineligible_rule_match";
      email: string;
      first_name: string;
      last_name: string;
    }>,
  ): AutoRejectSweepEvent {
    return {
      id: randomUUID(),
      type: "auto_reject.sweep_completed",
      payload: {
        rejected_registrations: rejectedRegistrations,
        sweep_timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      correlation_id: `sweep_${Date.now()}`,
    };
  }

  /**
   * Create an email retry requested event
   */
  static createEmailRetryRequested(
    emailIds: string[],
    adminEmail: string,
    reason?: string,
  ): EmailRetryEvent {
    return {
      id: randomUUID(),
      type: "email.retry_requested",
      payload: {
        email_ids: emailIds,
        admin_email: adminEmail,
        reason,
      },
      timestamp: new Date().toISOString(),
      correlation_id: `email_retry_${Date.now()}`,
    };
  }

  // Admin Management Event Factory Methods

  /**
   * Create an admin invitation created event
   */
  static createAdminInvitationCreated(
    invitationId: string,
    email: string,
    invitedBy: string,
  ): AdminEvent {
    return {
      id: randomUUID(),
      type: "admin.invitation.created",
      payload: {
        invitation_id: invitationId,
        email,
        invited_by: invitedBy,
      },
      timestamp: new Date().toISOString(),
      correlation_id: invitationId,
    };
  }

  /**
   * Create an admin invitation accepted event
   */
  static createAdminInvitationAccepted(
    invitationId: string,
    adminId: string,
  ): AdminEvent {
    return {
      id: randomUUID(),
      type: "admin.invitation.accepted",
      payload: {
        invitation_id: invitationId,
        admin_id: adminId,
      },
      timestamp: new Date().toISOString(),
      correlation_id: invitationId,
    };
  }

  /**
   * Create an admin role assigned event
   */
  static createAdminRoleAssigned(
    adminId: string,
    role: "admin" | "super_admin",
  ): AdminEvent {
    return {
      id: randomUUID(),
      type: "admin.role.assigned",
      payload: {
        admin_id: adminId,
        role,
      },
      timestamp: new Date().toISOString(),
      correlation_id: adminId,
    };
  }

  /**
   * Create an admin role revoked event
   */
  static createAdminRoleRevoked(
    adminId: string,
    role: "admin" | "super_admin",
  ): AdminEvent {
    return {
      id: randomUUID(),
      type: "admin.role.revoked",
      payload: {
        admin_id: adminId,
        role,
      },
      timestamp: new Date().toISOString(),
      correlation_id: adminId,
    };
  }

  /**
   * Create an admin suspended event
   */
  static createAdminSuspended(adminId: string): AdminEvent {
    return {
      id: randomUUID(),
      type: "admin.suspended",
      payload: {
        admin_id: adminId,
        status: "suspended",
      },
      timestamp: new Date().toISOString(),
      correlation_id: adminId,
    };
  }

  /**
   * Create an admin activated event
   */
  static createAdminActivated(adminId: string): AdminEvent {
    return {
      id: randomUUID(),
      type: "admin.activated",
      payload: {
        admin_id: adminId,
        status: "active",
      },
      timestamp: new Date().toISOString(),
      correlation_id: adminId,
    };
  }

  static createAdminInvitationRevoked(
    invitationId: string,
    email: string,
    revokedBy: string
  ): AdminEvent {
    return {
      id: randomUUID(),
      type: "admin.invitation.revoked",
      payload: {
        invitation_id: invitationId,
        email,
        invited_by: revokedBy,
      },
      timestamp: new Date().toISOString(),
      correlation_id: invitationId,
    };
  }
}
