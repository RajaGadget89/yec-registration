import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function DELETE(request: NextRequest) {
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
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email parameter is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServiceClient();

    // Delete from registrations table
    const { error: registrationError } = await supabase
      .from("registrations")
      .delete()
      .eq("email", email);

    if (registrationError) {
      console.error("Error deleting registration:", registrationError);
    }

    // Delete from email_outbox table
    const { error: outboxError } = await supabase
      .from("email_outbox")
      .delete()
      .eq("to_email", email);

    if (outboxError) {
      console.error("Error deleting from outbox:", outboxError);
    }

    return NextResponse.json({
      success: true,
      message: "Test data cleaned up",
      email: email,
      registrationDeleted: !registrationError,
      outboxDeleted: !outboxError,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
