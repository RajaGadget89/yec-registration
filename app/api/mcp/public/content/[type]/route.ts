import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../../lib/mcp/auth";
import { rateLimit } from "../../../../../lib/mcp/rate-limiter";
import { mcpContentRegistry } from "../../../../../lib/mcp/content-registry";
import { auditMCPAccess } from "../../../../../lib/mcp/audit";
import { getCache, setCache } from "../../../../../lib/mcp/cache";
import { sanitizeArray } from "../../../../../lib/mcp/sanitizer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const start = Date.now();
  const url = new URL(request.url);
  const requestId = `mcp_public_content_${start}_${Math.random().toString(36).slice(2, 8)}`;
  const { type } = await params;

  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: `/api/mcp/public/content/${type}`,
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
      endpoint: `/api/mcp/public/content/${type}`,
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 403,
      requestId,
    });
    return res;
  }

  const rl = rateLimit(`mcp:public:content:${type}:${auth.type}`);
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
      endpoint: `/api/mcp/public/content/${type}`,
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    const enabled = await mcpContentRegistry.getEnabledTypes("public");
    const typeRow = enabled.find((t: any) => t.type_key === type);
    if (!typeRow) {
      const res = NextResponse.json(
        { error: "Content type not enabled" },
        { status: 404 },
      );
      await auditMCPAccess({
        endpoint: `/api/mcp/public/content/${type}`,
        method: "GET",
        apiKeyType: auth.type,
        status: 404,
        requestId,
      });
      return res;
    }

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      100,
      parseInt(url.searchParams.get("limit") || "20"),
    );
    const search = url.searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const cacheKey = `mcp:public:content:${type}:${page}:${limit}:${search}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      await auditMCPAccess({
        endpoint: `/api/mcp/public/content/${type}`,
        method: "GET",
        apiKeyType: auth.type,
        status: 200,
        responseBytes: JSON.stringify(cached).length,
        requestId,
        query: { page, limit, search },
      });
      return res;
    }

    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from(typeRow.source_table as string)
      .select("*", { count: "exact" });
    if ("is_active" in ({} as any)) void 0; // placeholder to avoid lint unused pattern
    // heuristic filters
    query = query.order("created_at", { ascending: false });
    if (search) {
      // Try generic 'title'/'name' fields if exist; Supabase will ignore if missing
      query = query.or(`title.ilike.%${search}%,name.ilike.%${search}%`);
    }
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query;
    if (error) throw error;

    // Exposure filtering
    const exposed = [] as any[];
    for (const r of rows || []) {
      const rId = (r as any).id;
      const allow = rId
        ? await mcpContentRegistry.isContentExposed(type, rId)
        : true;
      if (allow) exposed.push(r);
    }

    const schema = typeRow?.schema_definition as any | undefined;
    const safe = schema ? sanitizeArray(exposed, schema) : exposed;

    const payload = {
      type,
      items: safe,
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
      endpoint: `/api/mcp/public/content/${type}`,
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      responseBytes: JSON.stringify(payload).length,
      requestId,
      query: { page, limit, search },
    });
    return res;
  } catch (_e) {
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    await auditMCPAccess({
      endpoint: `/api/mcp/public/content/${type}`,
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 500,
      requestId,
    });
    return res;
  }
}
