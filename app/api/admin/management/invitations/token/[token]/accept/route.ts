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

// Validation schema for accept request
const acceptSchema = z.object({
  name: z.string().optional(),
});

type AcceptRequest = z.infer<typeof acceptSchema>;

async function acceptInvitation(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `accept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const correlationId = request.headers.get("Idempotency-Key") || requestId;

  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 },
      );
    }

    // Get client IP for logging
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Log access attempt
    try {
      await logAccess({
        action: "admin.invitation.accept",
        method: "POST",
        resource: `/api/admin/management/invitations/token/${token}/accept`,
        result: "attempting",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: { token: token.substring(0, 8) + "..." }, // Log partial token for security
      });
    } catch (error) {
      console.error("Error logging access:", error);
    }

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

    // First, check if the token exists and get its details (including expired ones)
    const { data: invitationData, error: invitationError } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (invitationError || !invitationData) {
      return NextResponse.json(
        {
          error: "Invalid or expired invitation token",
          code: "INVALID_TOKEN",
        },
        { status: 410 },
      );
    }

    // Check if invitation is expired
    if (
      invitationData.expires_at &&
      new Date(invitationData.expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          error: "Invitation has expired",
          code: "EXPIRED_TOKEN",
        },
        { status: 410 },
      );
    }

    // Check if invitation is not pending
    if (invitationData.status !== "pending") {
      return NextResponse.json(
        {
          error: "Invalid or expired invitation token",
          code: "INVALID_TOKEN",
        },
        { status: 410 },
      );
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
      return NextResponse.json(
        {
          error: "Invalid or expired invitation token",
          code: "INVALID_TOKEN",
        },
        { status: 410 },
      );
    }

    if (
      !acceptResult ||
      acceptResult.length === 0 ||
      !acceptResult[0].success
    ) {
      return NextResponse.json(
        {
          error: "Invalid or expired invitation token",
          code: "INVALID_TOKEN",
        },
        { status: 410 },
      );
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
        correlation_id: correlationId,
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
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          invitation_id: invitation.id,
          email: invitation.email,
          admin_user_id: result.admin_user_id,
        },
      });
    } catch (error) {
      console.error("Error logging success access:", error);
    }

    return NextResponse.json({
      ok: true,
      correlation_id: correlationId,
      message: "Invitation accepted successfully",
      admin_user_id: result.admin_user_id,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);

    // Log error
    await logAccess({
      action: "admin.invitation.accept",
      method: "POST",
      resource: `/api/admin/management/invitations/token/${(await params).token}/accept`,
      result: "error",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withAuditLogging(acceptInvitation);
