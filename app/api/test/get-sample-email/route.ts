import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  // Check for test helpers enabled
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  if (!testHelpersEnabled || testHelpersEnabled !== "1") {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 }
    );
  }

  try {
    const supabase = getSupabaseServiceClient();
    
    // Get a sample email record
    const { data: emails, error } = await supabase
      .from("email_outbox")
      .select("*")
      .limit(1);

    if (error) {
      console.error("Error fetching sample email:", error);
      return NextResponse.json(
        { error: "Failed to fetch sample email", details: error.message },
        { status: 500 }
      );
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No emails found in outbox",
        sample: null
      });
    }

    return NextResponse.json({
      success: true,
      sample: emails[0],
      columns: Object.keys(emails[0])
    });

  } catch (error) {
    console.error("Unexpected error in get-sample-email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
