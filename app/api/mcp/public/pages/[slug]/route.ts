import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../../lib/mcp/auth";
import { rateLimit } from "../../../../../lib/mcp/rate-limiter";
import { mcpContentRegistry } from "../../../../../lib/mcp/content-registry";
import { auditMCPAccess } from "../../../../../lib/mcp/audit";
import { getCache, setCache } from "../../../../../lib/mcp/cache";
import {
  sanitizeBySchema,
  sanitizeArray,
} from "../../../../../lib/mcp/sanitizer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const start = Date.now();
  const requestId = `mcp_page_${start}_${Math.random().toString(36).slice(2, 8)}`;
  const { slug } = await params;

  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/public/pages/[slug]",
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
      endpoint: "/api/mcp/public/pages/[slug]",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 403,
      requestId,
    });
    return res;
  }

  const rl = rateLimit(`mcp:pages:${auth.type}`);
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
      endpoint: "/api/mcp/public/pages/[slug]",
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    const enabled = await mcpContentRegistry.getEnabledTypes("public");
    const typeRow = enabled.find((t: any) => t.type_key === "pages");
    if (!typeRow) {
      const res = NextResponse.json(
        { error: "Pages not enabled" },
        { status: 404 },
      );
      await auditMCPAccess({
        endpoint: "/api/mcp/public/pages/[slug]",
        method: "GET",
        apiKeyType: auth.type,
        status: 404,
        requestId,
      });
      return res;
    }

    const cacheKey = `mcp:page:${slug}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      await auditMCPAccess({
        endpoint: "/api/mcp/public/pages/[slug]",
        method: "GET",
        apiKeyType: auth.type,
        status: 200,
        responseBytes: JSON.stringify(cached).length,
        requestId,
      });
      return res;
    }

    const supabase = getSupabaseServiceClient();
    const { data: page, error: pageError } = await supabase
      .from("cms_pages")
      .select(
        "id, slug, title, meta_description, language, is_active, updated_at",
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    if (pageError || !page) {
      const res = NextResponse.json(
        { error: "Page not found" },
        { status: 404 },
      );
      await auditMCPAccess({
        endpoint: "/api/mcp/public/pages/[slug]",
        method: "GET",
        apiKeyType: auth.type,
        status: 404,
        requestId,
      });
      return res;
    }

    // Check exposure for this page by content id
    const exposed = await mcpContentRegistry.isContentExposed("pages", page.id);
    if (!exposed) {
      const res = NextResponse.json(
        { error: "Page not exposed" },
        { status: 404 },
      );
      await auditMCPAccess({
        endpoint: "/api/mcp/public/pages/[slug]",
        method: "GET",
        apiKeyType: auth.type,
        status: 404,
        requestId,
      });
      return res;
    }

    const { data: sections } = await supabase
      .from("cms_page_sections")
      .select("id, section_type, section_order, title, content, is_active")
      .eq("page_id", page.id)
      .eq("is_active", true)
      .order("section_order", { ascending: true });

    const schema = typeRow?.schema_definition as any | undefined;
    const safePage = schema ? sanitizeBySchema(page as any, schema) : page;
    const safeSections = schema
      ? sanitizeArray((sections || []) as any[], schema)
      : sections || [];

    const payload = { page: safePage, sections: safeSections };
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
      endpoint: "/api/mcp/public/pages/[slug]",
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      responseBytes: JSON.stringify(payload).length,
      requestId,
    });
    return res;
  } catch (_e) {
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    await auditMCPAccess({
      endpoint: "/api/mcp/public/pages/[slug]",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 500,
      requestId,
    });
    return res;
  }
}
