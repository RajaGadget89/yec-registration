/**
 * Public FAQ Groups API
 * Provides read-only access to published FAQ groups for frontend display
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase/server";
import { z } from "zod";

const QuerySchema = z.object({
  page: z.string().default("1"),
  limit: z.string().default("20"),
  language: z.string().optional(),
  is_active: z.string().optional(),
  published: z.string().optional(),
  search: z.string().optional(),
});

/**
 * GET /api/cms/faq-groups
 * Get published FAQ groups with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      language: searchParams.get("language") || undefined,
      is_active: searchParams.get("is_active") || undefined,
      published: searchParams.get("published") || undefined,
      search: searchParams.get("search") || undefined,
    });

    const supabase = getSupabaseServiceClient();
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = supabase
      .from("cms_faq_groups")
      .select(
        "id, title, description, language, is_active, published_at, created_at",
        { count: "exact" },
      )
      .eq("is_active", true);

    // Apply filters
    if (query.language && query.language !== "all") {
      queryBuilder = queryBuilder.eq("language", query.language);
    }

    if (query.published === "true") {
      queryBuilder = queryBuilder.not("published_at", "is", null);
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query.search}%,description.ilike.%${query.search}%`,
      );
    }

    // Apply pagination (place NULLs last by setting nullsFirst to false)
    queryBuilder = queryBuilder
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: groups, error, count } = await queryBuilder;

    if (error) {
      console.error("FAQ Groups GET error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      groups: groups || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("FAQ Groups API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
