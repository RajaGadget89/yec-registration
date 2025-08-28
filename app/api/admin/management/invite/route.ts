import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { 
  getCurrentUserFromRequest, 
  hasRoleFromRequest 
} from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { EventFactory } from "../../../../lib/events/eventFactory";
import { EventService } from "../../../../lib/events/eventService";
import { logAccess, logEvent } from "../../../../lib/audit/auditClient";
import { checkRateLimit, ADMIN_INVITE_RATE_LIMITS } from "../../../../lib/rate-limit";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import { getBaseUrl } from "../../../../lib/config";
import { isFeatureEnabled } from "../../../../lib/features";
import { sendAdminInvitationEmail } from "../../../../lib/emailService";

// Validation schema for invite request
const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  roles: z.array(z.enum(["admin", "super_admin"])).min(1, "At least one role is required"),
});

type InviteRequest = z.infer<typeof inviteSchema>;

// Super admin allowlist as specified in requirements
const SUPER_ADMIN_ALLOWLIST = ["raja.gadgets89@gmail.com"];

/**
 * POST /api/admin/management/invite
 * Invite a new admin user
 * 
 * Auth: super_admin only
 * Rate limit: 5 req/min/IP + 20 req/day/account
 */
async function inviteAdmin(request: NextRequest): Promise<NextResponse> {
  console.log("[INVITE_ROUTE] Function called");
  const startTime = Date.now();
  const requestId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log("[INVITE_ROUTE] Starting invite process");
    // Check feature flag
    if (!isFeatureEnabled("adminManagement")) {
      console.log("[INVITE_ROUTE] Feature flag disabled");
      return NextResponse.json(
        { error: "Feature not available" },
        { status: 404 }
      );
    }
    console.log("[INVITE_ROUTE] Feature flag enabled");

    // Check if user is authenticated and is super_admin
    console.log("[INVITE_ROUTE] Getting current user from request");
    const currentUser = await getCurrentUserFromRequest(request);
    console.log("[INVITE_ROUTE] Current user:", currentUser);
    if (!currentUser) {
      console.log("[INVITE_ROUTE] No current user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super_admin role
    console.log("[INVITE_ROUTE] Checking super_admin role");
    const hasSuperAdminRole = await hasRoleFromRequest(request, "super_admin");
    console.log("[INVITE_ROUTE] Has super_admin role:", hasSuperAdminRole);
    if (!hasSuperAdminRole) {
      console.log("[INVITE_ROUTE] User does not have super_admin role");
      return NextResponse.json(
        { error: "Insufficient permissions. Super admin access required." },
        { status: 403 }
      );
    }

    // Check if user is in super admin allowlist
    console.log("[INVITE_ROUTE] Checking allowlist for user:", currentUser.email, "allowlist:", SUPER_ADMIN_ALLOWLIST);
    if (!SUPER_ADMIN_ALLOWLIST.includes(currentUser.email.toLowerCase())) {
      console.log("[INVITE_ROUTE] User not in allowlist:", currentUser.email);
      return NextResponse.json(
        { error: "Access denied. Not in super admin allowlist." },
        { status: 403 }
      );
    }
    console.log("[INVITE_ROUTE] User is in allowlist:", currentUser.email);

    // Rate limiting (skip for E2E tests)
    if (process.env.E2E_TESTS !== "true") {
      const clientIP = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
      
      // Check per-minute rate limit
      const minuteLimit = checkRateLimit(
        `invite_minute_${clientIP}`,
        ADMIN_INVITE_RATE_LIMITS.PER_MINUTE,
        ADMIN_INVITE_RATE_LIMITS.WINDOW_MS.MINUTE
      );

      if (!minuteLimit.allowed) {
        return NextResponse.json(
          { 
            error: "Rate limit exceeded", 
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: Math.ceil((minuteLimit.resetTime - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              "Retry-After": Math.ceil((minuteLimit.resetTime - Date.now()) / 1000).toString(),
              "X-RateLimit-Limit": ADMIN_INVITE_RATE_LIMITS.PER_MINUTE.toString(),
              "X-RateLimit-Remaining": minuteLimit.remaining.toString(),
              "X-RateLimit-Reset": new Date(minuteLimit.resetTime).toISOString(),
            }
          }
        );
      }

      // Check per-day rate limit
      const dayLimit = checkRateLimit(
        `invite_day_${currentUser.email}`,
        ADMIN_INVITE_RATE_LIMITS.PER_DAY,
        ADMIN_INVITE_RATE_LIMITS.WINDOW_MS.DAY
      );

      if (!dayLimit.allowed) {
        return NextResponse.json(
          { 
            error: "Daily rate limit exceeded", 
            code: "DAILY_RATE_LIMIT_EXCEEDED",
            retryAfter: Math.ceil((dayLimit.resetTime - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              "Retry-After": Math.ceil((dayLimit.resetTime - Date.now()) / 1000).toString(),
              "X-RateLimit-Limit": ADMIN_INVITE_RATE_LIMITS.PER_DAY.toString(),
              "X-RateLimit-Remaining": dayLimit.remaining.toString(),
              "X-RateLimit-Reset": new Date(dayLimit.resetTime).toISOString(),
            }
          }
        );
      }
    }

    // Parse and validate request body
    console.log("[INVITE_ROUTE] Parsing request body");
    let body: InviteRequest;
    try {
      body = await request.json();
      console.log("[INVITE_ROUTE] Request body:", body);
    } catch (error) {
      console.log("[INVITE_ROUTE] Error parsing JSON:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

        console.log("[INVITE_ROUTE] Validating request body");
    const validationResult = inviteSchema.safeParse(body);
    console.log("[INVITE_ROUTE] Validation result:", validationResult);
    if (!validationResult.success) {
      console.log("[INVITE_ROUTE] Validation failed:", validationResult.error.errors);
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validationResult.error.errors
        },
        { status: 422 }
      );
    }

    const { email, roles } = validationResult.data;
    console.log("[INVITE_ROUTE] Validated data - email:", email, "roles:", roles);

    // Get client IP for logging
    const clientIP = request.headers.get("x-forwarded-for") || 
                    request.headers.get("x-real-ip") || 
                    "unknown";

    // Log access
    console.log("[INVITE_ROUTE] Logging access attempt");
    try {
      await logAccess({
        action: "admin.invitation.create",
        method: "POST",
        resource: "/api/admin/management/invite",
        result: "attempting",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: { email, roles, inviter: currentUser.email }
      });
      console.log("[INVITE_ROUTE] Access log created successfully");
    } catch (error) {
      console.error("[INVITE_ROUTE] Error logging access:", error);
    }

    console.log("[INVITE_ROUTE] Getting Supabase client");
    const supabase = getSupabaseServiceClient();

    // Check for existing pending invitation for this email
    console.log("[INVITE_ROUTE] Checking for existing invitation for email:", email);
    const { data: existingInvitation, error: checkError } = await supabase
      .from("admin_invitations")
      .select("id, status, expires_at")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();
    console.log("[INVITE_ROUTE] Existing invitation check result:", { existingInvitation, checkError });

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found", which is expected
      console.error("Error checking existing invitation:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing invitations" },
        { status: 500 }
      );
    }

    if (existingInvitation && new Date(existingInvitation.expires_at) > new Date()) {
      return NextResponse.json(
        { 
          error: "Invitation already exists for this email",
          code: "INVITE_EXISTS",
          invitation_id: existingInvitation.id
        },
        { status: 409 }
      );
    }

    // Generate invitation token using database function
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "generate_admin_invitation_token"
    );

    if (tokenError || !tokenData) {
      console.error("Error generating invitation token:", tokenError);
      return NextResponse.json(
        { error: "Failed to generate invitation token" },
        { status: 500 }
      );
    }

    // Calculate expiration time (48 hours from now)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Create invitation record
    const { data: invitation, error: createError } = await supabase
      .from("admin_invitations")
      .insert({
        email: email.toLowerCase(),
        token: tokenData,
        expires_at: expiresAt,
        invited_by_admin_id: currentUser.id,
        status: "pending",
        metadata: { roles }
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating invitation:", createError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Send invitation email
    const acceptUrl = `${getBaseUrl()}/admin/management/accept?token=${tokenData}`;
    const expiresAtFormatted = new Date(expiresAt).toLocaleString();
    const supportEmail = "info@yecday.com";

    try {
      await sendAdminInvitationEmail({
        to: email,
        acceptUrl,
        expiresAt: expiresAtFormatted,
        supportEmail,
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request if email fails, but log it
      // The invitation is still created and can be resent later
    }

    // Emit domain event
    const event = EventFactory.createAdminInvitationCreated(
      invitation.id,
      email,
      currentUser.email
    );
    await EventService.emit(event);

    // Log successful event
    console.log("[INVITE_ROUTE] Logging successful event");
    try {
      await logEvent({
        action: "admin.invitation.created",
        resource: "admin_invitations",
        resource_id: invitation.id,
        actor_id: currentUser.email,
        actor_role: "admin",
        result: "success",
        correlation_id: requestId,
        meta: { 
          email, 
          roles, 
          expires_at: expiresAt,
          inviter: currentUser.email 
        }
      });
      console.log("[INVITE_ROUTE] Event log created successfully");
    } catch (error) {
      console.error("[INVITE_ROUTE] Error logging event:", error);
    }

    // Log successful access
    console.log("[INVITE_ROUTE] Logging successful access");
    try {
      await logAccess({
        action: "admin.invitation.create",
        method: "POST",
        resource: "/api/admin/management/invite",
        result: "success",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: { 
          invitation_id: invitation.id,
          email, 
          roles, 
          inviter: currentUser.email 
        }
      });
      console.log("[INVITE_ROUTE] Success access log created successfully");
    } catch (error) {
      console.error("[INVITE_ROUTE] Error logging success access:", error);
    }

    // For E2E tests, include the token in the response
    const responseData: any = {
      id: invitation.id,
      email: invitation.email,
      expires_at: invitation.expires_at,
      message: "Invitation created successfully"
    };

    // Include token for E2E tests only
    if (process.env.E2E_TESTS === 'true') {
      responseData.token = tokenData;
    }

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error("Admin invitation error:", error);

    // Log error
    await logAccess({
      action: "admin.invitation.create",
      method: "POST",
      resource: "/api/admin/management/invite",
      result: "error",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        error: error instanceof Error ? error.message : "Unknown error" 
      }
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withAuditLogging(inviteAdmin);
