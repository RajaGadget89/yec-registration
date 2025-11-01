import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient as getSupabase } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "3");
    const page_id = searchParams.get("page_id");
    const slug = searchParams.get("slug");

    let query = supabase
      .from("cms_activity_cards")
      .select(
        "id, card_slug, title, description, content, image_url, icon_emoji, external_links, hashtags, language, published_at, scheduled_at, ends_at",
      )
      .eq("is_active", true)
      .or("published_at.is.null,published_at.lte.now()"); // Only show activities that are published or have no published_at date

    const sort = searchParams.get("sort") || "published_at";

    if (page_id) {
      query = query
        .eq("page_id", page_id)
        .order("display_order", { ascending: true });
    } else {
      // Sort by published_at (newest first) by default, unless sort parameter specifies otherwise
      if (sort === "published_at") {
        query = query.order("published_at", { ascending: false });
      } else if (sort === "display_order") {
        query = query.order("display_order", { ascending: true });
      } else {
        // Default to published_at descending
        query = query.order("published_at", { ascending: false });
      }
    }
    if (slug) query = query.eq("card_slug", slug);

    const { data, error } = await query.limit(limit);
    if (error) {
      console.error("Activity cards API error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
    }
    // Map DB description -> API summary for response consistency
    const activities = (data || []).map((row: any) => ({
      ...row,
      summary: row.description,
      description: undefined,
    }));
    return NextResponse.json({ activities });
  } catch (e) {
    console.error("Public activities GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 },
    );
  }
}
