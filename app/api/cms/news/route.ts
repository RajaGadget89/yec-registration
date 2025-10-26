import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

// Simplified, production-safe News endpoint (only existing columns)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const include_metadata =
      url.searchParams.get("include_metadata") === "true";
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

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) query = query.in("id", ids);
    }
    if (language !== "all") query = query.eq("language", language);
    if (search)
      query = query.or(`headline.ilike.%${search}%,content.ilike.%${search}%`);

    const { data, error } = await query
      .order("published_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error)
      return NextResponse.json(
        { error: "Failed to fetch news" },
        { status: 500 },
      );

    const baseItem = (row: any) => ({
      id: row.id,
      headline: row.headline,
      content: row.content,
      language: row.language,
      published_at: row.published_at,
      image_url: row.image_url,
      hashtags: row.hashtags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active,
      url: `/news/${row.id}`,
      full_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://yec-registration.com"}/news/${row.id}`,
    });

    const allowlist = new Set([
      "id",
      "headline",
      "content",
      "language",
      "published_at",
      "image_url",
      "hashtags",
      "created_at",
      "updated_at",
      "is_active",
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
      meta: {
        total: items.length,
        language,
        search,
        include_metadata,
        page,
        limit,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
    });
  } catch (e) {
    console.error("CMS News API Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
