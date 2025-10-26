import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../lib/mcp/auth";
import { rateLimit } from "../../../lib/mcp/rate-limiter";
import { mcpContentRegistry } from "../../../lib/mcp/content-registry";
import { auditMCPAccess } from "../../../lib/mcp/audit";
import { getCache, setCache } from "../../../lib/mcp/cache";
import { sanitizeArray } from "../../../lib/mcp/sanitizer";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const url = new URL(request.url);
  const requestId = `mcp_public_unified_${start}_${Math.random().toString(36).slice(2, 8)}`;

  // API key validation (public key allowed)
  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/public",
      method: "GET",
      apiKeyType: "public",
      status: 401,
      requestId,
    });
    return res;
  }
  if (auth.type !== "public" && auth.type !== "admin") {
    const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await auditMCPAccess({
      endpoint: "/api/mcp/public",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 403,
      requestId,
    });
    return res;
  }

  // Rate limiting per API key type
  const rl = rateLimit(`mcp:public:unified:${auth.type}`);
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 },
    );
    res.headers.set(
      "X-RateLimit-Limit",
      String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
    );
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));
    await auditMCPAccess({
      endpoint: "/api/mcp/public",
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    // Get enabled content types
    const enabled = await mcpContentRegistry.getEnabledTypes("public");
    const availableContentTypes = enabled.map((t: any) => t.type_key);

    console.log("Enabled content types:", availableContentTypes);

    // Check cache first
    const cacheKey = `mcp:public:unified:${availableContentTypes.join(",")}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      await auditMCPAccess({
        endpoint: "/api/mcp/public",
        method: "GET",
        apiKeyType: auth.type,
        status: 200,
        responseBytes: JSON.stringify(cached).length,
        requestId,
      });
      return res;
    }

    const supabase = getSupabaseServiceClient();
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";

    // Initialize response structure
    const response: any = {
      system: {
        operational: true,
        registration_open: false,
        event_dates: { start: null, end: null },
        statistics: { total_registered: null },
        available_content_types: availableContentTypes,
      },
      content: {},
    };

    // Fetch FAQ data if enabled
    if (availableContentTypes.includes("faq")) {
      console.log("Fetching FAQ data...");
      try {
        let groupQuery = supabase
          .from("cms_faq_groups")
          .select(
            `
            id, title, description, language, display_config, published_at,
            links, hashtags, share_text, share_title, share_enabled
          `,
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
          response.content.faq = sanitizeArray(faqData);
        }
      } catch (error) {
        console.error("Error fetching FAQ data:", error);
        response.content.faq = [];
      }
    } else {
      console.log("FAQ not enabled in content types");
      response.content.faq = [];
    }

    // Fetch Activities data if enabled
    if (availableContentTypes.includes("activities")) {
      try {
        let activitiesQuery = supabase
          .from("cms_activities")
          .select(
            `
            id, title, description, content, language, display_config,
            start_date, end_date, location, registration_required, max_participants,
            published_at, created_at, updated_at
          `,
          )
          .eq("is_active", true)
          .not("published_at", "is", null);

        if (language !== "all") {
          activitiesQuery = activitiesQuery.eq("language", language);
        }

        if (search) {
          activitiesQuery = activitiesQuery.or(
            `title.ilike.%${search}%,description.ilike.%${search}%`,
          );
        }

        const { data: activities, error: activitiesError } =
          await activitiesQuery
            .order("start_date", { ascending: true })
            .limit(50);

        if (activitiesError) throw activitiesError;
        response.content.activities = sanitizeArray(activities || []);
      } catch (error) {
        console.error("Error fetching Activities data:", error);
        response.content.activities = [];
      }
    }

    // Fetch News data if enabled
    if (availableContentTypes.includes("news")) {
      try {
        let newsQuery = supabase
          .from("cms_news")
          .select(
            `
            id, title, content, excerpt, language, display_config,
            featured_image, author, published_at, created_at, updated_at
          `,
          )
          .eq("is_active", true)
          .not("published_at", "is", null);

        if (language !== "all") {
          newsQuery = newsQuery.eq("language", language);
        }

        if (search) {
          newsQuery = newsQuery.or(
            `title.ilike.%${search}%,content.ilike.%${search}%`,
          );
        }

        const { data: news, error: newsError } = await newsQuery
          .order("published_at", { ascending: false })
          .limit(50);

        if (newsError) throw newsError;
        response.content.news = sanitizeArray(news || []);
      } catch (error) {
        console.error("Error fetching News data:", error);
        response.content.news = [];
      }
    }

    // Fetch Pages data if enabled
    if (availableContentTypes.includes("pages")) {
      try {
        let pagesQuery = supabase
          .from("cms_pages")
          .select(
            `
            id, title, content, slug, language, display_config,
            meta_title, meta_description, published_at, created_at, updated_at
          `,
          )
          .eq("is_active", true)
          .not("published_at", "is", null);

        if (language !== "all") {
          pagesQuery = pagesQuery.eq("language", language);
        }

        if (search) {
          pagesQuery = pagesQuery.or(
            `title.ilike.%${search}%,content.ilike.%${search}%`,
          );
        }

        const { data: pages, error: pagesError } = await pagesQuery
          .order("published_at", { ascending: false })
          .limit(50);

        if (pagesError) throw pagesError;
        response.content.pages = sanitizeArray(pages || []);
      } catch (error) {
        console.error("Error fetching Pages data:", error);
        response.content.pages = [];
      }
    }

    // Cache the response for 5 minutes
    setCache(cacheKey, response, 300);

    const res = NextResponse.json(response);
    res.headers.set("X-Cache", "MISS");
    res.headers.set("X-Content-Types", availableContentTypes.join(","));

    await auditMCPAccess({
      endpoint: "/api/mcp/public",
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      responseBytes: JSON.stringify(response).length,
      requestId,
      query: { language, search },
    });

    return res;
  } catch (error) {
    console.error("MCP Public Unified API Error:", error);
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );

    await auditMCPAccess({
      endpoint: "/api/mcp/public",
      method: "GET",
      apiKeyType: auth.type,
      status: 500,
      requestId,
    });

    return res;
  }
}
