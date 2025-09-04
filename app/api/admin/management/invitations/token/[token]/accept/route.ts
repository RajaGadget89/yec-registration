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
import { getAppUrl } from "../../../../../../../lib/env";
import { getCurrentUserFromRequest } from "../../../../../../../lib/auth-utils.server";

// Validation schema for accept request
const acceptSchema = z.object({
  name: z.string().optional(),
});

type AcceptRequest = z.infer<typeof acceptSchema>;

async function getOrCreateAuthUserByEmailCompat(
  admin: any,
  email: string,
  invitedByAdminId: string,
) {
  // Prefer native getUserByEmail when available (future-proofing)
  if (typeof admin.getUserByEmail === "function") {
    const g = await admin.getUserByEmail(email);
    if (g?.data?.user) return g.data.user;
    const c = await admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        invited_by: invitedByAdminId,
      },
    });
    if (c?.data?.user) return c.data.user;
    if (
      c?.error &&
      (c.error.status === 422 || /exist|already/i.test(c.error.message || ""))
    ) {
      const g2 = await admin.getUserByEmail(email);
      if (g2?.data?.user) return g2.data.user;
    }
    throw c?.error || new Error("createUser_failed");
  }

  // Fallback path (current SDK): try create; if duplicate → fetch via listUsers and filter
  const c = await admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      role: "admin",
      invited_by: invitedByAdminId,
    },
  });

  if (c?.data?.user) return c.data.user;

  if (
    c?.error &&
    (c.error.status === 422 ||
      /exist|already|duplicate/i.test(c.error.message || ""))
  ) {
    if (typeof admin.listUsers === "function") {
      const l = await admin.listUsers({ page: 1, perPage: 200 });
      const found = l?.data?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (found) return found;
    }
  }

  throw c?.error || new Error("createUser_failed");
}

/**
 * Utility function to generate magic link and redirect for authentication
 */
async function redirectToMagicLink(email: string, supabase: any) {
  const appUrl = getAppUrl();
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent('/admin')}`;
  
  console.log("[UAT-04] Generating magic link for authentication:", {
    email,
    redirectTo,
    appUrl,
  });

  try {
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { 
        redirectTo: redirectTo 
      },
    });

    if (magicLinkError || !magicLinkData?.properties?.action_link) {
      console.error("[UAT-04] Failed to generate magic link:", magicLinkError);
      return NextResponse.json({ 
        ok: false, 
        error: 'FAILED_TO_GENERATE_LINK',
        message: 'Failed to generate authentication link. Please try again or contact support.'
      }, { status: 500 });
    }

    const actionLink = magicLinkData.properties.action_link;
    console.log("[UAT-04] Magic link generated successfully, redirecting to:", actionLink);

    return NextResponse.redirect(actionLink, 303);

  } catch (magicLinkError) {
    console.error("[UAT-04] Error in magic link generation:", magicLinkError);
    return NextResponse.json({ 
      ok: false, 
      error: 'MAGIC_LINK_GENERATION_ERROR',
      message: 'Authentication link generation failed. Please try again or contact support.'
    }, { status: 500 });
  }
}

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
          code: "INVITATION_REVOKED_OR_EXPIRED",
        },
        { status: 410 },
      );
    }

    // UAT-04: Handle different invitation statuses appropriately
    const invitation = invitationData;
    
    if (invitation.status === 'pending' || invitation.status === 'sent') {
      // New invitation - proceed with acceptance
      console.log("[UAT-04] Processing new invitation:", { status: invitation.status, email: invitation.email });
      
      // Create user in auth system first (idempotent for duplicate emails)
      const user = await getOrCreateAuthUserByEmailCompat(
        supabase.auth.admin,
        invitation.email,
        invitation.invited_by_admin_id,
      );
      const adminId = user.id;

      // Now call accept_admin_invitation RPC with both token and admin_id
      let acceptResult: any, acceptError: any;
      try {
        const rpcResponse = await supabase.rpc("accept_admin_invitation", {
          p_token: token,
          p_admin_id: adminId,
        });
        acceptResult = rpcResponse.data;
        acceptError = rpcResponse.error;
      } catch (e: any) {
        const code = `${e?.code || ""}`;
        if (
          code === "23505" ||
          /duplicate key|unique_violation/i.test(e?.message || "")
        ) {
          // Idempotent accept: treat as already accepted → redirect to magic link
          console.log("[UAT-04] Invitation already accepted, redirecting to magic link");
          return await redirectToMagicLink(invitation.email, supabase);
        }
        const codeStr = e?.code || e?.details || e?.hint || e?.message;
        console.error("[ACCEPT][rpc]", {
          code: codeStr,
          msg: e?.message?.slice(0, 160),
        });
        throw e; // keep current mapping for now
      }

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

      // UAT-04: Generate magic link and redirect to establish session
      return await redirectToMagicLink(invitation.email, supabase);

    } else if (invitation.status === 'accepted') {
      // Already accepted invitation - check if user has valid session
      console.log("[UAT-04] Processing already accepted invitation:", { email: invitation.email });
      
      const currentUser = await getCurrentUserFromRequest(request);
      
      if (currentUser?.email?.toLowerCase() === invitation.email.toLowerCase()) {
        // User has valid session and matches invited email - redirect to admin
        console.log("[UAT-04] User has valid session, redirecting to admin");
        return NextResponse.redirect(new URL('/admin', getAppUrl()), 303);
      } else {
        // User has no session or different user - issue new magic link for re-authentication
        console.log("[UAT-04] User has no session, issuing new magic link for re-authentication");
        return await redirectToMagicLink(invitation.email, supabase);
      }

    } else if (invitation.status === 'revoked' || invitation.status === 'expired') {
      // Revoked or expired invitation
      console.log("[UAT-04] Invitation is revoked or expired:", { status: invitation.status });
      return NextResponse.json(
        {
          error: "Invitation has been revoked or expired",
          code: "INVITATION_REVOKED_OR_EXPIRED",
        },
        { status: 410 },
      );
    } else {
      // Unknown status
      console.log("[UAT-04] Unknown invitation status:", { status: invitation.status });
      return NextResponse.json(
        {
          error: "Invalid invitation status",
          code: "INVALID_STATUS",
        },
        { status: 400 },
      );
    }

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
