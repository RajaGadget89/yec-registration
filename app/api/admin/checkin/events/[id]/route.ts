import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-utils.server";
import { isCheckinSystemEnabled } from "@/lib/features";
import { logAccess, logEvent } from "@/lib/audit/auditClient";

/**
 * PUT /api/admin/checkin/events/[id]
 * Update check-in event (Super Admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const startTime = Date.now();
  const requestId = `events_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const eventId = params.id;

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
    const { name, description, location, start_time, end_time, is_active } =
      body;

    // Log access
    await logAccess({
      action: "checkin.events.update",
      method: "PUT",
      resource: `/api/admin/checkin/events/${eventId}`,
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

    // Update event
    const { data: event, error } = await supabase
      .from("checkin_events")
      .update({
        name,
        description,
        location,
        start_time,
        end_time,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select(
        `
        *,
        event_types:event_type_id(name, description),
        created_by_user:created_by(email)
      `,
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      throw error;
    }

    // Log successful event
    await logEvent({
      action: "checkin.events.updated",
      resource: "checkin_events",
      resource_id: eventId,
      actor_id: user.email,
      actor_role: "admin",
      result: "success",
      correlation_id: requestId,
      meta: {
        event_name: name,
        is_active,
        updated_by: user.email,
      },
    });

    // Log successful access
    await logAccess({
      action: "checkin.events.update",
      method: "PUT",
      resource: `/api/admin/checkin/events/${eventId}`,
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        event_id: eventId,
        event_name: name,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error updating event:", error);

    // Log error
    await logAccess({
      action: "checkin.events.update",
      method: "PUT",
      resource: `/api/admin/checkin/events/${eventId}`,
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
        actor: "unknown",
        event_id: eventId,
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/checkin/events/[id]
 * Delete check-in event (Super Admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const startTime = Date.now();
  const requestId = `events_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const eventId = params.id;

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
      action: "checkin.events.delete",
      method: "DELETE",
      resource: `/api/admin/checkin/events/${eventId}`,
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

    // Check if event has any check-ins
    const { data: checkins, error: checkinsError } = await supabase
      .from("user_checkins")
      .select("id")
      .eq("checkin_event_id", eventId)
      .limit(1);

    if (checkinsError) {
      throw checkinsError;
    }

    if (checkins && checkins.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete event with existing check-ins" },
        { status: 409 },
      );
    }

    // Delete event
    const { error } = await supabase
      .from("checkin_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      throw error;
    }

    // Log successful event
    await logEvent({
      action: "checkin.events.deleted",
      resource: "checkin_events",
      resource_id: eventId,
      actor_id: user.email,
      actor_role: "admin",
      result: "success",
      correlation_id: requestId,
      meta: {
        deleted_by: user.email,
      },
    });

    // Log successful access
    await logAccess({
      action: "checkin.events.delete",
      method: "DELETE",
      resource: `/api/admin/checkin/events/${eventId}`,
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

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);

    // Log error
    await logAccess({
      action: "checkin.events.delete",
      method: "DELETE",
      resource: `/api/admin/checkin/events/${eventId}`,
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
        actor: "unknown",
        event_id: eventId,
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
