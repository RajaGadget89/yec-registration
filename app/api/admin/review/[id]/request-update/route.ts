import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateDimensionAccess } from "../../../../../lib/admin-guard-server";
import { logAccess, logEvent } from "../../../../../lib/audit/auditClient";
import { EventService } from "../../../../../lib/events/eventService";
import { EventFactory } from "../../../../../lib/events/eventFactory";
import { createErrorResponse } from "../../../../../lib/errorResponses";
import { TokenService } from "../../../../../lib/tokenService";
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

    // Check if registration is in reviewable state
    if (registration.status !== "waiting_for_review") {
      return createErrorResponse(
        "INVALID_STATUS",
        "Registration not in reviewable state",
        `Registration status is ${registration.status}, expected waiting_for_review`,
        409,
      );
    }

    // Create secure deep-link token
    let tokenId: string;
    try {
      tokenId = await TokenService.createToken(
        registrationId,
        dimension as "payment" | "profile" | "tcc",
        adminEmail,
        notes,
      );
    } catch (error) {
      console.error("Failed to create secure token:", error);
      return createErrorResponse(
        "TOKEN_CREATION_FAILED",
        "Failed to create update token",
        "Could not generate secure update link",
        500,
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
        status: "needs_update" as const,
        notes: notes || "",
      },
    };

    // Determine new status based on dimension
    let newStatus: string;
    switch (dimension) {
      case "payment":
        newStatus = "waiting_for_update_payment";
        break;
      case "profile":
        newStatus = "waiting_for_update_info";
        break;
      case "tcc":
        newStatus = "waiting_for_update_tcc";
        break;
      default:
        newStatus = "waiting_for_review";
    }

    // Update registration
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        review_checklist: updatedChecklist,
        status: newStatus,
        update_reason: dimension,
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
        "Could not update registration status and checklist",
        500,
      );
    }

    // Emit domain event
    try {
      const event = EventFactory.createAdminRequestUpdate(
        updatedRegistration,
        adminEmail,
        dimension as "payment" | "profile" | "tcc",
        notes,
        tokenId, // Only emit token_id, not the actual token
      );
      await EventService.emit(event);
    } catch (eventError) {
      console.error("Failed to emit admin request update event:", eventError);
      // Don't fail the request if event emission fails
    }

    // Log audit events
    try {
      await logAccess({
        action: "admin.request_update",
        method: "POST",
        resource: `/api/admin/review/${registrationId}/request-update`,
        result: "success",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          admin_email: adminEmail,
          dimension,
          notes: notes || null,
        },
      });

      await logEvent({
        action: "admin.request_update",
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
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit events:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Update requested for ${dimension}`,
      registration_id: registrationId,
      dimension,
      notes: notes || null,
      new_status: newStatus,
      token_id: tokenId,
      expires_in_hours: 24,
    });
  } catch (error) {
    console.error("Unexpected error in request-update route:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}
