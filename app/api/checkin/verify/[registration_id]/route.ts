import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { isCheckinSystemEnabled } from "../../../../lib/features";
import { logAccess } from "../../../../lib/audit/auditClient";

/**
 * GET /api/checkin/verify/[registration_id]
 * Verify registration and get user information for check-in
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ registration_id: string }> },
) {
  const startTime = Date.now();
  const requestId = `checkin_verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { registration_id: registrationId } = await params;

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
      action: "checkin.verify.registration",
      method: "GET",
      resource: `/api/checkin/verify/${registrationId}`,
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

    // Get user information by registration_id
    // Now that QR codes contain unique registration_id, we only need to search by that
    const { data: registration, error } = await supabase
      .from("registrations")
      .select(
        `
        registration_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        yec_province,
        profile_image_url
      `,
      )
      .eq("registration_id", registrationId)
      .single();

    if (error || !registration) {
      console.log(
        `[checkin/verify] Registration not found with ID: ${registrationId}`,
      );
    } else {
      console.log(
        `[checkin/verify] Found registration: ${registration.first_name} ${registration.last_name}`,
      );
    }

    if (error || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    if (registration.status !== "approved") {
      return NextResponse.json(
        {
          error: "Registration not approved",
          registration_status: registration.status,
        },
        { status: 403 },
      );
    }

    // Format user information
    const userInfo = {
      registration_id: registration.registration_id,
      full_name: `${registration.first_name} ${registration.last_name}`,
      email: registration.email,
      phone: registration.phone,
      yec_province: registration.yec_province,
      status: registration.status,
      profile_image_url: registration.profile_image_url,
    };

    // Log successful access
    await logAccess({
      action: "checkin.verify.registration",
      method: "GET",
      resource: `/api/checkin/verify/${registrationId}`,
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        registration_id: registrationId,
      },
    });

    return NextResponse.json({
      success: true,
      user: userInfo,
    });
  } catch (error) {
    console.error("Error verifying registration:", error);

    // Log error
    await logAccess({
      action: "checkin.verify.registration",
      method: "GET",
      resource: `/api/checkin/verify/${registrationId}`,
      result: "error",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: "unknown",
        registration_id: registrationId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
