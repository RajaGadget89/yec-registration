import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase-server";
import { EventFactory } from "../../../../../../lib/events/eventFactory";
import { EventService } from "../../../../../../lib/events/eventService";
import { logAccess, logEvent } from "../../../../../../lib/audit/auditClient";
import { withAuditLogging } from "../../../../../../lib/audit/withAuditAccess";
import { isFeatureEnabled } from "../../../../../../lib/features";

// Super admin allowlist as specified in requirements
const SUPER_ADMIN_ALLOWLIST = ["raja.gadgets89@gmail.com"];

/**
 * POST /api/admin/management/invitations/:id/cancel
 * Cancel an admin invitation
 *
 * Auth: super_admin only
 * Idempotency: Supported via Idempotency-Key header
 */
async function cancelInvitation(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const correlationId = request.headers.get("Idempotency-Key") || requestId;

  try {
    // Check feature flag
    if (!isFeatureEnabled("adminManagement")) {
      return NextResponse.json(
        { error: "Feature not available" },
        { status: 404 },
      );
    }

    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super_admin role
    const hasSuperAdminRole = await hasRoleFromRequest(request, "super_admin");
    if (!hasSuperAdminRole) {
      return NextResponse.json(
        { error: "Insufficient permissions. Super admin access required." },
        { status: 403 },
      );
    }

    // Check if user is in super admin allowlist
    if (!SUPER_ADMIN_ALLOWLIST.includes(currentUser.email.toLowerCase())) {
      return NextResponse.json(
        { error: "Access denied. Not in super admin allowlist." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
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
        action: "admin.invitation.cancel",
        method: "POST",
        resource: `/api/admin/management/invitations/${id}/cancel`,
        result: "attempting",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: { invitation_id: id, canceller: currentUser.email },
      });
    } catch (error) {
      console.error("Error logging access:", error);
    }

    const supabase = getSupabaseServiceClient();

    // Check if invitation exists and is pending
    const { data: invitation, error: fetchError } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("id", id)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        {
          error: "Invitation not found or not pending",
          code: "invitation_not_found",
        },
        { status: 404 },
      );
    }

    // Update invitation status to revoked
    const { error: updateError } = await supabase
      .from("admin_invitations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel invitation" },
        { status: 500 },
      );
    }

    // Emit domain event
    const event = EventFactory.createAdminInvitationCancelled(
      invitation.id,
      invitation.email,
      currentUser.email,
    );
    await EventService.emit(event);

    // Log successful event
    try {
      await logEvent({
        action: "admin.invitation.cancelled",
        resource: "admin_invitations",
        resource_id: invitation.id,
        actor_id: currentUser.email,
        actor_role: "admin",
        result: "success",
        correlation_id: correlationId,
        meta: {
          invitation_id: invitation.id,
          email: invitation.email,
          canceller: currentUser.email,
        },
      });
    } catch (error) {
      console.error("Error logging event:", error);
    }

    // Log successful access
    try {
      await logAccess({
        action: "admin.invitation.cancel",
        method: "POST",
        resource: `/api/admin/management/invitations/${id}/cancel`,
        result: "success",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          invitation_id: invitation.id,
          email: invitation.email,
          canceller: currentUser.email,
        },
      });
    } catch (error) {
      console.error("Error logging success access:", error);
    }

    return NextResponse.json({
      correlation_id: correlationId,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel invitation error:", error);

    // Log error
    await logAccess({
      action: "admin.invitation.cancel",
      method: "POST",
      resource: `/api/admin/management/invitations/${(await params).id}/cancel`,
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

export const POST = withAuditLogging(cancelInvitation);
