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

  try {
    const supabase = getSupabaseServiceClient();

    // Get outbox statistics
    const { data: stats, error: statsError } = await supabase.rpc(
      "fn_get_outbox_stats",
    );

    if (statsError) {
      return NextResponse.json(
        {
          error: "Failed to get outbox stats",
          details: statsError.message,
        },
        { status: 500 },
      );
    }

    // Get recent pending emails
    const { data: pendingEmails, error: pendingError } = await supabase.rpc(
      "fn_get_pending_emails",
      { limit: 10 },
    );

    if (pendingError) {
      return NextResponse.json(
        {
          error: "Failed to get pending emails",
          details: pendingError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      stats,
      pendingEmails: pendingEmails || [],
      environment: {
        EMAIL_MODE: process.env.EMAIL_MODE,
        EMAIL_CAP_MAX_PER_RUN: process.env.EMAIL_CAP_MAX_PER_RUN,
        BLOCK_NON_ALLOWLIST: process.env.BLOCK_NON_ALLOWLIST,
        EMAIL_ALLOWLIST: process.env.EMAIL_ALLOWLIST,
        DISPATCH_DRY_RUN: process.env.DISPATCH_DRY_RUN,
      },
    });
  } catch (error) {
    console.error("Outbox status error:", error);
    return NextResponse.json(
      {
        error: "Outbox status failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
