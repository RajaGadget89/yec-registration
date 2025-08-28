import { NextRequest, NextResponse } from "next/server";
import { withSuperAdminApiGuard } from "../../../../../../lib/admin-guard-server";
import { getCurrentUserFromRequest } from "../../../../../../lib/auth-utils.server";
import { logAccess, logEvent } from "../../../../../../lib/audit/auditClient";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase-server";
import { EventService } from "../../../../../../lib/events/eventService";
import { EventFactory } from "../../../../../../lib/events/eventFactory";
import { isFeatureEnabled } from "../../../../../../lib/features";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Check feature flag
  if (!isFeatureEnabled("adminManagement")) {
    return NextResponse.json(
      { error: "Feature not available" },
      { status: 404 }
    );
  }

  return withSuperAdminApiGuard(async (req) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      const { token } = await params;
      if (!token) {
        return NextResponse.json(
          { error: "Invitation token is required" },
          { status: 400 }
        );
      }

      // Log access
      await logAccess({
        action: "admin.invitation.revoke",
        method: "POST",
        resource: `/api/admin/management/invitations/${token}/revoke`,
        result: "attempting",
        request_id: req.headers.get("x-request-id") || "unknown",
        src_ip: req.headers.get("x-forwarded-for") || undefined,
        user_agent: req.headers.get("user-agent") || undefined,
        latency_ms: 0,
        meta: {
          token,
        },
      });

      const supabase = getSupabaseServiceClient();

      // First, get the invitation details by token
      const { data: invitation, error: fetchError } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (fetchError || !invitation) {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        );
      }

      // Check if invitation is already processed
      if (invitation.status !== "pending") {
        return NextResponse.json(
          { error: "Invitation is already processed and cannot be revoked" },
          { status: 409 }
        );
      }

      // Revoke the invitation using the database function
      const { data: revokeResult, error: revokeError } = await supabase
        .rpc("revoke_admin_invitation", {
          p_invitation_id: invitation.id,
          p_revoked_by_admin_id: currentUser.id,
        });

      if (revokeError || !revokeResult || !revokeResult[0]?.success) {
        console.error("Error revoking invitation:", revokeError);
        return NextResponse.json(
          { error: "Failed to revoke invitation" },
          { status: 500 }
        );
      }

      // Emit domain event
      const event = EventFactory.createAdminInvitationRevoked(
        invitation.id,
        invitation.email,
        currentUser.email
      );
      await EventService.emit(event);

      // Log event
      await logEvent({
        action: "admin.invitation.revoked",
        resource: "admin_invitations",
        resource_id: invitation.id,
        actor_id: currentUser.email,
        actor_role: "admin",
        result: "success",
        correlation_id: req.headers.get("x-request-id") || "unknown",
        meta: {
          invitation_id: invitation.id,
          invited_email: invitation.email,
          revoked_by: currentUser.email,
          original_status: invitation.status,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Invitation revoked successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: "revoked",
        },
      });

    } catch (error) {
      console.error("Error in revoke invitation endpoint:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
