import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const include_metadata =
      url.searchParams.get("include_metadata") === "true";
    const include_related = url.searchParams.get("include_related") === "true";

    // Fetch news with basic data
    let newsQuery = supabase
      .from("cms_news")
      .select(
        `
        id,
        headline,
        content,
        language,
        published_at,
        image_url,
        hashtags,
        created_at,
        updated_at,
        is_active
      `,
      )
      .eq("is_active", true)
      .not("published_at", "is", null);

    if (language !== "all") {
      newsQuery = newsQuery.eq("language", language);
    }

    if (search) {
      newsQuery = newsQuery.or(
        `headline.ilike.%${search}%,content.ilike.%${search}%`,
      );
    }

    const { data: news, error } = await newsQuery
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("News error:", error);
      return NextResponse.json(
        { error: "Failed to fetch news", details: error.message },
        { status: 500 },
      );
    }

    // Transform data to comprehensive format
    const comprehensiveNews =
      news?.map((article) => ({
        id: article.id,
        headline: article.headline,
        content: article.content,
        language: article.language,
        published_at: article.published_at,
        image_url: article.image_url,
        hashtags: article.hashtags || [],
        created_at: article.created_at,
        updated_at: article.updated_at,
        is_active: article.is_active,
        // Computed fields
        url: `/news/${article.id}`,
        full_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://yec-registration.com"}/news/${article.id}`,
        is_published: article.is_active && article.published_at,
        has_image: !!article.image_url,
        hashtag_count: (article.hashtags || []).length,
        reading_time_minutes: Math.ceil((article.content || "").length / 200), // Rough estimate
        word_count: (article.content || "").split(" ").length,
        excerpt: (article.content || "").substring(0, 200) + "...",
      })) || [];

    return NextResponse.json({
      success: true,
      data: comprehensiveNews,
      total: comprehensiveNews.length,
      metadata: {
        endpoint: "/api/cms/news",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        content_type: "news",
        comprehensive: true,
        language,
        search,
        include_metadata,
        include_related,
      },
    });
  } catch (error) {
    console.error("CMS News API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
