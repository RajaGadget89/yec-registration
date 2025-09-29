import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../lib/features";
import { logAccess } from "../../../../lib/audit/auditClient";

/**
 * GET /api/checkin/events/[event_id]
 * Get event information by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { event_id: string } },
) {
  const startTime = Date.now();
  const requestId = `checkin_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const eventId = params.event_id;

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
      action: "checkin.event.get",
      method: "GET",
      resource: `/api/checkin/events/${eventId}`,
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        event_id: eventId,
      },
    });

    const supabase = getSupabaseServiceClient();

    // Get event information
    const { data: event, error } = await supabase
      .from("checkin_events")
      .select(
        `
        id,
        name,
        location,
        description,
        is_active,
        start_time,
        end_time,
        event_types!inner(
          name,
          description
        )
      `,
      )
      .eq("id", eventId)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.is_active) {
      return NextResponse.json(
        { error: "Event is not active" },
        { status: 403 },
      );
    }

    // Format event information
    const eventInfo = {
      id: event.id,
      name: event.name,
      location: event.location,
      description: event.description,
      event_type: (event.event_types as any).name,
      event_type_description: (event.event_types as any).description,
      start_time: event.start_time,
      end_time: event.end_time,
      is_active: event.is_active,
    };

    // Log successful access
    await logAccess({
      action: "checkin.event.get",
      method: "GET",
      resource: `/api/checkin/events/${eventId}`,
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        event_id: eventId,
      },
    });

    return NextResponse.json({
      success: true,
      event: eventInfo,
    });
  } catch (error) {
    console.error("Error fetching event:", error);

    // Log error
    await logAccess({
      action: "checkin.event.get",
      method: "GET",
      resource: `/api/checkin/events/${eventId}`,
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: "unknown",
        event_id: eventId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
