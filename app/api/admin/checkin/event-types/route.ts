import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../lib/features";
import { logAccess } from "../../../../lib/audit/auditClient";

/**
 * GET /api/admin/checkin/event-types
 * List all event types
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `event_types_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Check feature flag
    if (!isCheckinSystemEnabled()) {
      return NextResponse.json(
        { error: "Feature not available" },
        { status: 404 },
      );
    }

    // Check authentication
    const user = await getCurrentUser();
    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization (admin, super_admin, or checker_admin)
    if (!["admin", "super_admin", "checker_admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Log access
    await logAccess({
      action: "checkin.event_types.list",
      method: "GET",
      resource: "/api/admin/checkin/event-types",
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
      },
    });

    const supabase = getSupabaseServiceClient();
    const { data: eventTypes, error } = await supabase
      .from("event_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    // Log successful access
    await logAccess({
      action: "checkin.event_types.list",
      method: "GET",
      resource: "/api/admin/checkin/event-types",
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        event_types_count: eventTypes?.length || 0,
      },
    });

    return NextResponse.json({ event_types: eventTypes });
  } catch (error) {
    console.error("Error fetching event types:", error);

    // Log error
    await logAccess({
      action: "checkin.event_types.list",
      method: "GET",
      resource: "/api/admin/checkin/event-types",
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
        actor: "unknown",
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
