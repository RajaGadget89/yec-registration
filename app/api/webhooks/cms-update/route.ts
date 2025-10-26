import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * Webhook endpoint for real-time embedding updates
 * Call this when CMS content is created/updated/deleted
 * POST /api/webhooks/cms-update
 * Body: { type, item_id, action }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, item_id, action } = body;

    if (!type || !item_id || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Create embedding job
    const { error } = await supabase.from("embedding_jobs").insert({
      type,
      item_id,
      action,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating embedding job:", error);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Embedding job created",
      type,
      item_id,
      action,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
