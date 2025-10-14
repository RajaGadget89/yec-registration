import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "10");
    const language = searchParams.get("language") || "all";
    const sort = searchParams.get("sort") || "newest";

    let query = supabase
      .from("cms_news")
      .select(
        `
        id,
        headline,
        content,
        image_url,
        external_links,
        hashtags,
        meta_description,
        language,
        published_at,
        created_at
      `,
      )
      .eq("is_active", true);

    // Apply language filter only if not "all"
    if (language !== "all") {
      query = query.eq("language", language);
    }

    // Apply sorting
    if (sort === "newest") {
      query = query.order("published_at", { ascending: false });
    } else if (sort === "oldest") {
      query = query.order("published_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: news, error } = await query.limit(limit);

    if (error) {
      console.error("Error fetching news:", error);
      return NextResponse.json(
        { error: "Failed to fetch news" },
        { status: 500 },
      );
    }

    return NextResponse.json({ news: news || [] });
  } catch (error) {
    console.error("News GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
