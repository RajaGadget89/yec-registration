import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await maybeServiceClient(request);

    const { data: card, error } = await supabase
      .from("cms_activity_cards")
      .select(
        `
        id,
        card_slug,
        title,
        description,
        content,
        icon_emoji,
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

    if (error || !card) {
      return NextResponse.json(
        { error: "Activity card not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error("Error fetching activity card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Update activity card
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await maybeServiceClient(request);

    // Load existing for validations (page context)
    const { data: existing, error: loadErr } = await supabase
      .from("cms_activity_cards")
      .select("id,page_id")
      .eq("id", params.id)
      .single();
    if (loadErr || !existing) {
      return NextResponse.json(
        { error: "Activity card not found" },
        { status: 404 },
      );
    }

    // Validate payload
    const UpdateSchema = z
      .object({
        card_slug: z.string().min(1).max(100).optional(),
        title: z.string().min(1).max(200).optional(),
        summary: z.string().max(500).optional(),
        content: z.string().optional(),
        image_url: z.string().url().optional(),
        icon_emoji: z.string().max(10).optional(),
        external_links: z
          .array(
            z.object({
              title: z.string().min(1).max(100),
              url: z.string().url(),
              description: z.string().max(200).optional(),
            }),
          )
          .optional(),
        hashtags: z.array(z.string().min(1).max(50)).optional(),
        language: z.enum(["th", "en"]).optional(),
        published_at: z.string().optional(),
        scheduled_at: z.string().optional(),
        ends_at: z.string().optional(),
        detail_page_id: z.string().uuid().optional(),
        display_order: z.number().int().min(0).optional(),
        is_active: z.boolean().optional(),
      })
      .strict();

    const raw = await request.json();
    const cleaned = Object.fromEntries(
      Object.entries(raw).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );
    const validated = UpdateSchema.parse(cleaned);

    // If slug changes, ensure uniqueness within the same page
    if (validated.card_slug) {
      const { data: dup } = await supabase
        .from("cms_activity_cards")
        .select("id")
        .eq("page_id", existing.page_id)
        .eq("card_slug", validated.card_slug)
        .neq("id", params.id)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          {
            error: "Activity card with this slug already exists for this page",
          },
          { status: 400 },
        );
      }
    }

    const toISO = (v: unknown) => {
      if (!v || typeof v !== "string") return undefined;
      const trimmed = v.trim();
      if (!trimmed) return undefined;
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString();
    };

    const { summary, ...rest } = validated as any;
    const updatePayload: Record<string, any> = {
      ...rest,
      ...(summary !== undefined ? { description: summary } : {}),
    };
    if (rest.published_at)
      updatePayload.published_at = toISO(rest.published_at);
    if (rest.scheduled_at)
      updatePayload.scheduled_at = toISO(rest.scheduled_at);
    if (rest.ends_at) updatePayload.ends_at = toISO(rest.ends_at);

    const { data: updated, error } = await supabase
      .from("cms_activity_cards")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating activity card:", error);
      return NextResponse.json(
        { error: "Failed to update activity card" },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.errors },
        { status: 400 },
      );
    }
    console.error("Error in Activity Card PUT:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
