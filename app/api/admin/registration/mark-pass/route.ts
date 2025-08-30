import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { hasRoleFromRequest } from "../../../../lib/auth-utils.server";
import { EventService } from "../../../../lib/events/eventService";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";

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
    const { registrationId, dimension } = body;

    // Validate required fields
    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required", code: "VALIDATION_ERROR" },
        { status: 422 },
      );
    }

    // Validate dimension
    if (!dimension || !["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        {
          error: "Invalid dimension. Must be payment, profile, or tcc",
          code: "VALIDATION_ERROR",
        },
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

    // Check if dimension is already passed (idempotent behavior)
    const currentChecklist = registration.review_checklist || {
      payment: { status: "pending" },
      profile: { status: "pending" },
      tcc: { status: "pending" },
    };

    if (currentChecklist[dimension]?.status === "passed") {
      // Return current snapshot for idempotent behavior
      return NextResponse.json({
        ok: true,
        registrationId: registration.registration_id,
        dimension: dimension,
        newStatus: "passed",
        global: registration.status,
      });
    }

    // Update the specific dimension to passed
    currentChecklist[dimension] = { status: "passed" };

    // Update registration with new checklist
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        review_checklist: currentChecklist,
        updated_at: new Date().toISOString(),
      })
      .eq("registration_id", registrationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return NextResponse.json(
        { error: "Failed to mark dimension as passed", code: "UPDATE_FAILED" },
        { status: 500 },
      );
    }

    // Emit domain event for centralized side-effects
    try {
      await EventService.emitAdminMarkPass(registration, user.email, dimension);
      console.log("Admin mark pass event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin mark pass event:", eventError);
      // Don't fail the request if event emission fails (soft-fail)
    }

    return NextResponse.json({
      ok: true,
      registrationId: registration.registration_id,
      dimension: dimension,
      newStatus: "passed",
      global: updatedRegistration.status,
    });
  } catch (error) {
    console.error("Unexpected error in mark pass action:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// Export the wrapped handler with audit logging
export const POST = withAuditLogging(handlePOST, {
  resource: "admin/registration/mark-pass",
});
