import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient as getSupabase } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const language = searchParams.get("language") || "all";
    const sort = searchParams.get("sort") || "newest";

    // Build query
    let query = supabase
      .from("cms_news")
      .select(
        `
        id,
        headline,
        content,
        image_url,
        meta_description,
        language,
        is_active,
        published_at,
        created_at,
        hashtags,
        external_links
      `,
        { count: "exact" },
      )
      .eq("is_active", true);

    // Apply search filter
    if (search) {
      query = query.or(`headline.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply language filter
    if (language !== "all") {
      query = query.eq("language", language);
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        query = query.order("published_at", { ascending: true });
        break;
      case "alphabetical":
        query = query.order("headline", { ascending: true });
        break;
      case "reverse-alphabetical":
        query = query.order("headline", { ascending: false });
        break;
      default: // newest
        query = query.order("published_at", { ascending: false });
    }

    // Apply limit
    query = query.limit(limit);

    const { data: news, error, count } = await query;

    if (error) {
      console.error("Error fetching news:", error);
      return NextResponse.json(
        { error: "Failed to fetch news" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      news: news || [],
      count: count || 0,
    });
  } catch (e) {
    console.error("News API error:", e);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
