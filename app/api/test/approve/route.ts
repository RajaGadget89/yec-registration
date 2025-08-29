import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { EventService } from "../../../lib/events/eventService";
import { eventDrivenEmailService } from "../../../lib/emails/enhancedEmailService";

/**
 * Test-only helper endpoint to approve a registration
 * Guarded with NODE_ENV === 'test' || TEST_HELPERS_ENABLED === '1' and CRON_SECRET
 * Bypasses admin authentication for testing purposes
 */
export async function POST(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.TEST_HELPERS_ENABLED === "1" ||
    request.headers.get("X-Test-Helpers-Enabled") === "1";
  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
  }

  // CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Invalid CRON_SECRET" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { registrationId } = body;

    // Validate required fields
    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Load current registration
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("registration_id", registrationId)
      .single();

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return NextResponse.json(
        { error: "Registration not found" },
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
        { error: "Failed to approve registration" },
        { status: 500 },
      );
    }

    // Emit admin approved event for centralized side-effects
    try {
      await EventService.emitAdminApproved(
        registration,
        "test-admin@example.com",
      );
      console.log("Admin approved event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin approved event:", eventError);
      // Don't fail the request if event emission fails
    }

    // Send approval email notification
    try {
      const brandTokens = eventDrivenEmailService.getBrandTokens();
      const emailResult = await eventDrivenEmailService.processEvent(
        "review.approved",
        updatedRegistration,
        "test-admin@example.com",
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
      // Don't fail the request if email fails
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
    console.error("Error in test approve endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
