import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: news, error } = await supabase
      .from("cms_news")
      .select(
        `
        id,
        headline,
        content,
        image_url,
        external_links,
        hashtags,
        language,
        is_active,
        published_at,
        created_at,
        updated_at
      `,
      )
      .eq("id", params.id)
      .single();

    if (error || !news) {
      return NextResponse.json(
        { error: "News article not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
