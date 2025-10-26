/**
 * FAQ Item API - Individual Item Management
 * Handles single FAQ item operations
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../../../lib/supabase/server";
import { UpdateFAQItemSchema } from "../../../../../../../lib/validations/faq";
import {
  generateAndStoreFAQEmbeddings,
  removeEmbeddings,
} from "../../../../../../../lib/cms-embedding-helper";
import { z } from "zod";

/**
 * GET /api/admin/cms/faq-groups/[id]/items/[itemId]
 * Get single FAQ item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id: groupId, itemId } = await params;
    const supabase = await maybeServiceClient(request);

    // Get FAQ item
    const { data: item, error } = await supabase
      .from("cms_faq_items")
      .select("*")
      .eq("id", itemId)
      .eq("group_id", groupId)
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("FAQ Item GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/cms/faq-groups/[id]/items/[itemId]
 * Update FAQ item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, itemId } = await params;
    const body = await request.json();
    const validatedData = UpdateFAQItemSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if item exists
    const { data: existingItem } = await supabase
      .from("cms_faq_items")
      .select("id")
      .eq("id", itemId)
      .eq("group_id", groupId)
      .single();

    if (!existingItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 },
      );
    }

    // Update item
    const { data: updatedItem, error } = await supabase
      .from("cms_faq_items")
      .update(validatedData)
      .eq("id", itemId)
      .eq("group_id", groupId)
      .select()
      .single();

    if (error) {
      console.error("Error updating FAQ item:", error);
      return NextResponse.json(
        { error: "Failed to update FAQ item" },
        { status: 500 },
      );
    }

    // Generate embeddings for the updated FAQ item
    try {
      await generateAndStoreFAQEmbeddings(supabase, itemId, {
        question: updatedItem.question,
        answer: updatedItem.answer,
      });
    } catch (error) {
      console.error("Failed to update embeddings for FAQ item:", error);
      // Don't fail the operation
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("FAQ Item PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/cms/faq-groups/[id]/items/[itemId]
 * Delete FAQ item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id: groupId, itemId } = await params;
    const supabase = await maybeServiceClient(request);

    // Check if item exists
    const { data: existingItem } = await supabase
      .from("cms_faq_items")
      .select("id")
      .eq("id", itemId)
      .eq("group_id", groupId)
      .single();

    if (!existingItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 },
      );
    }

    // Remove embeddings before deleting the FAQ item
    try {
      await removeEmbeddings(supabase, itemId);
    } catch (error) {
      console.error("Failed to remove embeddings for FAQ item:", error);
      // Don't fail the operation
    }

    // Delete item
    const { error } = await supabase
      .from("cms_faq_items")
      .delete()
      .eq("id", itemId)
      .eq("group_id", groupId);

    if (error) {
      console.error("Error deleting FAQ item:", error);
      return NextResponse.json(
        { error: "Failed to delete FAQ item" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "FAQ item deleted successfully" });
  } catch (error) {
    console.error("FAQ Item DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
