import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "../../../../../../../lib/supabase-server";
import { EventFactory } from "../../../../../../../lib/events/eventFactory";
import { EventService } from "../../../../../../../lib/events/eventService";
import {
  logAccess,
  logEvent,
} from "../../../../../../../lib/audit/auditClient";
import { withAuditLogging } from "../../../../../../../lib/audit/withAuditAccess";
import {
  gone,
  ok,
  INVITATION_ERROR_CODES,
} from "../../../../../../../lib/api/errorMapping";

// Validation schema for accept request
const acceptSchema = z.object({
  name: z.string().optional(),
});

type AcceptRequest = z.infer<typeof acceptSchema>;

async function acceptInvitation(
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

  // Get client IP for logging
  const clientIP =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Parse request body (optional)
  let body: AcceptRequest = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional, so we'll use empty object
  }

  const validationResult = acceptSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: validationResult.error.errors,
      },
      { status: 422 },
    );
  }

  const supabase = getSupabaseServiceClient();

  // Lookup invitation by token
  const { data: invitationData, error: invitationError } = await supabase
    .from("admin_invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (invitationError || !invitationData) {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_TOKEN,
      request_id,
    });
  }

  // Check if invitation is expired
  if (
    invitationData.expires_at &&
    new Date(invitationData.expires_at) < new Date()
  ) {
    return gone({
      code: INVITATION_ERROR_CODES.EXPIRED_TOKEN,
      request_id,
    });
  }

  // Check if invitation is revoked
  if (invitationData.status === "revoked") {
    return gone({
      code: INVITATION_ERROR_CODES.REVOKED_TOKEN,
      request_id,
    });
  }

  // Check if invitation is not pending
  if (invitationData.status !== "pending") {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_TOKEN,
      request_id,
    });
  }

  const invitation = invitationData;

  // Create user in auth system first
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email: invitation.email,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        invited_by: invitation.invited_by_admin_id,
      },
    });

  if (authError) {
    console.error("Error creating auth user:", authError);
    return NextResponse.json(
      {
        error: "Failed to create user account",
        code: "AUTH_ERROR",
        details: authError.message,
      },
      { status: 500 },
    );
  }

  const adminId = authUser.user.id;

  // Now call accept_admin_invitation RPC with both token and admin_id
  const { data: acceptResult, error: acceptError } = await supabase.rpc(
    "accept_admin_invitation",
    {
      p_token: token,
      p_admin_id: adminId,
    },
  );

  // Handle all token validation failures as 410
  if (acceptError) {
    console.error("Error accepting invitation:", acceptError);
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_TOKEN,
      request_id,
    });
  }

  if (!acceptResult || acceptResult.length === 0 || !acceptResult[0].success) {
    return gone({
      code: INVITATION_ERROR_CODES.INVALID_TOKEN,
      request_id,
    });
  }

  const result = acceptResult[0];

  // Emit domain event
  const event = EventFactory.createAdminInvitationAccepted(
    invitation.id,
    result.admin_user_id,
  );
  await EventService.emit(event);

  // Log successful event
  try {
    await logEvent({
      action: "admin.invitation.accepted",
      resource: "admin_invitations",
      resource_id: invitation.id,
      actor_id: invitation.email,
      actor_role: "user",
      result: "success",
      correlation_id: request_id,
      meta: {
        invitation_id: invitation.id,
        email: invitation.email,
        admin_user_id: result.admin_user_id,
      },
    });
  } catch (error) {
    console.error("Error logging event:", error);
  }

  // Log successful access
  try {
    await logAccess({
      action: "admin.invitation.accept",
      method: "POST",
      resource: `/api/admin/management/invitations/token/${token}/accept`,
      result: "success",
      request_id: request_id,
      src_ip: clientIP,
      user_agent: request.headers.get("user-agent") || undefined,
      latency_ms: 0,
      meta: {
        invitation_id: invitation.id,
        email: invitation.email,
        admin_user_id: result.admin_user_id,
      },
    });
  } catch (error) {
    console.error("Error logging success access:", error);
  }

  return ok({
    ok: true,
    correlation_id: request_id,
    message: "Invitation accepted successfully",
    admin_user_id: result.admin_user_id,
    request_id,
  });
}

export const POST = withAuditLogging(acceptInvitation);
