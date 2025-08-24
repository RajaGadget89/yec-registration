import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  // Check for test helpers enabled
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  if (!testHelpersEnabled || testHelpersEnabled !== "1") {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { emailId, status, sentAt } = body;

    if (!emailId || !status) {
      return NextResponse.json(
        { error: "emailId and status are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "sent" && sentAt) {
      updateData.sent_at = sentAt;
    }

    // Update email status
    const { data, error } = await supabase
      .from("email_outbox")
      .update(updateData)
      .eq("id", emailId)
      .select("id, status, sent_at, updated_at");

    if (error) {
      console.error("Error updating email status:", error);
      return NextResponse.json(
        { error: "Failed to update email status", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      updated: data?.[0] || null,
      message: `Email ${emailId} status updated to ${status}`,
    });
  } catch (error) {
    console.error("Unexpected error in update-email-status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
