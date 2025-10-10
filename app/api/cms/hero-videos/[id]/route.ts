import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: video, error } = await supabase
      .from("cms_hero_videos")
      .select(
        `
        id,
        title,
        desktop_video_url,
        mobile_video_url,
        fallback_image_url,
        autoplay,
        muted,
        loop,
        is_active,
        published_at,
        created_at,
        updated_at
      `,
      )
      .eq("id", params.id)
      .single();

    if (error || !video) {
      return NextResponse.json(
        { error: "Hero video not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error("Error fetching hero video:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
