import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.TEST_HELPERS_ENABLED === "1" ||
    process.env.E2E_TESTS === "true" ||
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
    const { registrationId, newStatus } = body;

    if (!registrationId || !newStatus) {
      return NextResponse.json(
        { error: "registrationId and newStatus are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Find the registration
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

    console.log(`[SIMPLE-UPDATE] Found registration: ${registration.id} with status: ${registration.status}`);

    // Update the status
    const { data: updateData, error: updateError } = await supabase
      .from('registrations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', registration.id)
      .select();

    console.log(`[SIMPLE-UPDATE] Update result:`, { updateData, updateError });

    if (updateError) {
      console.error("Failed to update registration:", updateError);
      return NextResponse.json(
        { error: "Failed to update registration", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      registrationId: registrationId,
      oldStatus: registration.status,
      newStatus: newStatus,
      updated: updateData?.[0] || null,
    });
  } catch (error) {
    console.error("Error in simple-update endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
