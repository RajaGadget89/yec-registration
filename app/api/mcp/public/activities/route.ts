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
  const requestId = `mcp_activities_${start}_${Math.random().toString(36).slice(2, 8)}`;

  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/public/activities",
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
      endpoint: "/api/mcp/public/activities",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 403,
      requestId,
    });
    return res;
  }

  const rl = rateLimit(`mcp:activities:${auth.type}`);
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
      endpoint: "/api/mcp/public/activities",
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    const enabled = await mcpContentRegistry.getEnabledTypes("public");
    const typeRow = enabled.find((t: any) => t.type_key === "activities");
    if (!typeRow) {
      const res = NextResponse.json(
        { error: "Activities not enabled" },
        { status: 404 },
      );
      await auditMCPAccess({
        endpoint: "/api/mcp/public/activities",
        method: "GET",
        apiKeyType: auth.type,
        status: 404,
        requestId,
      });
      return res;
    }

    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      100,
      parseInt(url.searchParams.get("limit") || "20"),
    );
    const sort = url.searchParams.get("sort") || "newest";
    const offset = (page - 1) * limit;

    const cacheKey = `mcp:activities:${language}:${search}:${page}:${limit}:${sort}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      await auditMCPAccess({
        endpoint: "/api/mcp/public/activities",
        method: "GET",
        apiKeyType: auth.type,
        status: 200,
        responseBytes: JSON.stringify(cached).length,
        requestId,
        query: { language, search, page, limit, sort },
      });
      return res;
    }

    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from("cms_activity_cards")
      .select(
        `
        id,
        card_slug,
        title,
        description,
        summary,
        content,
        image_url,
        icon_emoji,
        language,
        is_active,
        published_at,
        scheduled_at,
        ends_at,
        created_at,
        hashtags,
        external_links
      `,
        { count: "exact" },
      )
      .eq("is_active", true);

    if (language !== "all") {
      query = query.eq("language", language);
    }
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`,
      );
    }

    switch (sort) {
      case "oldest":
        query = query.order("published_at", { ascending: true });
        break;
      case "alphabetical":
        query = query.order("title", { ascending: true });
        break;
      case "reverse-alphabetical":
        query = query.order("title", { ascending: false });
        break;
      case "display_order":
        query = query.order("display_order", { ascending: true });
        break;
      default:
        query = query.order("published_at", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query;
    if (error) throw error;

    const exposed = [] as any[];
    for (const r of rows || []) {
      const allow = await mcpContentRegistry.isContentExposed(
        "activities",
        r.id,
      );
      if (allow) exposed.push(r);
    }

    const schema = typeRow?.schema_definition as any | undefined;
    const safe = schema ? sanitizeArray(exposed, schema) : exposed;

    const payload = {
      activities: safe,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

    setCache(cacheKey, payload, 5 * 60 * 1000);

    const res = NextResponse.json(payload);
    res.headers.set("X-Cache", "MISS");
    res.headers.set(
      "X-RateLimit-Limit",
      String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
    );
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));

    await auditMCPAccess({
      endpoint: "/api/mcp/public/activities",
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      responseBytes: JSON.stringify(payload).length,
      requestId,
      query: { language, search, page, limit, sort },
    });
    return res;
  } catch (_e) {
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    await auditMCPAccess({
      endpoint: "/api/mcp/public/activities",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 500,
      requestId,
    });
    return res;
  }
}
