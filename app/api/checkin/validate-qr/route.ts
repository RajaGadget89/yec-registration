import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-utils.server";
import { isCheckinSystemEnabled } from "@/lib/features";
import { logAccess } from "@/lib/audit/auditClient";
import { decryptQrPayload } from "@/lib/qr/qrService";

/**
 * POST /api/checkin/validate-qr
 * Validate QR code data and extract user information
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `validate_qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    const body = await req.json();
    const { qr_data, qr_token } = body || {};

    // Validate input
    if (!qr_data && !qr_token) {
      return NextResponse.json(
        { error: "Missing required field: qr_data or qr_token" },
        { status: 400 },
      );
    }

    // Log access
    await logAccess({
      action: "checkin.qr.validate",
      method: "POST",
      resource: "/api/checkin/validate-qr",
      result: "attempting",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
      },
    });

    // Parse QR code data (legacy JSON) or decrypt token (new)
    let parsedData: any;
    if (qr_token) {
      try {
        const payload = decryptQrPayload(qr_token);
        parsedData = {
          tracking_id: payload.tracking_id,
          form_key: payload.form_key,
        };
      } catch (_err) {
        return NextResponse.json(
          { valid: false, error: "Invalid or expired QR token" },
          { status: 400 },
        );
      }
    } else {
      try {
        parsedData = JSON.parse(qr_data);
      } catch (_error) {
        return NextResponse.json(
          {
            valid: false,
            error: "Invalid QR code format",
          },
          { status: 400 },
        );
      }
    }

    // Validate QR code structure
    const hasLegacyShape =
      parsedData.regId && parsedData.fullName && parsedData.phone;
    const hasEncryptedShape = parsedData.tracking_id && parsedData.form_key;
    if (!hasLegacyShape && !hasEncryptedShape) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid QR code data structure",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get user information from database (support legacy YEC and form-based)
    let registration: any = null;
    let error: any = null;
    if (hasLegacyShape) {
      ({ data: registration, error } = await supabase
        .from("registrations")
        .select(
          `registration_id, first_name, last_name, email, phone, status, yec_province`,
        )
        .eq("registration_id", parsedData.regId)
        .single());
    } else {
      const { data, error: formError } = await supabase
        .from("form_registrations")
        .select(`id, form_key, tracking_id, core_data, extra_data, status`)
        .eq("form_key", parsedData.form_key)
        .eq("tracking_id", parsedData.tracking_id)
        .single();
      error = formError;
      if (data) {
        registration = {
          registration_id: data.id,
          first_name: data.core_data?.first_name || data.core_data?.name || "",
          last_name: data.core_data?.last_name || "",
          email: data.core_data?.email,
          phone: data.core_data?.phone,
          status: data.status,
          yec_province: data.extra_data?.yec_province,
        };
      }
    }

    if (error || !registration) {
      return NextResponse.json(
        {
          valid: false,
          error: "Registration not found",
        },
        { status: 404 },
      );
    }

    if (registration.status !== "approved") {
      return NextResponse.json(
        {
          valid: false,
          error: "Registration not approved",
          registration_status: registration.status,
        },
        { status: 403 },
      );
    }

    // Log successful access
    await logAccess({
      action: "checkin.qr.validate",
      method: "POST",
      resource: "/api/checkin/validate-qr",
      result: "success",
      request_id: requestId,
      src_ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        actor: user.email,
        registration_id: registration.registration_id,
      },
    });

    return NextResponse.json({
      valid: true,
      registration_id: registration.registration_id,
      user_info: {
        full_name: `${registration.first_name} ${registration.last_name}`,
        email: registration.email,
        phone: registration.phone,
        yec_province: registration.yec_province,
      },
      badge_info: {
        registration_status: registration.status,
      },
    });
  } catch (error) {
    console.error("Error validating QR code:", error);

    // Log error
    await logAccess({
      action: "checkin.qr.validate",
      method: "POST",
      resource: "/api/checkin/validate-qr",
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
