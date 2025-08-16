import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "../../../lib/supabase-server";

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

  try {
    const supabase = getServiceRoleClient();

    // Check if email_outbox table exists by trying to query it
    const { data: tableCheck, error: tableError } = await supabase
      .from("email_outbox")
      .select("count(*)")
      .limit(1);

    if (tableError) {
      return NextResponse.json({
        exists: false,
        error: tableError.message,
        code: tableError.code,
      });
    }

    // Try to get table structure
    const { data: structure, error: structureError } = await supabase.rpc(
      "fn_get_outbox_stats",
    );

    return NextResponse.json({
      exists: true,
      tableCheck,
      structure: structureError ? { error: structureError.message } : structure,
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL ? "SET" : "NOT_SET",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "SET"
          : "NOT_SET",
      },
    });
  } catch (error) {
    console.error("Check outbox error:", error);
    return NextResponse.json(
      {
        error: "Check outbox failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
