import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { isE2E } from "../../../lib/env/isE2E";

export async function GET(request: NextRequest) {
<<<<<<< HEAD
  // Security guard: Only allow in test environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.TEST_HELPERS_ENABLED === "1" ||
    request.headers.get("X-Test-Helpers-Enabled") === "1";
  if (!isTestEnv) {
=======
  // Check if E2E test mode is enabled
  if (!isE2E()) {
    return new Response("Forbidden", { status: 403 });
  }

  // Check for test helpers enabled
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  if (!testHelpersEnabled || testHelpersEnabled !== "1") {
>>>>>>> origin/main
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
    const supabase = getSupabaseServiceClient();

    // Get pending emails
    const { data: emails, error } = await supabase
      .from("email_outbox")
      .select("id, template, to_email, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    if (error) {
      console.error("Error fetching pending emails:", error);
      return NextResponse.json(
        { error: "Failed to fetch pending emails", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      emails: emails || [],
      count: emails?.length || 0,
    });
  } catch (error) {
    console.error("Unexpected error in get-pending-emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
