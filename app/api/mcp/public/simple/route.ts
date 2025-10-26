import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../lib/mcp/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateMCPApiKey(request.headers);
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";

    // Initialize response structure
    const response: any = {
      system: {
        operational: true,
        registration_open: false,
        event_dates: { start: null, end: null },
        statistics: { total_registered: null },
        available_content_types: ["faq", "activities", "news", "pages"],
      },
      content: {},
    };

    // Fetch FAQ data
    try {
      let groupQuery = supabase
        .from("cms_faq_groups")
        .select(
          "id, title, description, language, display_config, published_at",
        )
        .eq("is_active", true)
        .not("published_at", "is", null);

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
        .limit(50);

      console.log("FAQ groups result:", {
        groups: groups?.length || 0,
        error: groupsError,
      });

      if (groupsError) {
        console.error("FAQ groups error:", groupsError);
        response.content.faq = [];
      } else if (!groups || groups.length === 0) {
        console.log("No FAQ groups found");
        response.content.faq = [];
      } else {
        // Fetch FAQ items for each group
        const faqData = [];
        for (const group of groups) {
          const { data: items, error: itemsError } = await supabase
            .from("cms_faq_items")
            .select("id, question, answer, language, item_order")
            .eq("group_id", group.id)
            .eq("is_active", true)
            .order("item_order", { ascending: true });

          console.log(`FAQ items for group ${group.id}:`, {
            items: items?.length || 0,
            error: itemsError,
          });

          if (itemsError) {
            console.error(
              "FAQ items error for group",
              group.id,
              ":",
              itemsError,
            );
            // Still add the group even if items fail
            faqData.push({
              ...group,
              items: [],
            });
          } else {
            faqData.push({
              ...group,
              items: items || [],
            });
          }
        }

        console.log("Final FAQ data:", faqData.length);
        response.content.faq = faqData;
      }
    } catch (error) {
      console.error("Error fetching FAQ data:", error);
      response.content.faq = [];
    }

    // Fetch Activities data
    try {
      let activitiesQuery = supabase
        .from("cms_activity_cards")
        .select(
          "id, title, summary, content, language, published_at, image_url, card_slug, scheduled_at, ends_at",
        )
        .eq("is_active", true)
        .not("published_at", "is", null);

      if (language !== "all") {
        activitiesQuery = activitiesQuery.eq("language", language);
      }

      if (search) {
        activitiesQuery = activitiesQuery.or(
          `title.ilike.%${search}%,summary.ilike.%${search}%,content.ilike.%${search}%`,
        );
      }

      const { data: activities, error: activitiesError } = await activitiesQuery
        .order("published_at", { ascending: false })
        .limit(50);

      console.log("Activities query result:", {
        activities: activities?.length || 0,
        error: activitiesError,
      });

      if (activitiesError) {
        console.error("Activities error:", activitiesError);
        response.content.activities = [];
      } else {
        response.content.activities = activities || [];
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      response.content.activities = [];
    }

    // Fetch News data
    try {
      let newsQuery = supabase
        .from("cms_news")
        .select(
          "id, headline, content, language, published_at, image_url, hashtags",
        )
        .eq("is_active", true)
        .not("published_at", "is", null);

      if (language !== "all") {
        newsQuery = newsQuery.eq("language", language);
      }

      if (search) {
        newsQuery = newsQuery.or(
          `headline.ilike.%${search}%,content.ilike.%${search}%`,
        );
      }

      const { data: news, error: newsError } = await newsQuery
        .order("published_at", { ascending: false })
        .limit(50);

      console.log("News query result:", {
        news: news?.length || 0,
        error: newsError,
      });

      if (newsError) {
        console.error("News error:", newsError);
        response.content.news = [];
      } else {
        response.content.news = news || [];
      }
    } catch (error) {
      console.error("Error fetching news:", error);
      response.content.news = [];
    }

    // Fetch Pages data
    try {
      let pagesQuery = supabase
        .from("cms_pages")
        .select(
          "id, title, slug, meta_description, language, is_active, updated_at",
        )
        .eq("is_active", true);

      if (language !== "all") {
        pagesQuery = pagesQuery.eq("language", language);
      }

      if (search) {
        pagesQuery = pagesQuery.or(
          `title.ilike.%${search}%,meta_description.ilike.%${search}%`,
        );
      }

      const { data: pages, error: pagesError } = await pagesQuery
        .order("updated_at", { ascending: false })
        .limit(50);

      console.log("Pages query result:", {
        pages: pages?.length || 0,
        error: pagesError,
      });

      if (pagesError) {
        console.error("Pages error:", pagesError);
        response.content.pages = [];
      } else {
        response.content.pages = pages || [];
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
      response.content.pages = [];
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("MCP Public Simple API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
