/**
 * CMS News API - News Articles Management
 * Handles CRUD operations for news articles with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withNewsManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { generateAndStoreEmbeddings } from "../../../../lib/cms-embedding-helper";
import { z } from "zod";

// Validation schemas
const CreateNewsSchema = z.object({
  headline: z.string().min(1).max(200),
  content: z.string().min(1),
  image_url: z.string().url().or(z.literal("")).optional(),
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
  meta_description: z.string().max(500).optional(),
  language: z.enum(["th", "en"]).default("th"),
  is_active: z.boolean().default(true),
});

// const UpdateNewsSchema = CreateNewsSchema.partial();

/**
 * GET /api/admin/cms/news
 * Get all news articles with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withNewsManagementGuard(request);
    if (guardResponse) return guardResponse;

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
      .from("cms_news")
      .select(
        `
        id,
        headline,
        content,
        image_url,
        external_links,
        hashtags,
        meta_description,
        language,
        is_active,
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
      query = query.or(`headline.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: news, error, count } = await query;

    if (error) {
      console.error("Error fetching news:", error);
      return NextResponse.json(
        { error: "Failed to fetch news" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      articles: news || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("News GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/news
 * Create a new news article
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withNewsManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateNewsSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Create new news article
    const isBypass =
      process.env.NODE_ENV === "development" &&
      process.env.DEV_ADMIN_BYPASS === "true";
    const createdBy = isBypass ? null : user.id;

    const { data: newNews, error } = await supabase
      .from("cms_news")
      .insert({
        ...validatedData,
        created_by: createdBy,
        updated_by: createdBy,
        published_at: validatedData.is_active ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating news article:", error);
      return NextResponse.json(
        { error: "Failed to create news article" },
        { status: 500 },
      );
    }

    // Generate embeddings for the new news article
    try {
      await generateAndStoreEmbeddings(
        supabase,
        "news",
        newNews.id,
        {
          headline: newNews.headline,
          content: newNews.content,
        },
        newNews.language,
      );
    } catch (error) {
      console.error("Failed to generate embeddings for news:", error);
      // Don't fail the operation
    }

    return NextResponse.json(newNews, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("News POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
