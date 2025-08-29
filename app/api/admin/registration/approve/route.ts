import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { hasRoleFromRequest } from "../../../../lib/auth-utils.server";
import { EventService } from "../../../../lib/events/eventService";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import { eventDrivenEmailService } from "../../../../lib/emails/enhancedEmailService";

async function handlePOST(request: NextRequest) {
  try {
    // Check admin authentication and role
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Check if user has admin or super_admin role
    const hasAdminRole = await hasRoleFromRequest(request, "admin");
    if (!hasAdminRole) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { registrationId } = body;

    // Validate required fields
    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required", code: "VALIDATION_ERROR" },
        { status: 422 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Resolve tracking code to internal UUID
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("registration_id", registrationId)
      .single();

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return NextResponse.json(
        { error: "Registration not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if already approved (idempotent behavior)
    if (registration.status === "approved") {
      return NextResponse.json({
        ok: true,
        registrationId: registration.registration_id,
        global: "approved",
        dimensions: {
          payment: registration.payment_review_status,
          profile: registration.profile_review_status,
          tcc: registration.tcc_review_status,
        },
      });
    }

    // Precondition: Check if all three dimensions are passed
    const missingDimensions = [];
    if (registration.payment_review_status !== "passed") {
      missingDimensions.push("payment");
    }
    if (registration.profile_review_status !== "passed") {
      missingDimensions.push("profile");
    }
    if (registration.tcc_review_status !== "passed") {
      missingDimensions.push("tcc");
    }

    if (missingDimensions.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot approve registration - incomplete dimensions",
          code: "INCOMPLETE_DIMENSIONS",
          missing: missingDimensions,
        },
        { status: 409 },
      );
    }

    // All dimensions are passed, proceed with approval
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("registration_id", registrationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return NextResponse.json(
        { error: "Failed to approve registration", code: "UPDATE_FAILED" },
        { status: 500 },
      );
    }

    // Emit admin approved event for centralized side-effects
    try {
      if (!user.email) {
        throw new Error("Admin email is required");
      }
      await EventService.emitAdminApproved(registration, user.email);
      console.log("Admin approved event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin approved event:", eventError);
      // Don't fail the request if event emission fails (soft-fail)
    }

    // Send approval email notification
    try {
      const brandTokens = eventDrivenEmailService.getBrandTokens();
      const emailResult = await eventDrivenEmailService.processEvent(
        "review.approved",
        updatedRegistration,
        user.email,
        undefined, // no dimension for approvals
        undefined, // no notes for approvals
        undefined, // no badge URL for now
        undefined, // no rejection reason for approvals
        brandTokens,
      );

      if (emailResult) {
        console.log("Approval email queued successfully:", {
          to: emailResult.to,
          template: emailResult.template,
        });
      }
    } catch (emailError) {
      console.error("Error queuing approval email:", emailError);
      // Don't fail the request if email fails (soft-fail)
    }

    return NextResponse.json({
      ok: true,
      registrationId: registration.registration_id,
      global: "approved",
      dimensions: {
        payment: "passed",
        profile: "passed",
        tcc: "passed",
      },
    });
  } catch (error) {
    console.error("Unexpected error in approve action:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export const POST = withAuditLogging(handlePOST, {
  resource: "admin_approve",
});
