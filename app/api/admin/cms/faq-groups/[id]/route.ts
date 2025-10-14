/**
 * FAQ Group API - Individual Group Management
 * Handles single FAQ group operations
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import { UpdateFAQGroupSchema } from "../../../../../lib/validations/faq";
import { z } from "zod";

/**
 * GET /api/admin/cms/faq-groups/[id]
 * Get single FAQ group with all items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = await params;
    const supabase = await maybeServiceClient(request);

    // Get FAQ group
    const { data: group, error: groupError } = await supabase
      .from("cms_faq_groups")
      .select("*")
      .eq("id", id)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: "FAQ group not found" },
        { status: 404 },
      );
    }

    // Get FAQ items for this group
    const { data: items, error: itemsError } = await supabase
      .from("cms_faq_items")
      .select("*")
      .eq("group_id", id)
      .order("item_order", { ascending: true });

    if (itemsError) {
      console.error("Error fetching FAQ items:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch FAQ items" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...group,
      items: items || [],
    });
  } catch (error) {
    console.error("FAQ Group GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/cms/faq-groups/[id]
 * Update FAQ group
 */
export async function PATCH(
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

    // Debug: Log the received data
    console.log("FAQ Group PATCH - Received body:", body);
    console.log("FAQ Group PATCH - Display config:", body.display_config);

    const validatedData = UpdateFAQGroupSchema.parse(body);

    // Debug: Log the validated data
    console.log("FAQ Group PATCH - Validated data:", validatedData);
    console.log(
      "FAQ Group PATCH - Validated display_config:",
      validatedData.display_config,
    );

    const supabase = await maybeServiceClient(request);

    // Check if group exists
    const { data: existingGroup } = await supabase
      .from("cms_faq_groups")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingGroup) {
      return NextResponse.json(
        { error: "FAQ group not found" },
        { status: 404 },
      );
    }

    // Update group
    const isBypass =
      process.env.NODE_ENV === "development" &&
      process.env.DEV_ADMIN_BYPASS === "true";
    const updatedBy = isBypass ? null : user.id;

    const updateData: any = {
      ...validatedData,
      updated_by: updatedBy,
    };

    // Handle published_at based on is_active
    if (validatedData.is_active !== undefined) {
      if (validatedData.is_active) {
        updateData.published_at = new Date().toISOString();
      } else {
        updateData.published_at = null;
      }
    }

    const { data: updatedGroup, error } = await supabase
      .from("cms_faq_groups")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating FAQ group:", error);
      return NextResponse.json(
        { error: "Failed to update FAQ group" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("FAQ Group PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/cms/faq-groups/[id]
 * Delete FAQ group (cascade to items)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = await params;
    const supabase = await maybeServiceClient(request);

    // Check if group exists
    const { data: existingGroup } = await supabase
      .from("cms_faq_groups")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingGroup) {
      return NextResponse.json(
        { error: "FAQ group not found" },
        { status: 404 },
      );
    }

    // Delete group (items will be cascade deleted)
    const { error } = await supabase
      .from("cms_faq_groups")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting FAQ group:", error);
      return NextResponse.json(
        { error: "Failed to delete FAQ group" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "FAQ group deleted successfully" });
  } catch (error) {
    console.error("FAQ Group DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
