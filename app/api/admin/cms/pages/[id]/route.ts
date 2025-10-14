import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import { z } from "zod";

// Validation schema for page updates
const UpdatePageSchema = z.object({
  slug: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  meta_description: z.string().max(500).optional(),
  language: z.enum(["th", "en"]).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await maybeServiceClient(request);

    const { data: page, error } = await supabase
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
        updated_at
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error fetching page:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 },
      );
    }

    if (!page) {
      console.error("Page not found for ID:", id);
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    console.log("Found page:", page);
    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const input = UpdatePageSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    const { data: page, error } = await supabase
      .from("cms_pages")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating page:", error);
      return NextResponse.json(
        { error: "Failed to update page" },
        { status: 500 },
      );
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error updating page:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/cms/pages/[id]
 * Permanently delete a CMS page and its sections
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await maybeServiceClient(request);

    // First, delete associated sections (if any)
    const { error: sectionsError } = await supabase
      .from("cms_page_sections")
      .delete()
      .eq("page_id", id);

    if (sectionsError) {
      console.error("Error deleting page sections:", sectionsError);
      return NextResponse.json(
        { error: "Failed to delete page sections" },
        { status: 500 },
      );
    }

    // Then, delete the page
    const { error: pageError } = await supabase
      .from("cms_pages")
      .delete()
      .eq("id", id);

    if (pageError) {
      console.error("Error deleting page:", pageError);
      return NextResponse.json(
        { error: "Failed to delete page" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
