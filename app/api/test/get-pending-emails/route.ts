import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  // Check for test helpers enabled
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  if (!testHelpersEnabled || testHelpersEnabled !== "1") {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
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
