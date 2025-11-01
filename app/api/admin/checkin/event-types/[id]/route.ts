import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../../lib/features";
import { logAccess, logEvent } from "../../../../../lib/audit/auditClient";

/**
 * PUT /api/admin/checkin/event-types/[id]
 * Update an event type (super_admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();
  const requestId = `event_types_update_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const { id: typeId } = await params;

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
    const allowedCategories = ["MULTIPLE_ALLOWED", "ONE_TIME_ONLY"];
    if (
      body.business_rule_category &&
      !allowedCategories.includes(body.business_rule_category)
    ) {
      return NextResponse.json(
        { error: "Invalid business_rule_category" },
        { status: 400 },
      );
    }

    await logAccess({
      action: "checkin.event_types.update",
      method: "PUT",
      resource: `/api/admin/checkin/event-types/${typeId}`,
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { actor: user.email, id: typeId },
    });

    const supabase = getSupabaseServiceClient();

    // Update core fields (except is_default which is handled separately)
    const updatePayload: any = { ...body };
    const toggleDefault = !!updatePayload.is_default;
    delete updatePayload.is_default;

    if (Object.keys(updatePayload).length > 0) {
      const { error: updErr } = await supabase
        .from("event_types")
        .update(updatePayload)
        .eq("id", typeId);
      if (updErr) throw updErr;
    }

    // Toggle default ensuring single default
    if (toggleDefault) {
      const { error: unsetErr } = await supabase
        .from("event_types")
        .update({ is_default: false })
        .eq("is_default", true);
      if (unsetErr) throw unsetErr;
      const { error: setErr } = await supabase
        .from("event_types")
        .update({ is_default: true })
        .eq("id", typeId);
      if (setErr) throw setErr;
    }

    const { data: after, error: fetchErr } = await supabase
      .from("event_types")
      .select("*")
      .eq("id", typeId)
      .single();
    if (fetchErr) throw fetchErr;

    await logEvent({
      action: "checkin.event_type.updated",
      resource: `/api/admin/checkin/event-types/${typeId}`,
      resource_id: typeId,
      actor_id: user.id,
      actor_role: "admin",
      result: "success",
      correlation_id: requestId,
      meta: {},
    });

    await logAccess({
      action: "checkin.event_types.update",
      method: "PUT",
      resource: `/api/admin/checkin/event-types/${typeId}`,
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { actor: user.email, id: typeId },
    });

    return NextResponse.json({ event_type: after });
  } catch (error) {
    console.error("Error updating event type:", error);
    await logAccess({
      action: "checkin.event_types.update",
      method: "PUT",
      resource: `/api/admin/checkin/event-types/${typeId}`,
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

/**
 * DELETE /api/admin/checkin/event-types/[id]
 * Delete an event type (super_admin only) – blocked if in use by events
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();
  const requestId = `event_types_delete_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const { id: typeId } = await params;

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

    await logAccess({
      action: "checkin.event_types.delete",
      method: "DELETE",
      resource: `/api/admin/checkin/event-types/${typeId}`,
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { actor: user.email, id: typeId },
    });

    const supabase = getSupabaseServiceClient();

    // Protect deletions if referenced by events
    const { data: usedBy, error: refErr } = await supabase
      .from("checkin_events")
      .select("id")
      .eq("event_type_id", typeId)
      .limit(1);
    if (refErr) throw refErr;
    if (usedBy && usedBy.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete event type: it is referenced by existing check-in events",
        },
        { status: 409 },
      );
    }

    const { error: delErr } = await supabase
      .from("event_types")
      .delete()
      .eq("id", typeId);
    if (delErr) throw delErr;

    await logEvent({
      action: "checkin.event_type.deleted",
      resource: `/api/admin/checkin/event-types/${typeId}`,
      resource_id: typeId,
      actor_id: user.id,
      actor_role: "admin",
      result: "success",
      correlation_id: requestId,
      meta: {},
    });

    await logAccess({
      action: "checkin.event_types.delete",
      method: "DELETE",
      resource: `/api/admin/checkin/event-types/${typeId}`,
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: { actor: user.email, id: typeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event type:", error);
    await logAccess({
      action: "checkin.event_types.delete",
      method: "DELETE",
      resource: `/api/admin/checkin/event-types/${typeId}`,
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
