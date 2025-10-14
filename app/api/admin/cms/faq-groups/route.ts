/**
 * FAQ Groups API - Admin Management
 * Handles CRUD operations for FAQ groups with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { CreateFAQGroupSchema } from "../../../../lib/validations/faq";
import { z } from "zod";

/**
 * GET /api/admin/cms/faq-groups
 * Get all FAQ groups with pagination and filtering
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
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("cms_faq_groups")
      .select(
        `
        id,
        title,
        description,
        language,
        is_active,
        display_config,
        published_at,
        created_at,
        updated_at,
        created_by,
        updated_by
      `,
        { count: "exact" },
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
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: groups, error, count } = await query;

    if (error) {
      console.error("Error fetching FAQ groups:", error);
      return NextResponse.json(
        { error: "Failed to fetch FAQ groups" },
        { status: 500 },
      );
    }

    // Get item counts for each group
    const groupsWithCounts = await Promise.all(
      (groups || []).map(async (group) => {
        const { count: itemCount } = await supabase
          .from("cms_faq_items")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id)
          .eq("is_active", true);

        return {
          ...group,
          item_count: itemCount || 0,
        };
      }),
    );

    return NextResponse.json({
      groups: groupsWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("FAQ Groups GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/faq-groups
 * Create a new FAQ group
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
    const validatedData = CreateFAQGroupSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Create new FAQ group
    const isBypass =
      process.env.NODE_ENV === "development" &&
      process.env.DEV_ADMIN_BYPASS === "true";
    const createdBy = isBypass ? null : user.id;

    const { data: newGroup, error } = await supabase
      .from("cms_faq_groups")
      .insert({
        ...validatedData,
        created_by: createdBy,
        updated_by: createdBy,
        published_at: validatedData.is_active ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating FAQ group:", error);
      return NextResponse.json(
        { error: "Failed to create FAQ group" },
        { status: 500 },
      );
    }

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("FAQ Groups POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
