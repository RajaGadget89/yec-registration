import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

// Simplified, production-safe Pages endpoint (only existing columns)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const idsParam = url.searchParams.get("ids");
    const fieldsParam = url.searchParams.get("fields");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10) || 50,
      100,
    );
    const page = Math.max(
      parseInt(url.searchParams.get("page") || "1", 10) || 1,
      1,
    );

    let query = supabase
      .from("cms_pages")
      .select(
        "id, title, slug, meta_description, language, is_active, updated_at",
      )
      .eq("is_active", true);

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) query = query.in("id", ids);
    }
    if (language !== "all") query = query.eq("language", language);
    if (search)
      query = query.or(
        `title.ilike.%${search}%,meta_description.ilike.%${search}%`,
      );

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error)
      return NextResponse.json(
        { error: "Failed to fetch pages" },
        { status: 500 },
      );

    const baseItem = (row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      meta_description: row.meta_description,
      language: row.language,
      is_active: row.is_active,
      updated_at: row.updated_at,
      url: `/pages/${row.slug}`,
      full_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://yec-registration.com"}/pages/${row.slug}`,
    });

    const allowlist = new Set([
      "id",
      "title",
      "slug",
      "meta_description",
      "language",
      "is_active",
      "updated_at",
      "url",
      "full_url",
    ]);
    const requested = fieldsParam
      ? fieldsParam
          .split(",")
          .map((s) => s.trim())
          .filter((f) => allowlist.has(f))
      : undefined;
    const pick = (obj: any) => {
      if (!requested || requested.length === 0) return obj;
      const out: any = {};
      for (const k of requested) out[k] = (obj as any)[k];
      return out;
    };

    const items = (data || []).map((row) => pick(baseItem(row)));

    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
      page,
      limit,
    });
  } catch (e) {
    console.error("CMS Pages API Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
