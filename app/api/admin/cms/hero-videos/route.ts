/**
 * CMS Hero Videos API - Hero Video Management
 * Handles CRUD operations for hero videos with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { z } from "zod";

// Disable caching for this API route
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Validation schemas
const CreateHeroVideoSchema = z.object({
  page_id: z.string().uuid(),
  desktop_video_url: z.string().url().optional().or(z.literal("")),
  mobile_video_url: z.string().url().optional().or(z.literal("")),
  fallback_image_url: z.string().url().optional().or(z.literal("")),
  autoplay: z.boolean().default(true),
  muted: z.boolean().default(true),
  loop: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

// const UpdateHeroVideoSchema = CreateHeroVideoSchema.partial().omit({ page_id: true });

/**
 * GET /api/admin/cms/hero-videos
 * Get all hero videos with pagination and filtering
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

    const offset = (page - 1) * limit;

    // Build query with page information
    let query = supabase
      .from("cms_hero_videos")
      .select(
        `
        id,
        page_id,
        desktop_video_url,
        mobile_video_url,
        fallback_image_url,
        autoplay,
        muted,
        loop,
        is_active,
        is_landing_page_active,
        created_at,
        updated_at,
        cms_pages!inner(
          id,
          slug,
          title,
          language
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (page_id) {
      query = query.eq("page_id", page_id);
    }

    const { data: videos, error, count } = await query;

    if (error) {
      console.error("Error fetching hero videos:", error);
      return NextResponse.json(
        { error: "Failed to fetch hero videos" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      videos: videos || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Hero Videos GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/hero-videos
 * Create a new hero video configuration
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

    // Clean up empty strings for optional URL fields
    const cleanedBody = {
      ...body,
      desktop_video_url: body.desktop_video_url || undefined,
      mobile_video_url: body.mobile_video_url || undefined,
      fallback_image_url: body.fallback_image_url || undefined,
    };

    const validatedData = CreateHeroVideoSchema.parse(cleanedBody);

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

    // Check if hero video already exists for this page
    const { data: existingVideo } = await supabase
      .from("cms_hero_videos")
      .select("id")
      .eq("page_id", validatedData.page_id)
      .single();

    if (existingVideo) {
      return NextResponse.json(
        { error: "Hero video already exists for this page" },
        { status: 400 },
      );
    }

    // Validate that at least one video URL is provided
    if (!validatedData.desktop_video_url && !validatedData.mobile_video_url) {
      return NextResponse.json(
        {
          error: "At least one video URL (desktop or mobile) must be provided",
        },
        { status: 400 },
      );
    }

    // Create new hero video
    const { data: newVideo, error } = await supabase
      .from("cms_hero_videos")
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error("Error creating hero video:", error);
      return NextResponse.json(
        { error: "Failed to create hero video" },
        { status: 500 },
      );
    }

    return NextResponse.json(newVideo, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error("Hero Videos POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
