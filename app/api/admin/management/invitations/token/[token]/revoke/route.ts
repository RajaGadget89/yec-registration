import { NextRequest, NextResponse } from "next/server";
import { withSuperAdminApiGuard } from "../../../../../../../lib/admin-guard-server";
import { getCurrentUserFromRequest } from "../../../../../../../lib/auth-utils.server";
import { logEvent } from "../../../../../../../lib/audit/auditClient";
import { getSupabaseServiceClient } from "../../../../../../../lib/supabase-server";
import { EventService } from "../../../../../../../lib/events/eventService";
import { EventFactory } from "../../../../../../../lib/events/eventFactory";
import {
  gone,
  ok,
  INVITATION_ERROR_CODES,
} from "../../../../../../../lib/api/errorMapping";

/**
 * POST /api/admin/management/invitations/token/[token]/revoke
 * Revoke an admin invitation by token
 *
 * Auth: super_admin only
 * Idempotency: Supported - repeated revoke returns 200 with stable body
 */
async function revokeInvitation(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const request_id = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { token } = await params;

  if (!token) {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_TOKEN,
      request_id,
    });
  }

  // Feature flag check (hardening is enabled by default)
  if (process.env.INVITES_HARDENING_ENABLED === "false") {
    return NextResponse.json(
      { error: "Feature not available" },
      { status: 404 },
    );
  }

  const supabase = getSupabaseServiceClient();

  // Lookup invitation by token
  const { data: invitation, error: fetchError } = await supabase
    .from("admin_invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !invitation) {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_TOKEN,
      request_id,
    });
  }

  // Check if already revoked (idempotent behavior)
  if (invitation.status === "revoked") {
    return ok({
      ok: true,
      code: "INVITE_REVOKED",
      invitation_id: invitation.id,
      request_id,
    });
  }

  // Check if already accepted
  if (invitation.status === "accepted") {
    return gone({
      code: INVITATION_ERROR_CODES.ALREADY_ACCEPTED,
      request_id,
    });
  }

  // Only revoke if pending
  if (invitation.status !== "pending") {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_TOKEN,
      request_id,
    });
  }

  // Revoke the invitation (idempotent update)
  const { error: revokeError } = await supabase
    .from("admin_invitations")
    .update({
      status: "revoked",
      updated_at: new Date().toISOString(),
    })
    .eq("token", token)
    .eq("status", "pending");

  if (revokeError) {
    console.error("Error revoking invitation:", revokeError);
    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 },
    );
  }

  // Get current user for audit
  const currentUser = await getCurrentUserFromRequest(request);

  // Emit domain event
  const event = EventFactory.createAdminInvitationRevoked(
    invitation.id,
    invitation.email,
    currentUser?.email || "unknown",
  );
  await EventService.emit(event);

  // Log event
  await logEvent({
    action: "admin.invitation.revoked",
    resource: "admin_invitations",
    resource_id: invitation.id,
    actor_id: currentUser?.email || "unknown",
    actor_role: "admin",
    result: "success",
    correlation_id: request_id,
    meta: {
      invitation_id: invitation.id,
      invited_email: invitation.email,
      revoked_by: currentUser?.email || "unknown",
      original_status: invitation.status,
    },
  });

  return ok({
    ok: true,
    code: "INVITE_REVOKED",
    invitation_id: invitation.id,
    request_id,
  });
}

export const POST = withSuperAdminApiGuard(revokeInvitation);
