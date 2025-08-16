import { EventHandler, RegistrationEvent } from "../types";
import { getSupabaseServiceClient } from "../../supabase-server";
import { getThailandTimeISOString } from "../../timezoneUtils";

/**
 * Handler for updating registration status based on events
 * Note: Most status updates are now handled by database triggers in Phase 1
 * This handler is kept for backward compatibility and special cases
 */
export class StatusUpdateHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    // In Phase 1, most status updates are handled by database triggers
    // This handler is kept for special cases and backward compatibility

    const supabase = getSupabaseServiceClient();
    const now = getThailandTimeISOString();

    try {
      switch (event.type) {
        case "registration.submitted":
          // Status is set to 'waiting_for_review' by the database trigger
          // No additional action needed here
          console.log(
            `Registration ${event.payload.registration.registration_id} submitted - status handled by trigger`,
          );
          break;

        case "admin.approved":
          // Update to approved status (this should be rare as triggers handle most cases)
          const { error: approveError } = await supabase
            .from("registrations")
            .update({
              status: "approved",
              updated_at: now,
            })
            .eq("id", event.payload.registration.id);

          if (approveError) {
            throw new Error(
              `Failed to update registration status to approved: ${approveError.message}`,
            );
          }

          console.log(
            `Updated registration ${event.payload.registration.registration_id} status to approved`,
          );
          break;

        case "admin.rejected":
          // Update to rejected status
          const { error: rejectError } = await supabase
            .from("registrations")
            .update({
              status: "rejected",
              rejected_reason: event.payload.reason || "Admin rejection",
              updated_at: now,
            })
            .eq("id", event.payload.registration.id);

          if (rejectError) {
            throw new Error(
              `Failed to update registration status to rejected: ${rejectError.message}`,
            );
          }

          console.log(
            `Updated registration ${event.payload.registration.registration_id} status to rejected`,
          );
          break;

        case "document.reuploaded":
          // After re-upload, set status back to waiting_for_review
          const { error: reuploadError } = await supabase
            .from("registrations")
            .update({
              status: "waiting_for_review",
              update_reason: null,
              updated_at: now,
            })
            .eq("id", event.payload.registration.id);

          if (reuploadError) {
            throw new Error(
              `Failed to update registration status after re-upload: ${reuploadError.message}`,
            );
          }

          console.log(
            `Updated registration ${event.payload.registration.registration_id} status to waiting_for_review after re-upload`,
          );
          break;

        case "admin.review_track_updated":
          // Track updates are handled by database triggers
          // This handler just logs the event
          const trackPayload = event.payload as any; // Type assertion for track update event
          console.log(
            `Track ${trackPayload.track} updated to ${trackPayload.track_status} for registration ${event.payload.registration.registration_id}`,
          );
          break;

        case "auto_reject.sweep_completed":
          // Auto-reject sweep results are handled by the sweep function
          // This handler just logs the event
          const autoRejectPayload = event.payload as any; // Type assertion for auto-reject event
          console.log(
            `Auto-reject sweep completed, ${autoRejectPayload.rejected_registrations?.length || 0} registrations rejected`,
          );
          break;

        default:
          console.log(
            `StatusUpdateHandler: No action needed for event type ${event.type}`,
          );
      }
    } catch (error) {
      console.error("StatusUpdateHandler error:", error);
      throw error;
    }
  }
}
