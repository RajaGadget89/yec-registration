import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Simple query to test
    const { data: news, error } = await supabase
      .from("cms_news")
      .select(
        "id, headline, content, language, published_at, image_url, is_active",
      )
      .eq("is_active", true)
      .not("published_at", "is", null)
      .limit(5);

    if (error) {
      console.error("News error:", error);
      return NextResponse.json(
        { error: "Failed to fetch news", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: news || [],
      total: news?.length || 0,
    });
  } catch (error) {
    console.error("News Simple API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
