import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";

// GET /api/cms/event-settings/active
// Returns the currently active event settings used by the landing page banner
export async function GET() {
  try {
    // Use service client here to ensure anonymous/public access is not blocked by RLS
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("cms_event_settings")
      .select(
        "id, event_name, event_slug, section_title, section_description, banner_image_url, banner_images, carousel_enabled, carousel_interval, language, is_active",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(1);

    if (error) throw error;

    const event = data && data.length > 0 ? data[0] : null;
    return NextResponse.json({ event });
  } catch (e) {
    console.error("Public active event GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch active event" },
      { status: 500 },
    );
  }
}
