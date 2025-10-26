import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * CMS FAQ API Endpoint - COMPLETE DATA VERSION
 * Provides comprehensive FAQ data for MCP consumption
 * Returns complete, rich data for each FAQ item
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const include_metadata =
      url.searchParams.get("include_metadata") === "true";
    const idsParam = url.searchParams.get("ids");
    const fieldsParam = url.searchParams.get("fields");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10) || 50,
      100,
    );
    const page = Math.max(
      parseInt(url.searchParams.get("page") || "1", 10) || 1,
      1,
    );

    // Fetch FAQ groups with COMPLETE data
    let groupQuery = supabase
      .from("cms_faq_groups")
      .select(
        `
        id, 
        title, 
        description, 
        language, 
        display_config,
        published_at,
        created_at,
        updated_at,
        is_active
      `,
      )
      .eq("is_active", true)
      .not("published_at", "is", null);

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) groupQuery = groupQuery.in("id", ids);
    }
    if (language !== "all") {
      groupQuery = groupQuery.eq("language", language);
    }

    if (search) {
      groupQuery = groupQuery.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data: groups, error: groupsError } = await groupQuery
      .order("published_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (groupsError) {
      return NextResponse.json(
        { error: "Failed to fetch FAQ groups" },
        { status: 500 },
      );
    }

    // Fetch COMPLETE FAQ items for each group
    const faqData = [];
    for (const group of groups || []) {
      const { data: items, error: itemsError } = await supabase
        .from("cms_faq_items")
        .select(
          `
          id, 
          question, 
          answer, 
          language, 
          item_order,
          created_at,
          updated_at,
          is_active,
          view_count,
          helpful_count,
          not_helpful_count,
          last_accessed_at,
          tags,
          category,
          priority,
          author_id,
          meta_title,
          meta_description,
          slug,
          featured_image_url,
          attachments,
          related_items,
          difficulty_level,
          estimated_read_time
        `,
        )
        .eq("group_id", group.id)
        .eq("is_active", true)
        .order("item_order", { ascending: true });

      if (itemsError) {
        console.error("FAQ items error for group", group.id, ":", itemsError);
        faqData.push({
          ...group,
          items: [],
        });
      } else {
        // Enhance each item with additional metadata if requested
        const baseItem = (item: any) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          language: item.language,
          item_order: item.item_order,
          created_at: item.created_at,
          updated_at: item.updated_at,
          is_active: item.is_active,
          view_count: item.view_count,
          helpful_count: item.helpful_count,
          not_helpful_count: item.not_helpful_count,
          last_accessed_at: item.last_accessed_at,
          tags: item.tags,
          category: item.category,
          priority: item.priority,
          author_id: item.author_id,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          slug: item.slug,
          featured_image_url: item.featured_image_url,
          attachments: item.attachments,
          related_items: item.related_items,
          difficulty_level: item.difficulty_level,
          estimated_read_time:
            item.estimated_read_time ||
            Math.ceil(item.answer?.length / 200) ||
            1,
          full_url: `/faq/${(group as any).slug || group.id}/${(item as any).slug || item.id}`,
          helpful_ratio:
            item.helpful_count + item.not_helpful_count > 0
              ? item.helpful_count /
                (item.helpful_count + item.not_helpful_count)
              : null,
          ...(include_metadata && {
            metadata: { last_updated: item.updated_at },
          }),
        });

        const allowlist = new Set([
          "id",
          "question",
          "answer",
          "language",
          "item_order",
          "created_at",
          "updated_at",
          "is_active",
          "view_count",
          "helpful_count",
          "not_helpful_count",
          "last_accessed_at",
          "tags",
          "category",
          "priority",
          "author_id",
          "meta_title",
          "meta_description",
          "slug",
          "featured_image_url",
          "attachments",
          "related_items",
          "difficulty_level",
          "estimated_read_time",
          "full_url",
          "helpful_ratio",
        ]);
        const requested = fieldsParam
          ? fieldsParam
              .split(",")
              .map((s) => s.trim())
              .filter((f) => allowlist.has(f))
          : undefined;
        const pick = (obj: any) => {
          if (!requested || requested.length === 0) return obj;
          const out: any = {};
          for (const k of requested) out[k] = (obj as any)[k];
          return out;
        };

        const enhancedItems = (items || []).map((it: any) =>
          pick(baseItem(it)),
        );

        faqData.push({
          ...group,
          items: enhancedItems,
          // Add group-level metadata
          total_items: enhancedItems.length,
          total_views: enhancedItems.reduce(
            (sum, item) => sum + (item.view_count || 0),
            0,
          ),
          average_helpfulness:
            enhancedItems.length > 0
              ? enhancedItems.reduce(
                  (sum, item) => sum + (item.helpful_ratio || 0),
                  0,
                ) / enhancedItems.length
              : null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: faqData,
      meta: {
        total_groups: faqData.length,
        page,
        limit,
        total_items: faqData.reduce(
          (sum, group) => sum + ((group as any).total_items || 0),
          0,
        ),
        language,
        search,
        include_metadata,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
    });
  } catch (error) {
    console.error("CMS FAQ API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
