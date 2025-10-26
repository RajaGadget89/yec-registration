/**
 * CMS News API - Individual News Article Management
 * Handles GET, PUT, DELETE operations for specific news articles
 */

import { NextRequest, NextResponse } from "next/server";
import { withNewsManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import {
  generateAndStoreEmbeddings,
  removeEmbeddings,
} from "../../../../../lib/cms-embedding-helper";
import { z } from "zod";

function isUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // Simple UUID v4 pattern; good enough to guard DB writes in dev/bypass modes
  return /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/.test(
    value,
  );
}

const UpdateNewsSchema = z.object({
  headline: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
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
  language: z.enum(["th", "en"]).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/cms/news/[id]
 * Get a specific news article by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withNewsManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = await params;
    const supabase = await maybeServiceClient(request);

    const { data: news, error } = await supabase
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
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "News article not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching news article:", error);
      return NextResponse.json(
        { error: "Failed to fetch news article" },
        { status: 500 },
      );
    }

    if (!news) {
      return NextResponse.json(
        { error: "News article not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error("News Article GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/news/[id]
 * Update a specific news article
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withNewsManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateNewsSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if news article exists
    const { data: existingNews } = await supabase
      .from("cms_news")
      .select("id, published_at")
      .eq("id", id)
      .single();

    if (!existingNews) {
      return NextResponse.json(
        { error: "News article not found" },
        { status: 404 },
      );
    }

    // Update news article
    const updateData: Record<string, unknown> = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };
    if (isUuid(user.id)) {
      updateData.updated_by = user.id;
    }

    // Set published_at if article is being activated
    if (validatedData.is_active === true && !existingNews.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: updatedNews, error } = await supabase
      .from("cms_news")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating news article:", error);
      return NextResponse.json(
        { error: "Failed to update news article" },
        { status: 500 },
      );
    }

    // Generate embeddings for the updated news article
    try {
      await generateAndStoreEmbeddings(
        supabase,
        "news",
        id,
        {
          headline: updatedNews.headline,
          content: updatedNews.content,
        },
        updatedNews.language,
      );
    } catch (error) {
      console.error("Failed to update embeddings for news:", error);
      // Don't fail the operation
    }

    return NextResponse.json(updatedNews);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("News Article PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/cms/news/[id]
 * Delete a specific news article
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withNewsManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = await params;
    const supabase = await maybeServiceClient(request);

    // Check if news article exists
    const { data: existingNews } = await supabase
      .from("cms_news")
      .select("id, headline")
      .eq("id", id)
      .single();

    if (!existingNews) {
      return NextResponse.json(
        { error: "News article not found" },
        { status: 404 },
      );
    }

    // Remove embeddings before deleting the news article
    try {
      await removeEmbeddings(supabase, id);
    } catch (error) {
      console.error("Failed to remove embeddings for news:", error);
      // Don't fail the operation
    }

    // Delete news article
    const { error } = await supabase.from("cms_news").delete().eq("id", id);

    if (error) {
      console.error("Error deleting news article:", error);
      return NextResponse.json(
        { error: "Failed to delete news article" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "News article deleted successfully" });
  } catch (error) {
    console.error("News Article DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
