import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../../lib/features";
import { logAccess } from "../../../../../lib/audit/auditClient";

/**
 * GET /api/checkin/checkin-status/[registration_id]/[event_id]
 * Check if user has already checked in to an event
 */
export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ registration_id: string; event_id: string }> },
) {
  const startTime = Date.now();
  const requestId = `checkin_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { registration_id: registrationId, event_id: eventId } = await params;

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
      action: "checkin.status.check",
      method: "GET",
      resource: `/api/checkin/checkin-status/${registrationId}/${eventId}`,
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        registration_id: registrationId,
        event_id: eventId,
      },
    });

    const supabase = getSupabaseServiceClient();

    // First, get the event information to check the event type
    const { data: event, error: eventError } = await supabase
      .from("checkin_events")
      .select(
        `
        id,
        name,
        event_types!inner(
          id,
          name,
          description,
          business_rule_category
        )
      `,
      )
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventTypeName = (event.event_types as any)?.name;
    console.log("🔍 Event type:", eventTypeName);

    // Check if user has already checked in to this specific event
    const { data: existingCheckin, error } = await supabase
      .from("user_checkins")
      .select("id, checkin_time, location, notes")
      .eq("registration_id", registrationId)
      .eq("checkin_event_id", eventId)
      .single();

    const alreadyCheckedInToThisEvent = !!existingCheckin && !error;

    // Business Rule: Check based on business rule category instead of event type name
    let alreadyCheckedInToEventType = false;
    let previousCheckinTime = null;

    if ((event.event_types as any).business_rule_category === "ONE_TIME_ONLY") {
      console.log('🔍 Checking for any previous "ONE_TIME_ONLY" check-ins');

      // NEW IMPROVED METHOD: Direct query using event_type_id
      const { data: previousCheckins, error: checkinsError } = await supabase
        .from("user_checkins")
        .select("id, checkin_time, location, notes")
        .eq("registration_id", registrationId)
        .eq("event_type_id", (event.event_types as any).id); // Direct relationship

      if (!checkinsError && previousCheckins && previousCheckins.length > 0) {
        alreadyCheckedInToEventType = true;
        previousCheckinTime = previousCheckins[0].checkin_time;
        console.log(
          "🔍 Found previous check-in to event type:",
          previousCheckins[0],
        );
      }
    }

    // For restricted event types, prioritize event type restriction over specific event check
    const alreadyCheckedIn =
      (event.event_types as any).business_rule_category === "ONE_TIME_ONLY"
        ? alreadyCheckedInToEventType // Only check event type restriction for ONE_TIME_ONLY
        : alreadyCheckedInToThisEvent; // For other event types, check specific event

    // Log successful access
    await logAccess({
      action: "checkin.status.check",
      method: "GET",
      resource: `/api/checkin/checkin-status/${registrationId}/${eventId}`,
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        registration_id: registrationId,
        event_id: eventId,
        already_checked_in: alreadyCheckedIn,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyCheckedIn,
      checkinTime: previousCheckinTime || existingCheckin?.checkin_time || null,
      eventType: eventTypeName,
      isEventTypeRestricted:
        (event.event_types as any).business_rule_category === "ONE_TIME_ONLY",
      checkinDetails: existingCheckin
        ? {
            id: existingCheckin.id,
            checkin_time: existingCheckin.checkin_time,
            location: existingCheckin.location,
            notes: existingCheckin.notes,
          }
        : null,
    });
  } catch (error) {
    console.error("Error checking check-in status:", error);

    // Log error
    await logAccess({
      action: "checkin.status.check",
      method: "GET",
      resource: `/api/checkin/checkin-status/${registrationId}/${eventId}`,
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: "unknown",
        registration_id: registrationId,
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
