import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase-server";
import { EventFactory } from "../../../../../../lib/events/eventFactory";
import { EventService } from "../../../../../../lib/events/eventService";
import { logAccess, logEvent } from "../../../../../../lib/audit/auditClient";
import {
  checkRateLimit,
  ADMIN_INVITE_RATE_LIMITS,
} from "../../../../../../lib/rate-limit";
import { withAuditLogging } from "../../../../../../lib/audit/withAuditAccess";
import { isFeatureEnabled } from "../../../../../../lib/features";
import { sendInvitationEmail } from "../../../../../../server/email/provider";

// Super admin allowlist as specified in requirements
const SUPER_ADMIN_ALLOWLIST = ["raja.gadgets89@gmail.com"];

/**
 * POST /api/admin/management/invitations/:id/resend
 * Resend an admin invitation
 *
 * Auth: super_admin only
 * Rate limit: 5 req/min/IP + 20 req/day/account
 * Idempotency: Supported via Idempotency-Key header
 */
async function resendInvitation(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `resend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    // Rate limiting (skip for E2E tests)
    if (process.env.E2E_TESTS !== "true") {
      const clientIP =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";

      // Check per-minute rate limit
      const minuteLimit = checkRateLimit(
        `resend_minute_${clientIP}`,
        ADMIN_INVITE_RATE_LIMITS.PER_MINUTE,
        ADMIN_INVITE_RATE_LIMITS.WINDOW_MS.MINUTE,
      );

      if (!minuteLimit.allowed) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            code: "rate_limited",
            retryAfter: Math.ceil((minuteLimit.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(
                (minuteLimit.resetTime - Date.now()) / 1000,
              ).toString(),
              "X-RateLimit-Limit":
                ADMIN_INVITE_RATE_LIMITS.PER_MINUTE.toString(),
              "X-RateLimit-Remaining": minuteLimit.remaining.toString(),
              "X-RateLimit-Reset": new Date(
                minuteLimit.resetTime,
              ).toISOString(),
            },
          },
        );
      }

      // Check per-day rate limit
      const dayLimit = checkRateLimit(
        `resend_day_${currentUser.email}`,
        ADMIN_INVITE_RATE_LIMITS.PER_DAY,
        ADMIN_INVITE_RATE_LIMITS.WINDOW_MS.DAY,
      );

      if (!dayLimit.allowed) {
        return NextResponse.json(
          {
            error: "Daily rate limit exceeded",
            code: "rate_limited",
            retryAfter: Math.ceil((dayLimit.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(
                (dayLimit.resetTime - Date.now()) / 1000,
              ).toString(),
              "X-RateLimit-Limit": ADMIN_INVITE_RATE_LIMITS.PER_DAY.toString(),
              "X-RateLimit-Remaining": dayLimit.remaining.toString(),
              "X-RateLimit-Reset": new Date(dayLimit.resetTime).toISOString(),
            },
          },
        );
      }
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
        action: "admin.invitation.resend",
        method: "POST",
        resource: `/api/admin/management/invitations/${id}/resend`,
        result: "attempting",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: { invitation_id: id, resender: currentUser.email },
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

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        {
          error: "Invitation has expired",
          code: "invitation_expired",
        },
        { status: 410 },
      );
    }

    // Update invitation with new timestamp and increment resend counter
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("admin_invitations")
      .update({
        updated_at: new Date().toISOString(),
        resend_count: (invitation.resend_count || 0) + 1,
      })
      .eq("id", id)
      .select()
      .single();

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
        token: invitation.token,
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

    // Emit domain event
    const event = EventFactory.createAdminInvitationResent(
      invitation.id,
      invitation.email,
      currentUser.email,
    );
    await EventService.emit(event);

    // Log successful event
    try {
      await logEvent({
        action: "admin.invitation.resent",
        resource: "admin_invitations",
        resource_id: invitation.id,
        actor_id: currentUser.email,
        actor_role: "admin",
        result: "success",
        correlation_id: correlationId,
        meta: {
          invitation_id: invitation.id,
          email: invitation.email,
          resender: currentUser.email,
          resend_count: updatedInvitation.resend_count,
          email_provider: "new_provider", // Track that we're using the new email provider
        },
      });
    } catch (error) {
      console.error("Error logging event:", error);
    }

    // Log successful access
    try {
      await logAccess({
        action: "admin.invitation.resend",
        method: "POST",
        resource: `/api/admin/management/invitations/${id}/resend`,
        result: "success",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          invitation_id: invitation.id,
          email: invitation.email,
          resender: currentUser.email,
          resend_count: updatedInvitation.resend_count,
          email_provider: "new_provider", // Track that we're using the new email provider
        },
      });
    } catch (error) {
      console.error("Error logging success access:", error);
    }

    return NextResponse.json({
      correlation_id: correlationId,
      message: "Invitation resent successfully",
      resend_count: updatedInvitation.resend_count,
    });
  } catch (error) {
    console.error("Resend invitation error:", error);

    // Log error
    await logAccess({
      action: "admin.invitation.resend",
      method: "POST",
      resource: `/api/admin/management/invitations/${(await params).id}/resend`,
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

export const POST = withAuditLogging(resendInvitation);
