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

    // Fetch pages with basic data
    let pagesQuery = supabase
      .from("cms_pages")
      .select(
        `
        id,
        title,
        slug,
        meta_description,
        language,
        is_active,
        updated_at
      `,
      )
      .eq("is_active", true);

    if (language !== "all") {
      pagesQuery = pagesQuery.eq("language", language);
    }

    if (search) {
      pagesQuery = pagesQuery.or(
        `title.ilike.%${search}%,meta_description.ilike.%${search}%`,
      );
    }

    const { data: pages, error } = await pagesQuery
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Pages error:", error);
      return NextResponse.json(
        { error: "Failed to fetch pages", details: error.message },
        { status: 500 },
      );
    }

    // Transform data to comprehensive format
    const comprehensivePages =
      pages?.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        meta_description: page.meta_description,
        language: page.language,
        is_active: page.is_active,
        updated_at: page.updated_at,
        // Computed fields
        url: `/pages/${page.slug}`,
        full_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://yec-registration.com"}/pages/${page.slug}`,
        has_description: !!page.meta_description,
        description_length: (page.meta_description || "").length,
      })) || [];

    return NextResponse.json({
      success: true,
      data: comprehensivePages,
      total: comprehensivePages.length,
      metadata: {
        endpoint: "/api/cms/pages",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        content_type: "pages",
        comprehensive: true,
        language,
        search,
        include_metadata,
      },
    });
  } catch (error) {
    console.error("CMS Pages API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
