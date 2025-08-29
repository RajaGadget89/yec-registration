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
    const { tracking_code, update_reason } = body;

    if (!tracking_code) {
      return NextResponse.json(
        { error: "tracking_code is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Update the registration
    const { data, error } = await supabase
      .from("registrations")
      .update({
        update_reason: update_reason,
        updated_at: new Date().toISOString(),
      })
      .eq("registration_id", tracking_code)
      .select();

    if (error) {
      console.error("Error updating registration:", error);
      return NextResponse.json(
        { error: "Failed to update registration", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Registration updated successfully",
      data: data[0],
    });
  } catch (error) {
    console.error("Error in update-registration endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
