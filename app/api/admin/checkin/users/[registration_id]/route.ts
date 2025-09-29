import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-utils.server";
import { isCheckinSystemEnabled } from "@/lib/features";
import { logAccess } from "@/lib/audit/auditClient";

/**
 * GET /api/admin/checkin/users/[registration_id]
 * Get user's check-in history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { registration_id: string } },
) {
  const startTime = Date.now();
  const requestId = `user_checkins_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const registrationId = params.registration_id;

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
      action: "checkin.users.history",
      method: "GET",
      resource: `/api/admin/checkin/users/${registrationId}`,
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        registration_id: registrationId,
      },
    });

    const supabase = getSupabaseServiceClient();

    // Get user information
    const { data: userInfo, error: userError } = await supabase
      .from("registrations")
      .select(
        `
        registration_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        yec_province
      `,
      )
      .eq("registration_id", registrationId)
      .single();

    if (userError || !userInfo) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's check-in history
    const { data: checkins, error: checkinsError } = await supabase
      .from("user_checkins")
      .select(
        `
        id,
        checkin_time,
        location,
        notes,
        metadata,
        checkin_events!inner(
          name,
          event_types!inner(name, description)
        ),
        admin_users!inner(
          email
        )
      `,
      )
      .eq("registration_id", registrationId)
      .order("checkin_time", { ascending: false });

    if (checkinsError) {
      throw checkinsError;
    }

    // Format check-ins
    const formattedCheckins =
      checkins?.map((checkin: any) => ({
        id: checkin.id,
        event_name: checkin.checkin_events.name,
        event_type: checkin.checkin_events.event_types.name,
        event_type_description: checkin.checkin_events.event_types.description,
        location: checkin.location,
        checkin_time: checkin.checkin_time,
        notes: checkin.notes,
        checked_by: checkin.admin_users.email,
        metadata: checkin.metadata,
      })) || [];

    const response = {
      registration_id: userInfo.registration_id,
      user_info: {
        full_name: `${userInfo.first_name} ${userInfo.last_name}`,
        email: userInfo.email,
        phone: userInfo.phone,
        yec_province: userInfo.yec_province,
        status: userInfo.status,
      },
      checkins: formattedCheckins,
      total_checkins: formattedCheckins.length,
    };

    // Log successful access
    await logAccess({
      action: "checkin.users.history",
      method: "GET",
      resource: `/api/admin/checkin/users/${registrationId}`,
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        registration_id: registrationId,
        checkins_count: formattedCheckins.length,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user check-in history:", error);

    // Log error
    await logAccess({
      action: "checkin.users.history",
      method: "GET",
      resource: `/api/admin/checkin/users/${registrationId}`,
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
        actor: "unknown",
        registration_id: registrationId,
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
