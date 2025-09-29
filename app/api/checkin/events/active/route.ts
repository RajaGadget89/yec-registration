import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../lib/features";
import { logAccess } from "../../../../lib/audit/auditClient";

/**
 * GET /api/checkin/events/active
 * Get active check-in events for mobile interface
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `events_active_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    const hasAdminRole = ["admin", "super_admin"].includes(user.role);
    const hasCheckerRole = user.business_roles?.includes("checker_admin");

    if (!hasAdminRole && !hasCheckerRole) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Log access
    await logAccess({
      action: "checkin.events.active",
      method: "GET",
      resource: "/api/checkin/events/active",
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
    const { data: events, error } = await supabase
      .from("checkin_events")
      .select(
        `
        id,
        name,
        description,
        location,
        start_time,
        end_time,
        event_types:event_type_id(name, description)
      `,
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    // Log successful access
    await logAccess({
      action: "checkin.events.active",
      method: "GET",
      resource: "/api/checkin/events/active",
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        events_count: events?.length || 0,
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching active events:", error);

    // Log error
    await logAccess({
      action: "checkin.events.active",
      method: "GET",
      resource: "/api/checkin/events/active",
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
