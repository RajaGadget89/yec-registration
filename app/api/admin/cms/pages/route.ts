/**
 * CMS Pages API - Content Management for Pages
 * Handles CRUD operations for CMS pages with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { z } from "zod";

// Validation schemas
const CreatePageSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  meta_description: z.string().max(500).optional(),
  language: z.enum(["th", "en"]).default("th"),
  is_active: z.boolean().default(true),
});

// const UpdatePageSchema = CreatePageSchema.partial();

/**
 * GET /api/admin/cms/pages
 * Get all CMS pages with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await maybeServiceClient(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const language = searchParams.get("language");
    const is_active = searchParams.get("is_active");

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("cms_pages")
      .select(
        `
        id,
        slug,
        title,
        meta_description,
        language,
        is_active,
        published_at,
        created_at,
        updated_at,
        created_by,
        updated_by
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (language) {
      query = query.eq("language", language);
    }
    if (is_active !== null) {
      query = query.eq("is_active", is_active === "true");
    }

    const { data: pages, error, count } = await query;

    if (error) {
      console.error("Error fetching CMS pages:", error);
      return NextResponse.json(
        { error: "Failed to fetch pages" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      pages: pages || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("CMS Pages GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/pages
 * Create a new CMS page
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
    const validatedData = CreatePageSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if slug already exists
    const { data: existingPage } = await supabase
      .from("cms_pages")
      .select("id")
      .eq("slug", validatedData.slug)
      .single();

    if (existingPage) {
      return NextResponse.json(
        { error: "Page with this slug already exists" },
        { status: 400 },
      );
    }

    // Create new page
    // In DEV_ADMIN_BYPASS mode, avoid FK to auth.users by writing NULL for created_by/updated_by
    const isBypass =
      process.env.NODE_ENV === "development" &&
      process.env.DEV_ADMIN_BYPASS === "true";

    const createdBy = isBypass ? null : user.id;

    const { data: newPage, error } = await supabase
      .from("cms_pages")
      .insert({
        ...validatedData,
        created_by: createdBy,
        updated_by: createdBy,
        published_at: validatedData.is_active ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating CMS page:", error);
      return NextResponse.json(
        { error: "Failed to create page" },
        { status: 500 },
      );
    }

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("CMS Pages POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
