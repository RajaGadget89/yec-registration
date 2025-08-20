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
  const action = searchParams.get("action");
  const resourceId = searchParams.get("resource_id");

  if (!action) {
    return NextResponse.json(
      { error: "action parameter is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServiceClient();

    // Query event logs
    let eventQuery = supabase
      .from("audit.event_log")
      .select("*")
      .eq("action", action)
      .order("occurred_at_utc", { ascending: false })
      .limit(10);

    if (resourceId) {
      eventQuery = eventQuery.eq("resource_id", resourceId);
    }

    const { data: events, error: eventError } = await eventQuery;

    // Query access logs
    const accessQuery = supabase
      .from("audit.access_log")
      .select("*")
      .eq("action", action)
      .order("occurred_at_utc", { ascending: false })
      .limit(10);

    const { data: accessLogs, error: accessError } = await accessQuery;

    return NextResponse.json({
      action,
      resource_id: resourceId,
      events: eventError ? [] : events,
      access_logs: accessError ? [] : accessLogs,
      eventError: eventError?.message,
      accessError: accessError?.message,
    });
  } catch (error) {
    console.error("Audit query error:", error);
    return NextResponse.json(
      {
        error: "Audit query failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
