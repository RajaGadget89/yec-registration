/**
 * CMS Activity Cards API - Activity Cards Management
 * Handles CRUD operations for activity cards with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { generateAndStoreEmbeddings } from "../../../../lib/cms-embedding-helper";
import { z } from "zod";

// Validation schemas (extended to mirror News feature set)
const ExternalLinkSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().max(200).optional(),
});

const CreateActivityCardSchema = z.object({
  page_id: z.string().uuid(),
  card_slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  content: z.string().optional(),
  image_url: z.string().url().optional(),
  icon_emoji: z.string().max(10).optional(),
  external_links: z.array(ExternalLinkSchema).optional(),
  hashtags: z.array(z.string().min(1).max(50)).optional(),
  language: z.enum(["th", "en"]).optional(),
  published_at: z.string().optional(),
  scheduled_at: z.string().optional(),
  ends_at: z.string().optional(),
  detail_page_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0),
  is_active: z.boolean().default(true),
});

// const UpdateActivityCardSchema = CreateActivityCardSchema.partial().omit({ page_id: true });

/**
 * GET /api/admin/cms/activity-cards
 * Get all activity cards with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const supabase = await maybeServiceClient(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const page_id = searchParams.get("page_id");
    const is_active = searchParams.get("is_active");
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("cms_activity_cards")
      .select(
        `
        id,
        page_id,
        card_slug,
        title,
        description,
        content,
        icon_emoji,
        image_url,
        detail_page_id,
        display_order,
        is_active,
        external_links,
        hashtags,
        language,
        published_at,
        scheduled_at,
        ends_at,
        created_at,
        updated_at
      `,
        { count: "exact" },
      )
      .order("display_order", { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (page_id) {
      query = query.eq("page_id", page_id);
    }
    if (is_active !== null) {
      query = query.eq("is_active", is_active === "true");
    }
    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,content.ilike.%${term}%`,
      );
    }

    const { data: cards, error, count } = await query;

    if (error) {
      console.error("Error fetching activity cards:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity cards" },
        { status: 500 },
      );
    }

    // Map description -> summary for admin UI compatibility
    const mapped = (cards || []).map((c: any) => ({
      ...c,
      summary: c.description,
    }));

    return NextResponse.json({
      cards: mapped,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Activity Cards GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/activity-cards
 * Create a new activity card
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const cleaned = Object.fromEntries(
      Object.entries(body).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );
    const validatedData = CreateActivityCardSchema.parse(cleaned);

    // Normalize date strings from <input type="datetime-local"> to ISO
    const toISO = (v: unknown) => {
      if (!v || typeof v !== "string") return undefined;
      const trimmed = v.trim();
      if (!trimmed) return undefined;
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString();
    };

    // Map API field `summary` -> DB column `description` and ensure icon_emoji is properly handled
    const { summary, ...restValidated } = validatedData as any;
    const insertPayload: Record<string, any> = {
      ...restValidated,
      ...(summary !== undefined ? { description: summary } : {}),
      ...(restValidated.icon_emoji !== undefined
        ? { icon_emoji: restValidated.icon_emoji?.trim() || null }
        : {}),
      ...(restValidated.published_at
        ? { published_at: toISO(restValidated.published_at) }
        : {}),
      ...(restValidated.scheduled_at
        ? { scheduled_at: toISO(restValidated.scheduled_at) }
        : {}),
      ...(restValidated.ends_at
        ? { ends_at: toISO(restValidated.ends_at) }
        : {}),
    };

    const supabase = await maybeServiceClient(request);

    // Check if page exists
    const { data: pageExists } = await supabase
      .from("cms_pages")
      .select("id")
      .eq("id", validatedData.page_id)
      .single();

    if (!pageExists) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check if card_slug already exists for this page
    const { data: existingCard } = await supabase
      .from("cms_activity_cards")
      .select("id")
      .eq("page_id", validatedData.page_id)
      .eq("card_slug", validatedData.card_slug)
      .single();

    if (existingCard) {
      return NextResponse.json(
        { error: "Activity card with this slug already exists for this page" },
        { status: 400 },
      );
    }

    // Check if display_order already exists for this page and auto-increment if needed
    const { data: existingOrder } = await supabase
      .from("cms_activity_cards")
      .select("display_order")
      .eq("page_id", validatedData.page_id)
      .eq("display_order", validatedData.display_order)
      .single();

    if (existingOrder) {
      // Auto-increment display_order to next available number
      const { data: maxOrder } = await supabase
        .from("cms_activity_cards")
        .select("display_order")
        .eq("page_id", validatedData.page_id)
        .order("display_order", { ascending: false })
        .limit(1)
        .single();

      insertPayload.display_order = (maxOrder?.display_order || 0) + 1;
    }

    // Check if detail_page_id exists (if provided)
    if (validatedData.detail_page_id) {
      const { data: detailPageExists } = await supabase
        .from("cms_pages")
        .select("id")
        .eq("id", validatedData.detail_page_id)
        .single();

      if (!detailPageExists) {
        return NextResponse.json(
          { error: "Detail page not found" },
          { status: 404 },
        );
      }
    }

    // Create new activity card
    const { data: newCard, error } = await supabase
      .from("cms_activity_cards")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating activity card:", error);
      return NextResponse.json(
        { error: "Failed to create activity card" },
        { status: 500 },
      );
    }

    // Generate embeddings for the new activity
    try {
      await generateAndStoreEmbeddings(
        supabase,
        "activities",
        newCard.id,
        {
          title: newCard.title,
          summary: newCard.description, // Note: DB uses 'description'
          content: newCard.content,
        },
        newCard.language,
      );
    } catch (error) {
      console.error("Failed to generate embeddings for activity:", error);
      // Don't fail the operation
    }

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Activity Cards POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
