import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase/server";
import { z } from "zod";

const UpdateEventSchema = z.object({
  event_name: z.string().min(1).max(200).optional(),
  event_slug: z.string().min(1).max(100).optional(),
  section_title: z.string().min(1).max(200).optional(),
  section_description: z.string().max(2000).optional(),
  banner_image_url: z.string().url().optional().or(z.literal("")),
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
  language: z.enum(["th", "en"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("cms_event_settings")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    console.error("Admin events [id] GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch event setting" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();
    const updatePayload: any = { ...parsed.data };
    if (updatePayload.banner_image_url === "")
      updatePayload.banner_image_url = null;

    // If setting active, deactivate others first
    if (updatePayload.is_active === true) {
      await supabase
        .from("cms_event_settings")
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("cms_event_settings")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    console.error("Admin events [id] PUT error:", e);
    return NextResponse.json(
      { error: "Failed to update event setting" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("cms_event_settings")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin events [id] DELETE error:", e);
    return NextResponse.json(
      { error: "Failed to delete event setting" },
      { status: 500 },
    );
  }
}
