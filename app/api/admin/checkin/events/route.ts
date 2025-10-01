import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../lib/features";
import { logAccess, logEvent } from "../../../../lib/audit/auditClient";

/**
 * GET /api/admin/checkin/events
 * List all check-in events (Super Admin only)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `events_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // Check authorization (super_admin only)
    if (user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 },
      );
    }

    // Log access
    await logAccess({
      action: "checkin.events.list",
      method: "GET",
      resource: "/api/admin/checkin/events",
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { actor: user.email },
    });

    const supabase = getSupabaseServiceClient();
    const { data: events, error } = await supabase
      .from("checkin_events")
      .select(
        `
        *,
        event_types:event_type_id(id, name, description, business_rule_category),
        created_by_user:created_by(email)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Log successful access
    await logAccess({
      action: "checkin.events.list",
      method: "GET",
      resource: "/api/admin/checkin/events",
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
    console.error("Error fetching events:", error);

    // Log error
    await logAccess({
      action: "checkin.events.list",
      method: "GET",
      resource: "/api/admin/checkin/events",
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

/**
 * POST /api/admin/checkin/events
 * Create new check-in event (Super Admin only)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `events_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // Check authorization (super_admin only)
    if (user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, description, location, start_time, end_time, event_type_id } =
      body;

    // Validate required fields
    if (!name || !event_type_id) {
      return NextResponse.json(
        { error: "Name and event_type_id are required" },
        { status: 400 },
      );
    }

    // Log access
    await logAccess({
      action: "checkin.events.create",
      method: "POST",
      resource: "/api/admin/checkin/events",
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        event_name: name,
        event_type_id,
      },
    });

    const supabase = getSupabaseServiceClient();

    // Create event
    const { data: event, error } = await supabase
      .from("checkin_events")
      .insert({
        name,
        description,
        location,
        start_time,
        end_time,
        event_type_id,
        created_by: user.id,
        is_active: true,
      })
      .select(
        `
        *,
        event_types:event_type_id(name, description, business_rule_category),
        created_by_user:created_by(email)
      `,
      )
      .single();

    if (error) {
      throw error;
    }

    // Log successful event
    await logEvent({
      action: "checkin.events.created",
      resource: "checkin_events",
      resource_id: event.id,
      actor_id: user.email,
      actor_role: "admin",
      result: "success",
      correlation_id: requestId,
      meta: {
        event_name: name,
        event_type_id,
        location,
        created_by: user.email,
      },
    });

    // Log successful access
    await logAccess({
      action: "checkin.events.create",
      method: "POST",
      resource: "/api/admin/checkin/events",
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        event_id: event.id,
        event_name: name,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);

    // Log error
    await logAccess({
      action: "checkin.events.create",
      method: "POST",
      resource: "/api/admin/checkin/events",
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
