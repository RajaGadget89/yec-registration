import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateDimensionAccess } from "../../../../../lib/admin-guard-server";
import { logAccess, logEvent } from "../../../../../lib/audit/auditClient";
import { EventService } from "../../../../../lib/events/eventService";
import { EventFactory } from "../../../../../lib/events/eventFactory";
import { createErrorResponse } from "../../../../../lib/errorResponses";
import type { Dimension } from "../../../../../lib/rbac";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse request body first to get dimension for RBAC validation
    const body = await request.json();
    const { dimension, notes } = body;

    // Validate dimension
    if (!dimension || !["payment", "profile", "tcc"].includes(dimension)) {
      return createErrorResponse(
        "INVALID_DIMENSION",
        "Invalid dimension specified",
        "Dimension must be one of: payment, profile, tcc",
        400,
      );
    }

    // Validate RBAC access for the specific dimension
    const adminValidation = validateDimensionAccess(
      request,
      dimension as Dimension,
    );
    if (!adminValidation.valid) {
      return createErrorResponse(
        "FORBIDDEN",
        "Access denied",
        adminValidation.error || "Insufficient permissions",
        403,
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

    // Check if registration is in a valid state for marking pass
    const validStates = [
      "waiting_for_review",
      "waiting_for_update_payment",
      "waiting_for_update_info",
      "waiting_for_update_tcc",
    ];
    if (!validStates.includes(registration.status)) {
      return createErrorResponse(
        "INVALID_STATUS",
        "Registration not in valid state for marking pass",
        `Registration status is ${registration.status}, expected one of: ${validStates.join(", ")}`,
        409,
      );
    }

    // Update review checklist
    const currentChecklist = registration.review_checklist || {
      payment: { status: "pending", notes: "" },
      profile: { status: "pending", notes: "" },
      tcc: { status: "pending", notes: "" },
    };

    const updatedChecklist = {
      ...currentChecklist,
      [dimension]: {
        status: "passed" as const,
        notes: notes || currentChecklist[dimension]?.notes || "",
      },
    };

    // Check if all dimensions are now passed
    const allPassed =
      updatedChecklist.payment.status === "passed" &&
      updatedChecklist.profile.status === "passed" &&
      updatedChecklist.tcc.status === "passed";

    // Determine new status
    let newStatus = registration.status;
    if (allPassed) {
      newStatus = "approved";
    } else if (registration.status.startsWith("waiting_for_update_")) {
      // If we're in an update state and this dimension is now passed,
      // check if any other dimensions still need updates
      const hasOtherUpdates =
        (dimension !== "payment" &&
          updatedChecklist.payment.status === "needs_update") ||
        (dimension !== "profile" &&
          updatedChecklist.profile.status === "needs_update") ||
        (dimension !== "tcc" && updatedChecklist.tcc.status === "needs_update");

      if (!hasOtherUpdates) {
        newStatus = "waiting_for_review";
      }
    }

    // Update registration
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        review_checklist: updatedChecklist,
        status: newStatus,
        update_reason: allPassed ? null : registration.update_reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId)
      .select()
      .single();

    if (updateError || !updatedRegistration) {
      console.error("Failed to update registration:", updateError);
      return createErrorResponse(
        "UPDATE_FAILED",
        "Failed to update registration",
        "Could not update registration checklist",
        500,
      );
    }

    // Emit domain event
    try {
      const event = EventFactory.createAdminMarkPass(
        updatedRegistration,
        adminEmail,
        dimension as "payment" | "profile" | "tcc",
      );
      await EventService.emit(event);
    } catch (eventError) {
      console.error("Failed to emit admin mark pass event:", eventError);
      // Don't fail the request if event emission fails
    }

    // Log audit events
    try {
      await logAccess({
        action: "admin.mark_pass",
        method: "POST",
        resource: `/api/admin/review/${registrationId}/mark-pass`,
        result: "success",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          admin_email: adminEmail,
          dimension,
          notes: notes || null,
          all_passed: allPassed,
        },
      });

      await logEvent({
        action: "admin.mark_pass",
        resource: "registration",
        resource_id: registrationId,
        actor_id: adminEmail,
        actor_role: "admin",
        result: "success",
        correlation_id: requestId,
        meta: {
          dimension,
          notes: notes || null,
          new_status: newStatus,
          all_passed: allPassed,
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit events:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `${dimension} marked as passed`,
      registration_id: registrationId,
      dimension,
      notes: notes || null,
      new_status: newStatus,
      all_passed: allPassed,
      auto_approved: allPassed,
    });
  } catch (error) {
    console.error("Unexpected error in mark-pass route:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}
