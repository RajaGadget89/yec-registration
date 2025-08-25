import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateAdminAccess } from "../../../../../lib/admin-guard-server";
import { logAccess, logEvent } from "../../../../../lib/audit/auditClient";
import { EventService } from "../../../../../lib/events/eventService";
import { EventFactory } from "../../../../../lib/events/eventFactory";
import { createErrorResponse } from "../../../../../lib/errorResponses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Validate admin access
    const adminValidation = await validateAdminAccess(request);
    if (!adminValidation.valid) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "Admin access required",
        adminValidation.error || "Authentication failed",
        401,
      );
    }

    const adminEmail = adminValidation.adminEmail;
    if (!adminEmail) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "Admin access required",
        "Admin email not found",
        401,
      );
    }
    const registrationId = params.id;

    // Get registration
    const supabase = getSupabaseServiceClient();
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (fetchError || !registration) {
      return createErrorResponse(
        "REGISTRATION_NOT_FOUND",
        "Registration not found",
        `Registration with ID ${registrationId} not found`,
        404,
      );
    }

    // Check if registration is in a valid state for approval
    if (registration.status !== "waiting_for_review") {
      return createErrorResponse(
        "INVALID_STATUS",
        "Registration not in valid state for approval",
        `Registration status is ${registration.status}, expected waiting_for_review`,
        409,
      );
    }

    // Check if all dimensions are passed
    const checklist = registration.review_checklist || {
      payment: { status: "pending", notes: "" },
      profile: { status: "pending", notes: "" },
      tcc: { status: "pending", notes: "" },
    };

    const allPassed =
      checklist.payment.status === "passed" &&
      checklist.profile.status === "passed" &&
      checklist.tcc.status === "passed";

    if (!allPassed) {
      return createErrorResponse(
        "NOT_ALL_PASSED",
        "Cannot approve registration",
        "All dimensions must be marked as passed before approval",
        409,
      );
    }

    // Update registration to approved
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        status: "approved",
        update_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId)
      .select()
      .single();

    if (updateError || !updatedRegistration) {
      console.error("Failed to update registration:", updateError);
      return createErrorResponse(
        "UPDATE_FAILED",
        "Failed to approve registration",
        "Could not update registration status to approved",
        500,
      );
    }

    // Emit domain event
    try {
      const event = EventFactory.createAdminApproved(
        updatedRegistration,
        adminEmail,
      );
      await EventService.emit(event);
    } catch (eventError) {
      console.error("Failed to emit admin approved event:", eventError);
      // Don't fail the request if event emission fails
    }

    // Log audit events
    try {
      await logAccess({
        action: "admin.approved",
        method: "POST",
        resource: `/api/admin/review/${registrationId}/approve`,
        result: "success",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          admin_email: adminEmail,
        },
      });

      await logEvent({
        action: "admin.approved",
        resource: "registration",
        resource_id: registrationId,
        actor_id: adminEmail,
        actor_role: "admin",
        result: "success",
        correlation_id: requestId,
        meta: {
          new_status: "approved",
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit events:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Registration approved successfully",
      registration_id: registrationId,
      new_status: "approved",
      approved_by: adminEmail,
    });
  } catch (error) {
    console.error("Unexpected error in approve route:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}
