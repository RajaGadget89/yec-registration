import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Simple query to test
    const { data: groups, error } = await supabase
      .from("cms_faq_groups")
      .select("id, title, description, language, is_active, published_at")
      .eq("is_active", true)
      .not("published_at", "is", null)
      .limit(5);

    if (error) {
      console.error("FAQ groups error:", error);
      return NextResponse.json(
        { error: "Failed to fetch FAQ groups", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: groups || [],
      total: groups?.length || 0,
    });
  } catch (error) {
    console.error("FAQ Simple API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
