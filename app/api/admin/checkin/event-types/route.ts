import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../lib/features";
import { logAccess, logEvent } from "../../../../lib/audit/auditClient";

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

/**
 * POST /api/admin/checkin/event-types
 * Create a new event type (super_admin only)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `event_types_create_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    if (!isCheckinSystemEnabled()) {
      return NextResponse.json(
        { error: "Feature not available" },
        { status: 404 },
      );
    }

    const user = await getCurrentUser();
    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      name,
      description = "",
      is_active = true,
      is_default = false,
      business_rule_category,
    } = body || {};

    // Validate
    if (!name) {
      return NextResponse.json(
        { error: "'name' is required" },
        { status: 400 },
      );
    }
    const allowedCategories = ["MULTIPLE_ALLOWED", "ONE_TIME_ONLY"];
    if (!allowedCategories.includes(business_rule_category)) {
      return NextResponse.json(
        { error: "Invalid business_rule_category" },
        { status: 400 },
      );
    }

    await logAccess({
      action: "checkin.event_types.create",
      method: "POST",
      resource: "/api/admin/checkin/event-types",
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { actor: user.email, name },
    });

    const supabase = getSupabaseServiceClient();

    // Uniqueness check (case-insensitive)
    const { data: dupCheck, error: dupErr } = await supabase
      .from("event_types")
      .select("id")
      .ilike("name", name);
    if (dupErr) throw dupErr;
    if (dupCheck && dupCheck.length > 0) {
      return NextResponse.json(
        { error: "Event type name already exists" },
        { status: 409 },
      );
    }

    // Create
    const { data: created, error } = await supabase
      .from("event_types")
      .insert([
        {
          name,
          description,
          is_active,
          is_default: false, // set after optional default handling
          business_rule_category,
        },
      ])
      .select("*")
      .single();
    if (error) throw error;

    // Handle default toggle ensuring single default
    if (is_default) {
      const newId = created.id;
      // unset others then set this one
      const { error: unsetErr } = await supabase
        .from("event_types")
        .update({ is_default: false })
        .eq("is_default", true);
      if (unsetErr) throw unsetErr;
      const { error: setErr } = await supabase
        .from("event_types")
        .update({ is_default: true })
        .eq("id", newId);
      if (setErr) throw setErr;
      created.is_default = true;
    }

    await logEvent({
      action: "checkin.event_type.created",
      resource: "/api/admin/checkin/event-types",
      resource_id: created.id,
      actor_id: user.id,
      actor_role: "admin",
      result: "success",
      correlation_id: requestId,
      meta: { name: created.name },
    });

    await logAccess({
      action: "checkin.event_types.create",
      method: "POST",
      resource: "/api/admin/checkin/event-types",
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { actor: user.email, id: created.id },
    });

    return NextResponse.json({ event_type: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating event type:", error);
    await logAccess({
      action: "checkin.event_types.create",
      method: "POST",
      resource: "/api/admin/checkin/event-types",
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
