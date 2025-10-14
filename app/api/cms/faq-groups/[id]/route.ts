/**
 * Public FAQ Groups API
 * Provides read-only access to published FAQ groups for frontend display
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";

/**
 * GET /api/cms/faq-groups/[id]
 * Get published FAQ group with all active items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    // Get published FAQ group
    const { data: group, error: groupError } = await supabase
      .from("cms_faq_groups")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .not("published_at", "is", null)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: "FAQ group not found or not published" },
        { status: 404 },
      );
    }

    // Get active FAQ items for this group
    const { data: items, error: itemsError } = await supabase
      .from("cms_faq_items")
      .select("*")
      .eq("group_id", id)
      .eq("is_active", true)
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
    console.error("Public FAQ Group GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
