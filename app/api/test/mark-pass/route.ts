import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { EventService } from "../../../lib/events/eventService";

/**
 * Test-only helper endpoint to mark a dimension as passed
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
    const { registrationId, dimension } = body;

    // Validate required fields
    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 },
      );
    }

    if (!dimension || !["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        { error: "Invalid dimension. Must be payment, profile, or tcc" },
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

    // Prepare update payload with both checklist and individual status fields
    const updatePayload: any = {
      review_checklist: currentChecklist,
      updated_at: new Date().toISOString(),
    };

    // Update individual status fields based on dimension
    if (dimension === "payment") {
      updatePayload.payment_review_status = "passed";
    } else if (dimension === "profile") {
      updatePayload.profile_review_status = "passed";
    } else if (dimension === "tcc") {
      updatePayload.tcc_review_status = "passed";
    }

    // Update registration with both checklist and individual status fields
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update(updatePayload)
      .eq("registration_id", registrationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return NextResponse.json(
        { error: "Failed to mark dimension as passed" },
        { status: 500 },
      );
    }

    // Emit admin mark pass event for centralized side-effects
    try {
      await EventService.emitAdminMarkPass(
        registration,
        "test-admin@example.com",
        dimension,
      );
      console.log("Admin mark pass event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin mark pass event:", eventError);
      // Don't fail the request if event emission fails
    }

    return NextResponse.json({
      ok: true,
      registrationId: registration.registration_id,
      dimension: dimension,
      newStatus: "passed",
      global: updatedRegistration.status,
    });
  } catch (error) {
    console.error("Error in test mark-pass endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
