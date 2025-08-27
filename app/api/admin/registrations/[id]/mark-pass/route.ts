import { NextRequest, NextResponse } from "next/server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { isAdmin } from "../../../../../lib/admin-guard";
import { EventService } from "../../../../../lib/events/eventService";
import { withAuditLogging } from "../../../../../lib/audit/withAuditAccess";

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check admin authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { dimension } = body;

    // Validate dimension
    if (!dimension || !["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid dimension. Must be payment, profile, or tcc",
        },
        { status: 400 },
      );
    }

    // Get appropriate Supabase client (service client if E2E bypass enabled)
    const supabase = await maybeServiceClient(request);

    // Load current registration
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return NextResponse.json(
        { ok: false, error: "Registration not found" },
        { status: 404 },
      );
    }

    // Update the specific dimension to passed
    const currentChecklist = registration.review_checklist || {
      payment: { status: "pending" },
      profile: { status: "pending" },
      tcc: { status: "pending" },
    };

    // Update the specific dimension
    currentChecklist[dimension] = { status: "passed" };

    // Update registration with new checklist
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        review_checklist: currentChecklist,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to mark dimension as passed" },
        { status: 500 },
      );
    }

    // Check if all dimensions are now passed (auto-approve)
    const allPassed =
      currentChecklist.payment.status === "passed" &&
      currentChecklist.profile.status === "passed" &&
      currentChecklist.tcc.status === "passed";

    let finalStatus = updatedRegistration.status;
    if (allPassed) {
      // Auto-approve
      const { data: approveResult, error: approveError } = await supabase.rpc(
        "fn_try_approve",
        { reg_id: id },
      );

      if (
        !approveError &&
        approveResult &&
        approveResult.length > 0 &&
        approveResult[0].success
      ) {
        finalStatus = "approved";
      }
    }

    // Emit admin mark pass event for centralized side-effects
    try {
      if (!user.email) {
        throw new Error("Admin email is required");
      }
      await EventService.emitAdminMarkPass(registration, user.email, dimension);
      console.log("Admin mark pass event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin mark pass event:", eventError);
      // Don't fail the request if event emission fails
    }

    return NextResponse.json({
      ok: true,
      id: registration.id,
      status: finalStatus,
      dimension: dimension,
      all_passed: allPassed,
      message: `Dimension ${dimension} marked as passed${allPassed ? " - Registration auto-approved" : ""}`,
    });
  } catch (error) {
    console.error("Unexpected error in mark pass action:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export the wrapped handler
export const POST = withAuditLogging(handlePOST, {
  resource: "admin/mark-pass",
});
