import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase/server";
import { hasRoleFromRequest } from "../../../../../lib/auth-utils.server";
import { EventService } from "../../../../../lib/events/eventService";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const correlationId = `reject-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const isDebug = process.env.DEBUG_REJECT === "1";

  try {
    // Check admin authentication - allow admin or super_admin roles
    const hasAdminRole = await hasRoleFromRequest(request, "admin");
    if (!hasAdminRole) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = params;

    // Use service client for RLS-safe operations (no E2E bypass header needed)
    const supabase = getSupabaseServiceClient();

    // Stage 1: fetch_row
    let stage = "fetch_row";
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("id, registration_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !registration) {
      const errorDetails = {
        stage,
        code: fetchError?.code || "NOT_FOUND",
        details: fetchError?.message || "Registration not found",
        hint: "Check if registration ID exists and is accessible",
        message: "Registration not found",
        correlation_id: correlationId,
      };

      if (isDebug) {
        console.error("Reject diagnostics:", errorDetails);
      }

      return NextResponse.json(
        { ok: false, error: "Registration not found" },
        { status: 404 },
      );
    }

    // Stage 2: update_row
    stage = "update_row";
    const { error: updateError } = await supabase
      .from("registrations")
      .update({ status: "rejected" })
      .eq("id", id);

    if (updateError) {
      const errorDetails = {
        stage,
        code: updateError.code || "UPDATE_FAILED",
        details: updateError.message,
        hint: "Check database permissions and column constraints",
        message: "Failed to update registration status",
        correlation_id: correlationId,
      };

      if (isDebug) {
        console.error("Reject diagnostics:", errorDetails);
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: errorDetails.code,
              message: errorDetails.message,
              hint: errorDetails.hint,
            },
          },
          { status: 500 },
        );
      }

      console.error("Error updating registration status:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to update registration status" },
        { status: 500 },
      );
    }

    // Stage 3: emit_events
    stage = "emit_events";
    try {
      // Get admin email from request headers (set by auth middleware)
      const adminEmail =
        request.headers.get("x-admin-email") ||
        request.cookies.get("admin-email")?.value;

      if (!adminEmail) {
        throw new Error("Admin email is required for audit trail");
      }

      await EventService.emitAdminRejected(registration, adminEmail);
      console.log("Admin rejected event emitted successfully");
    } catch (eventError) {
      const errorDetails = {
        stage,
        code: "EVENT_EMISSION_FAILED",
        details:
          eventError instanceof Error ? eventError.message : String(eventError),
        hint: "Event emission failed but status was updated - check event service configuration",
        message: "Failed to emit rejection event",
        correlation_id: correlationId,
      };

      if (isDebug) {
        console.error("Reject diagnostics:", errorDetails);
        // Continue execution - don't fail the request for event emission issues
      } else {
        console.error("Error emitting admin rejected event:", eventError);
        // Continue execution - don't fail the request for event emission issues
      }
    }

    // Stage 4: enqueue_email (if applicable)
    stage = "enqueue_email";
    try {
      // Email enqueueing would happen here if needed
      // For now, we'll skip this stage as it's handled by the event system
      console.log("Email enqueueing handled by event system");
    } catch (emailError) {
      const errorDetails = {
        stage,
        code: "EMAIL_ENQUEUE_FAILED",
        details:
          emailError instanceof Error ? emailError.message : String(emailError),
        hint: "Email enqueueing failed but status was updated - check email service configuration",
        message: "Failed to enqueue rejection email",
        correlation_id: correlationId,
      };

      if (isDebug) {
        console.error("Reject diagnostics:", errorDetails);
        // Continue execution - don't fail the request for email issues
      } else {
        console.error("Error enqueueing rejection email:", emailError);
        // Continue execution - don't fail the request for email issues
      }
    }

    return NextResponse.json({
      ok: true,
      id: registration.id,
      status: "rejected",
    });
  } catch (error) {
    const errorDetails = {
      stage: "unexpected_error",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : String(error),
      hint: "Unexpected error occurred during rejection process",
      message: "Internal server error",
      correlation_id: correlationId,
    };

    if (isDebug) {
      console.error("Reject diagnostics:", errorDetails);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: errorDetails.code,
            message: errorDetails.message,
            hint: errorDetails.hint,
          },
        },
        { status: 500 },
      );
    }

    console.error("Unexpected error in reject action:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
