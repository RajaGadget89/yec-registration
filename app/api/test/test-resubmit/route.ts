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
    const { registrationId, payload } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // First, look up the registration by tracking code to get the UUID
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("id, status, update_reason, review_checklist")
      .eq("registration_id", registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: "Registration not found", details: fetchError },
        { status: 404 },
      );
    }

    // Test the domain function directly
    const { data: result, error: domainError } = await supabase.rpc(
      "fn_user_resubmit",
      {
        reg_id: registration.id,
        payload: payload || {},
      },
    );

    return NextResponse.json({
      registration: {
        id: registration.id,
        status: registration.status,
        update_reason: registration.update_reason,
        review_checklist: registration.review_checklist,
      },
      domain_result: result,
      domain_error: domainError,
      payload_sent: payload,
    });
  } catch (error) {
    console.error("Test resubmit error:", error);
    return NextResponse.json(
      {
        error: "Test resubmit failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
