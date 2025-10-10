/**
 * CMS Responsive Content API - Device-Specific Content Management
 * Handles CRUD operations for responsive content with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { z } from "zod";

// Validation schemas
const CreateResponsiveContentSchema = z.object({
  section_id: z.string().uuid(),
  device_type: z.enum(["desktop", "tablet", "mobile"]),
  content_config: z.object({
    layout: z.enum(["grid", "stack", "carousel"]).optional(),
    columns: z.number().int().min(1).max(6).optional(),
    spacing: z.enum(["tight", "normal", "loose"]).optional(),
    typography: z
      .object({
        heading: z.enum(["large", "medium", "small"]).optional(),
        body: z.enum(["large", "medium", "small"]).optional(),
      })
      .optional(),
    media: z
      .object({
        imageSize: z.enum(["large", "medium", "small"]).optional(),
        videoAspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
      })
      .optional(),
  }),
});

// const UpdateResponsiveContentSchema = CreateResponsiveContentSchema.partial().omit({ section_id: true });

/**
 * GET /api/admin/cms/responsive-content
 * Get responsive content configurations with filtering
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
    const section_id = searchParams.get("section_id");
    const device_type = searchParams.get("device_type");

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("cms_responsive_content")
      .select(
        `
        id,
        section_id,
        device_type,
        content_config,
        created_at
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (section_id) {
      query = query.eq("section_id", section_id);
    }
    if (device_type) {
      query = query.eq("device_type", device_type);
    }

    const { data: responsiveContent, error, count } = await query;

    if (error) {
      console.error("Error fetching responsive content:", error);
      return NextResponse.json(
        { error: "Failed to fetch responsive content" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      responsiveContent: responsiveContent || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Responsive Content GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/responsive-content
 * Create new responsive content configuration
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
    const validatedData = CreateResponsiveContentSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if section exists
    const { data: sectionExists } = await supabase
      .from("cms_page_sections")
      .select("id")
      .eq("id", validatedData.section_id)
      .single();

    if (!sectionExists) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check if responsive content already exists for this section and device type
    const { data: existingContent } = await supabase
      .from("cms_responsive_content")
      .select("id")
      .eq("section_id", validatedData.section_id)
      .eq("device_type", validatedData.device_type)
      .single();

    if (existingContent) {
      return NextResponse.json(
        {
          error:
            "Responsive content already exists for this section and device type",
        },
        { status: 400 },
      );
    }

    // Create new responsive content
    const { data: newResponsiveContent, error } = await supabase
      .from("cms_responsive_content")
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error("Error creating responsive content:", error);
      return NextResponse.json(
        { error: "Failed to create responsive content" },
        { status: 500 },
      );
    }

    return NextResponse.json(newResponsiveContent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Responsive Content POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
