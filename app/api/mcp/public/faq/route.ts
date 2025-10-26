import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../lib/mcp/auth";
import { rateLimit } from "../../../../lib/mcp/rate-limiter";
import { mcpContentRegistry } from "../../../../lib/mcp/content-registry";
import { auditMCPAccess } from "../../../../lib/mcp/audit";
import { getCache, setCache } from "../../../../lib/mcp/cache";
import { sanitizeArray } from "../../../../lib/mcp/sanitizer";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const url = new URL(request.url);
  const requestId = `mcp_faq_${start}_${Math.random().toString(36).slice(2, 8)}`;

  // API key validation (public key allowed)
  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/public/faq",
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
      endpoint: "/api/mcp/public/faq",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 403,
      requestId,
    });
    return res;
  }

  // Rate limiting per API key type
  const rl = rateLimit(`mcp:faq:${auth.type}`);
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
      endpoint: "/api/mcp/public/faq",
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    // Content type must be enabled
    const enabled = await mcpContentRegistry.getEnabledTypes("public");
    const isFAQEnabled = enabled.some((t: any) => t.type_key === "faq");
    if (!isFAQEnabled) {
      const res = NextResponse.json(
        { error: "FAQ not enabled" },
        { status: 404 },
      );
      await auditMCPAccess({
        endpoint: "/api/mcp/public/faq",
        method: "GET",
        apiKeyType: auth.type,
        status: 404,
        requestId,
      });
      return res;
    }

    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";

    const cacheKey = `mcp:faq:${language}:${search}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      await auditMCPAccess({
        endpoint: "/api/mcp/public/faq",
        method: "GET",
        apiKeyType: auth.type,
        status: 200,
        responseBytes: JSON.stringify(cached).length,
        requestId,
        query: { language, search },
      });
      return res;
    }

    const supabase = getSupabaseServiceClient();

    // Fetch published and active FAQ groups
    let groupQuery = supabase
      .from("cms_faq_groups")
      .select("id, title, description, language, display_config, published_at")
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

    const { data: groups, error: groupErr } = await groupQuery;
    if (groupErr) {
      throw groupErr;
    }

    // Exposure filtering per group
    const exposedGroups = [] as any[];
    for (const g of groups || []) {
      const exposed = await mcpContentRegistry.isContentExposed("faq", g.id);
      if (exposed) exposedGroups.push(g);
    }

    // Fetch items for exposed groups
    const groupIds = exposedGroups.map((g) => g.id);
    let items: any[] = [];
    if (groupIds.length > 0) {
      const { data: itemsData, error: itemsErr } = await supabase
        .from("cms_faq_items")
        .select(
          "id, group_id, question, answer, item_order, created_at, updated_at",
        )
        .in("group_id", groupIds)
        .eq("is_active", true)
        .order("item_order", { ascending: true });
      if (itemsErr) throw itemsErr;
      items = itemsData || [];
    }

    // Optional schema-based sanitization (if schema present)
    // Get FAQ schema if defined
    const faqType = enabled.find((t: any) => t.type_key === "faq");
    const schema = faqType?.schema_definition as any | undefined;
    const safeGroups = schema
      ? sanitizeArray(exposedGroups, schema)
      : exposedGroups;
    const safeItems = schema ? sanitizeArray(items, schema) : items;

    const payload = { groups: safeGroups, items: safeItems };

    // Cache short-lived for public data if enabled
    setCache(cacheKey, payload, 5 * 60 * 1000); // 5 minutes

    const res = NextResponse.json(payload);
    res.headers.set("X-Cache", "MISS");
    res.headers.set(
      "X-RateLimit-Limit",
      String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
    );
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));

    await auditMCPAccess({
      endpoint: "/api/mcp/public/faq",
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      responseBytes: JSON.stringify(payload).length,
      requestId,
      query: { language, search },
    });

    return res;
  } catch (_e) {
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    await auditMCPAccess({
      endpoint: "/api/mcp/public/faq",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 500,
      requestId,
    });
    return res;
  } finally {
    void start;
  }
}
