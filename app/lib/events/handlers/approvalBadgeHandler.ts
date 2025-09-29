import { EventHandler, RegistrationEvent } from "../types";
import { approvalBadgeService } from "../../approvalBadgeService";

export class ApprovalBadgeHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    console.log(
      `🔍 ApprovalBadgeHandler.handle called with event type: ${event.type}`,
    );
    try {
      switch (event.type) {
        case "admin.approved":
          console.log(`🔍 Processing admin.approved event`);
          await this.handleAdminApproved(event);
          break;
        case "user.resubmitted":
          console.log(`🔍 Processing user.resubmitted event`);
          await this.handleUserResubmitted(event);
          break;
        default:
          console.log(`🔍 No action needed for event type: ${event.type}`);
          // No action needed for other events
          break;
      }
    } catch (error) {
      console.error("ApprovalBadgeHandler error:", error);
      // Don't throw - badge generation failure shouldn't break the workflow
    }
  }

  private async handleAdminApproved(event: RegistrationEvent) {
    console.log(
      `🔍 ApprovalBadgeHandler.handleAdminApproved called with event:`,
      {
        type: event.type,
        registrationId: event.payload?.registration?.registration_id,
        status: event.payload?.registration?.status,
      },
    );

    const { registration } = event.payload as any;

    if (registration.status === "approved") {
      console.log(
        `🏆 Admin approved - generating approval badge for: ${registration.registration_id}`,
      );
      try {
        // Always use fresh data from database, not event payload data
        const badgeUrl = await approvalBadgeService.generateApprovalBadge(
          registration.registration_id,
        );
        console.log(`✅ Approval badge generated successfully: ${badgeUrl}`);
      } catch (error) {
        console.error(
          `❌ Approval badge generation failed for ${registration.registration_id}:`,
          error,
        );
      }
    } else {
      console.log(
        `⚠️ Registration not approved, status: ${registration.status}, skipping badge generation`,
      );
    }
  }

  private async handleUserResubmitted(event: RegistrationEvent) {
    const { registration } = event.payload as any;

    if (registration.status === "approved") {
      console.log(
        `🔄 User resubmitted - regenerating badge for: ${registration.registration_id}`,
      );
      await approvalBadgeService.regenerateBadge(registration.registration_id);
    }
  }
}
