import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseServiceClient();

    const { data: page, error: pageError } = await supabase
      .from("cms_pages")
      .select(
        "id, slug, title, meta_description, language, is_active, updated_at",
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (pageError) {
      return NextResponse.json({ error: pageError.message }, { status: 500 });
    }
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const { data: sections } = await supabase
      .from("cms_page_sections")
      .select("id, section_type, section_order, title, content, is_active")
      .eq("page_id", page.id)
      .eq("is_active", true)
      .order("section_order", { ascending: true });

    return NextResponse.json({ page, sections: sections || [] });
  } catch (_e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
