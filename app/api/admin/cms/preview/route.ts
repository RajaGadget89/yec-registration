/**
 * CMS Preview API - Real-time Content Preview
 * Handles content preview functionality with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { z } from "zod";

// Validation schemas
const PreviewRequestSchema = z.object({
  page_slug: z.string().min(1),
  device_type: z.enum(["desktop", "tablet", "mobile"]).default("desktop"),
  language: z.enum(["th", "en"]).default("th"),
});

/**
 * GET /api/admin/cms/preview
 * Get list of available content for preview
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await maybeServiceClient(request);

    // Initialize content list
    const contentList: any[] = [];

    // Try to get pages (handle case where table might not exist)
    try {
      const { data: pages, error: pagesError } = await supabase
        .from("cms_pages")
        .select(
          `
          id,
          slug,
          title,
          language,
          is_active,
          published_at,
          updated_at
        `,
        )
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (!pagesError && pages) {
        contentList.push(
          ...pages.map((page: any) => ({
            id: page.id,
            type: "page" as const,
            title: page.title,
            content: { slug: page.slug, language: page.language },
            device_type: "desktop" as const,
            is_published: !!page.published_at,
            last_updated: page.updated_at,
          })),
        );
      }
    } catch (error) {
      console.warn("Pages table not accessible:", error);
    }

    // Try to get news (handle case where table might not exist)
    try {
      const { data: news, error: newsError } = await supabase
        .from("cms_news")
        .select(
          `
          id,
          headline,
          language,
          is_active,
          published_at,
          updated_at
        `,
        )
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (!newsError && news) {
        contentList.push(
          ...news.map((article: any) => ({
            id: article.id,
            type: "news" as const,
            title: article.headline,
            content: { language: article.language },
            device_type: "desktop" as const,
            is_published: !!article.published_at,
            last_updated: article.updated_at,
          })),
        );
      }
    } catch (error) {
      console.warn("News table not accessible:", error);
    }

    // Try to get activity cards (handle case where table might not exist)
    try {
      const { data: activityCards, error: cardsError } = await supabase
        .from("cms_activity_cards")
        .select(
          `
          id,
          title,
          language,
          is_active,
          published_at,
          updated_at
        `,
        )
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (!cardsError && activityCards) {
        contentList.push(
          ...activityCards.map((card: any) => ({
            id: card.id,
            type: "activity-card" as const,
            title: card.title,
            content: { language: card.language },
            device_type: "desktop" as const,
            is_published: !!card.published_at,
            last_updated: card.updated_at,
          })),
        );
      }
    } catch (error) {
      console.warn("Activity cards table not accessible:", error);
    }

    // Try to get hero videos (handle case where table might not exist)
    try {
      const { data: heroVideos, error: videosError } = await supabase
        .from("cms_hero_videos")
        .select(
          `
          id,
          title,
          is_active,
          published_at,
          updated_at
        `,
        )
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (!videosError && heroVideos) {
        contentList.push(
          ...heroVideos.map((video: any) => ({
            id: video.id,
            type: "hero-video" as const,
            title: video.title || "Hero Video",
            content: {},
            device_type: "desktop" as const,
            is_published: !!video.published_at,
            last_updated: video.updated_at,
          })),
        );
      }
    } catch (error) {
      console.warn("Hero videos table not accessible:", error);
    }

    return NextResponse.json({
      content: contentList,
      total: contentList.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("CMS Preview list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/preview
 * Generate real-time content preview
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = PreviewRequestSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Get page content
    const { data: page, error: pageError } = await supabase
      .from("cms_pages")
      .select(
        `
        id,
        slug,
        title,
        meta_description,
        language,
        is_active,
        published_at
      `,
      )
      .eq("slug", validatedData.page_slug)
      .eq("language", validatedData.language)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Get page sections
    const { data: sections, error: sectionsError } = await supabase
      .from("cms_page_sections")
      .select(
        `
        id,
        section_type,
        section_order,
        title,
        content,
        is_active
      `,
      )
      .eq("page_id", page.id)
      .eq("is_active", true)
      .order("section_order", { ascending: true });

    if (sectionsError) {
      console.error("Error fetching page sections:", sectionsError);
      return NextResponse.json(
        { error: "Failed to fetch page sections" },
        { status: 500 },
      );
    }

    // Get responsive content for sections
    const sectionIds = sections?.map((s: any) => s.id) || [];
    let responsiveContent = {};

    if (sectionIds.length > 0) {
      const { data: responsiveData } = await supabase
        .from("cms_responsive_content")
        .select("section_id, device_type, content_config")
        .in("section_id", sectionIds)
        .eq("device_type", validatedData.device_type);

      responsiveContent =
        responsiveData?.reduce(
          (acc: any, item: any) => {
            acc[item.section_id] = item.content_config;
            return acc;
          },
          {} as Record<string, any>,
        ) || {};
    }

    // Get activity cards for landing page
    let activityCards: any[] = [];
    if (page.slug === "landing-page") {
      const { data: cards } = await supabase
        .from("cms_activity_cards")
        .select(
          `
          id,
          card_slug,
          title,
          description,
          icon_emoji,
          image_url,
          detail_page_id,
          display_order
        `,
        )
        .eq("page_id", page.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      activityCards = cards || [];
    }

    // Get hero videos for landing page
    let heroVideos = null;
    if (page.slug === "landing-page") {
      const { data: videos } = await supabase
        .from("cms_hero_videos")
        .select(
          `
          id,
          desktop_video_url,
          mobile_video_url,
          fallback_image_url,
          autoplay,
          muted,
          loop
        `,
        )
        .eq("page_id", page.id)
        .single();

      heroVideos = videos;
    }

    // Get branding configuration
    const { data: branding } = await supabase
      .from("cms_branding")
      .select(
        `
        id,
        logo_desktop_url,
        logo_mobile_url,
        logo_favicon_url,
        brand_colors
      `,
      )
      .eq("is_active", true)
      .single();

    // Get recent news for landing page
    let recentNews: any[] = [];
    if (page.slug === "landing-page") {
      const { data: news } = await supabase
        .from("cms_news")
        .select(
          `
          id,
          headline,
          content,
          image_url,
          external_links,
          hashtags,
          published_at
        `,
        )
        .eq("language", validatedData.language)
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(3);

      recentNews = news || [];
    }

    return NextResponse.json({
      page,
      sections: sections || [],
      responsiveContent,
      activityCards,
      heroVideos,
      branding,
      recentNews,
      preview: {
        deviceType: validatedData.device_type,
        language: validatedData.language,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("CMS Preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
