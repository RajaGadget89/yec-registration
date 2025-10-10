import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";
import { z } from "zod";

const CreateEventSchema = z.object({
  event_name: z.string().min(1).max(200),
  event_slug: z.string().min(1).max(100),
  section_title: z.string().min(1).max(200).optional(),
  section_description: z.string().max(2000).optional(),
  banner_image_url: z.string().url().optional(),
  banner_images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().max(200),
        order: z.number().int().min(0),
      }),
    )
    .optional(),
  carousel_enabled: z.boolean().optional(),
  carousel_interval: z.number().int().min(2).max(30).optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  language: z.enum(["th", "en"]).default("th"),
});

// const UpdateEventSchema = CreateEventSchema.partial();

// GET /api/admin/cms/event-settings
export async function GET(request: NextRequest) {
  try {
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use service client to avoid complex RLS recursion seen in admin paths
    const supabase = getSupabaseServiceClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const language = searchParams.get("language");
    const is_active = searchParams.get("is_active");

    const offset = (page - 1) * limit;

    let query = supabase
      .from("cms_event_settings")
      .select(
        "id, event_name, event_slug, section_title, section_description, banner_image_url, is_active, display_order, language, created_at, updated_at",
        { count: "exact" },
      )
      .order("display_order", { ascending: true })
      .range(offset, offset + limit - 1);

    if (language) query = query.eq("language", language);
    if (is_active !== null) {
      if (is_active === "true" || is_active === "false")
        query = query.eq("is_active", is_active === "true");
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({
      events: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    console.error("Admin events GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch event settings" },
      { status: 500 },
    );
  }
}

// POST /api/admin/cms/event-settings
export async function POST(request: NextRequest) {
  try {
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const supabase = getSupabaseServiceClient();

    // If setting active, deactivate others first (idempotent)
    if (payload.is_active === true) {
      await supabase
        .from("cms_event_settings")
        .update({ is_active: false })
        .eq("is_active", true);
    }

    const { data, error } = await supabase
      .from("cms_event_settings")
      .insert({
        event_name: payload.event_name,
        event_slug: payload.event_slug,
        section_title: payload.section_title,
        section_description: payload.section_description,
        banner_image_url: payload.banner_image_url,
        banner_images: payload.banner_images || [],
        carousel_enabled: payload.carousel_enabled ?? false,
        carousel_interval: payload.carousel_interval ?? 5,
        is_active: payload.is_active ?? false,
        display_order: payload.display_order ?? 0,
        language: payload.language,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    console.error("Admin events POST error:", e);
    return NextResponse.json(
      { error: "Failed to create event setting" },
      { status: 500 },
    );
  }
}
