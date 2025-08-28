import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const trackingCode = searchParams.get("tracking_code");

  if (!trackingCode) {
    return NextResponse.json(
      { error: "tracking_code parameter is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data: registration, error } = await supabase
      .from("registrations")
      .select("id, registration_id, email, status, update_reason, payment_review_status, profile_review_status, tcc_review_status, review_checklist, created_at")
      .eq("registration_id", trackingCode)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Registration not found" },
          { status: 404 },
        );
      }
      console.error("Database error:", error);
      return NextResponse.json(
        {
          error: "Database error",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: registration.id,
      tracking_code: registration.registration_id,
      email: registration.email,
      status: registration.status,
      update_reason: registration.update_reason,
      payment_review_status: registration.payment_review_status,
      profile_review_status: registration.profile_review_status,
      tcc_review_status: registration.tcc_review_status,
      review_checklist: registration.review_checklist,
      created_at: registration.created_at,
    });
  } catch (error) {
    console.error("Peek registration error:", error);
    return NextResponse.json(
      {
        error: "Peek registration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
