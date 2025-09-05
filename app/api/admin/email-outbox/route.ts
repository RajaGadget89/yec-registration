import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { logAccess } from "../../../lib/audit/auditClient";
import { withAuditLogging } from "../../../lib/audit/withAuditAccess";

/**
 * GET /api/admin/email-outbox
 * View email outbox for testing purposes
 *
 * Auth: super_admin only
 */
async function getEmailOutbox(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `email_outbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasSuperAdminRole = await hasRoleFromRequest(request, "super_admin");
    if (!hasSuperAdminRole) {
      return NextResponse.json(
        { error: "Insufficient permissions. Super admin access required." },
        { status: 403 },
      );
    }

    // Validate business role permissions for email outbox access (super_admin has all roles)
    // Super admin automatically has user_profile business role, but let's be explicit
    const { hasBusinessRole } = await import("../../../lib/rbac");
    const hasEmailAccess = await hasBusinessRole(
      currentUser.email,
      "user_profile",
    );
    if (!hasEmailAccess) {
      return NextResponse.json(
        {
          error:
            "Insufficient business role permissions for email outbox access",
        },
        { status: 403 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const template = searchParams.get("template");
    const toEmail = searchParams.get("to_email");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get client IP for logging
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Log access
    try {
      await logAccess({
        action: "admin.email_outbox.view",
        method: "GET",
        resource: "/api/admin/email-outbox",
        result: "attempting",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          template: template || undefined,
          to_email: toEmail || undefined,
          limit,
          offset,
        },
      });
    } catch (error) {
      console.error("Error logging access:", error);
    }

    const supabase = getSupabaseServiceClient();

    // Build query
    let query = supabase
      .from("email_outbox")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (template) {
      query = query.eq("template", template);
    }

    if (toEmail) {
      query = query.eq("to_email", toEmail);
    }

    const { data: emails, error } = await query;

    if (error) {
      console.error("Error fetching email outbox:", error);
      return NextResponse.json(
        { error: "Failed to fetch email outbox" },
        { status: 500 },
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true });

    if (template) {
      countQuery = countQuery.eq("template", template);
    }

    if (toEmail) {
      countQuery = countQuery.eq("to_email", toEmail);
    }

    const { count } = await countQuery;

    // Log successful access
    try {
      await logAccess({
        action: "admin.email_outbox.view",
        method: "GET",
        resource: "/api/admin/email-outbox",
        result: "success",
        request_id: requestId,
        src_ip: clientIP,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          emails_count: emails?.length || 0,
          total_count: count || 0,
          template: template || undefined,
          to_email: toEmail || undefined,
        },
      });
    } catch (error) {
      console.error("Error logging success access:", error);
    }

    return NextResponse.json({
      emails: emails || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Email outbox error:", error);

    // Log error
    await logAccess({
      action: "admin.email_outbox.view",
      method: "GET",
      resource: "/api/admin/email-outbox",
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

export const GET = withAuditLogging(getEmailOutbox);
