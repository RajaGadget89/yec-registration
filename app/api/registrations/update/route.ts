import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { logAccess, logEvent } from "../../../lib/audit/auditClient";
import { EventService } from "../../../lib/events/eventService";
import { EventFactory } from "../../../lib/events/eventFactory";
import { createErrorResponse } from "../../../lib/errorResponses";
import { uploadFileToSupabase } from "../../../lib/uploadFileToSupabase";
import { TokenService } from "../../../lib/tokenService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Get token from Authorization header or query parameter
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token");

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : queryToken;

    if (!token) {
      return createErrorResponse(
        "MISSING_TOKEN",
        "Deep-link token required",
        "Token must be provided via Authorization header or query parameter",
        401,
      );
    }

    // Validate token using TokenService
    const tokenValidation = await TokenService.validateTokenById(token);

    if (!tokenValidation.success) {
      return createErrorResponse(
        "INVALID_TOKEN",
        "Invalid or expired token",
        tokenValidation.message || "Token validation failed",
        401,
      );
    }

    const registrationId = tokenValidation.registration_id;
    const dimension = tokenValidation.dimension;
    const adminEmail = tokenValidation.admin_email;

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

    // Check if registration is in the correct update state
    const expectedStatus = `waiting_for_update_${dimension === "profile" ? "info" : dimension}`;
    if (registration.status !== expectedStatus) {
      return createErrorResponse(
        "INVALID_STATUS",
        "Registration not in correct update state",
        `Registration status is ${registration.status}, expected ${expectedStatus}`,
        409,
      );
    }

    // Parse form data
    const formData = await request.formData();
    const updates: Record<string, any> = {};

    // Handle file uploads based on dimension
    if (dimension === "payment") {
      const paymentFile = formData.get("payment_slip") as File;
      if (paymentFile) {
        try {
          const fileUrl = await uploadFileToSupabase(
            paymentFile,
            "payment-slips",
          );
          updates.payment_slip_url = fileUrl;
        } catch (uploadError) {
          console.error("Payment file upload failed:", uploadError);
          return createErrorResponse(
            "UPLOAD_FAILED",
            "Payment file upload failed",
            "Could not upload payment slip",
            500,
          );
        }
      }
    } else if (dimension === "profile") {
      const profileFile = formData.get("profile_image") as File;
      if (profileFile) {
        try {
          const fileUrl = await uploadFileToSupabase(
            profileFile,
            "profile-images",
          );
          updates.profile_image_url = fileUrl;
        } catch (uploadError) {
          console.error("Profile file upload failed:", uploadError);
          return createErrorResponse(
            "UPLOAD_FAILED",
            "Profile file upload failed",
            "Could not upload profile image",
            500,
          );
        }
      }

      // Handle profile text fields
      const textFields = [
        "first_name",
        "last_name",
        "nickname",
        "phone",
        "line_id",
        "email",
        "company_name",
        "business_type",
        "business_type_other",
        "yec_province",
      ];
      for (const field of textFields) {
        const value = formData.get(field);
        if (value) {
          updates[field] = value;
        }
      }
    } else if (dimension === "tcc") {
      const tccFile = formData.get("chamber_card") as File;
      if (tccFile) {
        try {
          const fileUrl = await uploadFileToSupabase(tccFile, "chamber-cards");
          updates.chamber_card_url = fileUrl;
        } catch (uploadError) {
          console.error("TCC file upload failed:", uploadError);
          return createErrorResponse(
            "UPLOAD_FAILED",
            "TCC file upload failed",
            "Could not upload chamber card",
            500,
          );
        }
      }
    }

    // Update review checklist - reset the updated dimension to pending
    const currentChecklist = registration.review_checklist || {
      payment: { status: "pending", notes: "" },
      profile: { status: "pending", notes: "" },
      tcc: { status: "pending", notes: "" },
    };

    const updatedChecklist = {
      ...currentChecklist,
      [dimension]: {
        status: "pending" as const,
        notes: "",
      },
    };

    // Update registration
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        ...updates,
        review_checklist: updatedChecklist,
        status: "waiting_for_review",
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
        "Failed to update registration",
        "Could not update registration with new information",
        500,
      );
    }

    // Mark token as used
    const tokenMarked = await TokenService.markTokenAsUsed(token);

    if (!tokenMarked) {
      console.error("Failed to mark token as used");
      // Don't fail the request if token update fails
    }

    // Emit domain event
    try {
      const event = EventFactory.createUserResubmitted(
        updatedRegistration,
        updates,
      );
      await EventService.emit(event);
    } catch (eventError) {
      console.error("Failed to emit user resubmitted event:", eventError);
      // Don't fail the request if event emission fails
    }

    // Log audit events
    try {
      await logAccess({
        action: "user.resubmitted",
        method: "POST",
        resource: "/api/registrations/update",
        result: "success",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        latency_ms: Date.now() - startTime,
        meta: {
          dimension,
          admin_email: adminEmail,
          updates_count: Object.keys(updates).length,
        },
      });

      await logEvent({
        action: "user.resubmitted",
        resource: "registration",
        resource_id: registrationId,
        actor_id: registration.email,
        actor_role: "user",
        result: "success",
        correlation_id: requestId,
        meta: {
          dimension,
          admin_email: adminEmail,
          updates: Object.keys(updates),
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit events:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `${dimension} updated successfully`,
      registration_id: registrationId,
      dimension,
      new_status: "waiting_for_review",
      updates_applied: Object.keys(updates),
    });
  } catch (error) {
    console.error("Unexpected error in registration update route:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}
