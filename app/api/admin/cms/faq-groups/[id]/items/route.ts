/**
 * FAQ Items API - Group Items Management
 * Handles CRUD operations for FAQ items within a group
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../../lib/supabase/server";
import {
  CreateFAQItemSchema,
  ReorderFAQItemsSchema,
} from "../../../../../../lib/validations/faq";
import { z } from "zod";

/**
 * GET /api/admin/cms/faq-groups/[id]/items
 * Get all FAQ items for a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id: groupId } = await params;
    const supabase = await maybeServiceClient(request);

    // Verify group exists
    const { data: group } = await supabase
      .from("cms_faq_groups")
      .select("id")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: "FAQ group not found" },
        { status: 404 },
      );
    }

    // Get FAQ items
    const { data: items, error } = await supabase
      .from("cms_faq_items")
      .select("*")
      .eq("group_id", groupId)
      .order("item_order", { ascending: true });

    if (error) {
      console.error("Error fetching FAQ items:", error);
      return NextResponse.json(
        { error: "Failed to fetch FAQ items" },
        { status: 500 },
      );
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error("FAQ Items GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/faq-groups/[id]/items
 * Create new FAQ item in group
 */
export async function POST(
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

    const { id: groupId } = await params;
    const body = await request.json();
    const validatedData = CreateFAQItemSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Verify group exists
    const { data: group } = await supabase
      .from("cms_faq_groups")
      .select("id")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: "FAQ group not found" },
        { status: 404 },
      );
    }

    // Get next order number
    const { data: lastItem } = await supabase
      .from("cms_faq_items")
      .select("item_order")
      .eq("group_id", groupId)
      .order("item_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastItem?.item_order ?? -1) + 1;

    // Create new item
    const { data: newItem, error } = await supabase
      .from("cms_faq_items")
      .insert({
        ...validatedData,
        group_id: groupId,
        item_order: validatedData.item_order ?? nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating FAQ item:", error);
      return NextResponse.json(
        { error: "Failed to create FAQ item" },
        { status: 500 },
      );
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("FAQ Item POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/cms/faq-groups/[id]/items
 * Bulk reorder FAQ items
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id: groupId } = await params;
    const body = await request.json();
    const validatedData = ReorderFAQItemsSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Verify group exists
    const { data: group } = await supabase
      .from("cms_faq_groups")
      .select("id")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: "FAQ group not found" },
        { status: 404 },
      );
    }

    // Update item orders
    const updates = validatedData.items.map((item) =>
      supabase
        .from("cms_faq_items")
        .update({ item_order: item.item_order })
        .eq("id", item.id)
        .eq("group_id", groupId),
    );

    const results = await Promise.all(updates);
    const errors = results.filter((result) => result.error);

    if (errors.length > 0) {
      console.error("Error reordering FAQ items:", errors);
      return NextResponse.json(
        { error: "Failed to reorder FAQ items" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "FAQ items reordered successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("FAQ Items PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
