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
      .select(
        [
          "id",
          "registration_id",
          "status",
          "email",
          "first_name",
          "last_name",
        ].join(", "),
      )
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

    // Parse optional reason and reject note from body
    let reason: string | undefined = undefined;
    let rejectNote: string | undefined = undefined;
    try {
      const body = await request.json().catch(() => ({}) as any);
      if (
        body &&
        typeof body.reason === "string" &&
        body.reason.trim().length > 0
      ) {
        reason = body.reason.trim();
      }
      if (
        body &&
        typeof body.rejectNote === "string" &&
        body.rejectNote.trim().length > 0
      ) {
        rejectNote = body.rejectNote.trim();
      }
    } catch {}

    // Stage 2: update_row
    stage = "update_row";

    // Normalize reason to enum values
    let normalizedReason:
      | "deadline_missed"
      | "ineligible_rule_match"
      | "other" = "other";
    if (reason === "deadline_missed" || reason === "ineligible_rule_match") {
      normalizedReason = reason;
    }
    // Persist the most informative reason possible to DB
    // Prefer custom admin note, then raw reason string, then normalized fallback
    const persistedReason =
      rejectNote && rejectNote.trim()
        ? rejectNote.trim()
        : reason && reason.trim()
          ? reason.trim()
          : normalizedReason;

    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        status: "rejected",
        rejected_reason: persistedReason,
      })
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

      // Coerce reason into known enum for template, keep free-text in rejectNote
      const normalizedReason:
        | "deadline_missed"
        | "ineligible_rule_match"
        | "other" =
        reason === "deadline_missed" || reason === "ineligible_rule_match"
          ? (reason as any)
          : "other";

      await EventService.emitAdminRejected(
        registration,
        adminEmail,
        normalizedReason,
        rejectNote, // use the custom admin note
      );
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

      // In development or preview, dispatch emails immediately since cron job doesn't run in these environments
      if (
        process.env.NODE_ENV === "development" ||
        process.env.VERCEL_ENV === "preview"
      ) {
        try {
          const { dispatchEmailBatch } = await import(
            "../../../../../lib/emails/dispatcher"
          );
          const dispatchResult = await dispatchEmailBatch(10, false); // Dispatch up to 10 emails

          if (dispatchResult.sent > 0) {
            console.log(
              `Rejection email dispatched immediately (${dispatchResult.sent} sent)`,
            );
          } else if (dispatchResult.errors > 0) {
            console.warn(
              `Rejection email dispatch failed (${dispatchResult.errors} errors)`,
            );
          }
        } catch (dispatchError) {
          console.warn(
            "Failed to dispatch rejection emails immediately:",
            dispatchError,
          );
        }
      }
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
