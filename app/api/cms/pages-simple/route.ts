import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Simple query to test
    const { data: pages, error } = await supabase
      .from("cms_pages")
      .select(
        "id, title, slug, meta_description, language, is_active, updated_at",
      )
      .eq("is_active", true)
      .limit(5);

    if (error) {
      console.error("Pages error:", error);
      return NextResponse.json(
        { error: "Failed to fetch pages", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: pages || [],
      total: pages?.length || 0,
    });
  } catch (error) {
    console.error("Pages Simple API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
