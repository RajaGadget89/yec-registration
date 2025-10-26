import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Simple query to test
    const { data: activities, error } = await supabase
      .from("cms_activity_cards")
      .select(
        "id, title, summary, content, language, published_at, image_url, card_slug, is_active",
      )
      .eq("is_active", true)
      .not("published_at", "is", null)
      .limit(5);

    if (error) {
      console.error("Activities error:", error);
      return NextResponse.json(
        { error: "Failed to fetch activities", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: activities || [],
      total: activities?.length || 0,
    });
  } catch (error) {
    console.error("Activities Simple API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
