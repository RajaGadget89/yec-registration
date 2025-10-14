import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase/server";

/**
 * GET /api/cms/hero-videos/landing-page/active
 * Returns the currently active landing page hero video
 */
export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();

    // Get the active landing page hero video directly
    const { data: videos, error } = await supabase
      .from("cms_hero_videos")
      .select(
        `
        id,
        desktop_video_url,
        mobile_video_url,
        fallback_image_url,
        autoplay,
        muted,
        loop,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq("is_landing_page_active", true)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching landing page hero video:", error);
      return NextResponse.json(
        { error: "Failed to fetch landing page hero video" },
        { status: 500 },
      );
    }

    // If no video is found, return null (landing page will use fallback)
    if (!videos || videos.length === 0) {
      return NextResponse.json({ video: null });
    }

    const video = videos[0];

    return NextResponse.json({ video });
  } catch (error) {
    console.error("Landing page hero video GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
