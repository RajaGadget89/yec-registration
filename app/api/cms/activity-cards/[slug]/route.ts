import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient as getSupabase } from "../../../../lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("cms_activity_cards")
      .select(
        "id, card_slug, title, description, content, image_url, icon_emoji, external_links, hashtags, language, published_at, scheduled_at, ends_at",
      )
      .eq("card_slug", slug)
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Map DB description -> API summary
    const activity = data
      ? { ...data, summary: (data as any).description, description: undefined }
      : null;
    return NextResponse.json({ activity });
  } catch (e) {
    console.error("Public activity detail GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 },
    );
  }
}
