import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  // Security check - only allow in test environment
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  const authHeader = request.headers.get("Authorization");

  if (testHelpersEnabled !== "1" || !authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Test helpers not enabled or unauthorized" },
      { status: 403 },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
      .select("id, registration_id, email, status, created_at")
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
