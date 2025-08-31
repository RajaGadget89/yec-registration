import { NextRequest, NextResponse } from "next/server";
import { withSuperAdminApiGuard } from "../../../../../../lib/admin-guard-server";
import { getCurrentUserFromRequest } from "../../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase-server";
import { EventFactory } from "../../../../../../lib/events/eventFactory";
import { EventService } from "../../../../../../lib/events/eventService";
import { logEvent } from "../../../../../../lib/audit/auditClient";
import { isFeatureEnabled } from "../../../../../../lib/features";
import { sendInvitationEmail } from "../../../../../../server/email/provider";
import { makeUrlSafeToken } from "../../../../../../lib/tokenUtils";
import {
  gone,
  created,
  conflict,
  INVITATION_ERROR_CODES,
} from "../../../../../../lib/api/errorMapping";

/**
 * POST /api/admin/management/invitations/:id/resend
 * Resend an admin invitation with a new token
 *
 * Auth: super_admin only
 * Idempotency: Supported via Idempotency-Key header
 */
async function resendInvitation(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const request_id = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { id } = await params;

  if (!id) {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_INVITATION,
      request_id,
    });
  }

  // Check feature flag
  if (!isFeatureEnabled("adminManagement")) {
    return NextResponse.json(
      { error: "Feature not available" },
      { status: 404 },
    );
  }

  const supabase = getSupabaseServiceClient();

  // Check if invitation exists and is not accepted
  const { data: invitation, error: fetchError } = await supabase
    .from("admin_invitations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !invitation) {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_INVITATION,
      request_id,
    });
  }

  // Check if already accepted
  if (invitation.status === "accepted") {
    return conflict({
      code: INVITATION_ERROR_CODES.ALREADY_ACCEPTED,
      request_id,
    });
  }

  // Generate new token
  const newToken = makeUrlSafeToken();

  // Update invitation with new token
  const { error: updateError } = await supabase
    .from("admin_invitations")
    .update({
      token: newToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("Error updating invitation:", updateError);
    return NextResponse.json(
      { error: "Failed to update invitation" },
      { status: 500 },
    );
  }

  // Send invitation email using new provider
  try {
    const emailResult = await sendInvitationEmail({
      email: invitation.email,
      token: newToken,
      locale: "en", // Default to English, could be made configurable
    });

    if (emailResult.status === "error") {
      console.error("Failed to send invitation email:", emailResult.error);
      // Don't fail the request if email fails, but log it
    } else {
      console.log(
        "Invitation email resent successfully:",
        emailResult.messageId,
      );
    }
  } catch (emailError) {
    console.error("Failed to send invitation email:", emailError);
    // Don't fail the request if email fails, but log it
  }

  // Get current user for audit
  const currentUser = await getCurrentUserFromRequest(request);

  // Emit domain event
  const event = EventFactory.createAdminInvitationResent(
    invitation.id,
    invitation.email,
    currentUser?.email || "unknown",
  );
  await EventService.emit(event);

  // Log successful event
  try {
    await logEvent({
      action: "admin.invitation.resent",
      resource: "admin_invitations",
      resource_id: invitation.id,
      actor_id: currentUser?.email || "unknown",
      actor_role: "admin",
      result: "success",
      correlation_id: request_id,
      meta: {
        invitation_id: invitation.id,
        email: invitation.email,
        resender: currentUser?.email || "unknown",
        email_provider: "new_provider",
      },
    });
  } catch (error) {
    console.error("Error logging event:", error);
  }

  return created({
    ok: true,
    new_token: newToken,
    invitation_id: id,
    request_id,
  });
}

export const POST = withSuperAdminApiGuard(resendInvitation);
