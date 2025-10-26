import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../../lib/mcp/auth";
import { rateLimit } from "../../../../../lib/mcp/rate-limiter";
import { auditMCPAccess } from "../../../../../lib/mcp/audit";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const url = new URL(request.url);
  const requestId = `mcp_admin_audit_${start}_${Math.random().toString(36).slice(2, 8)}`;

  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok || auth.type !== "admin") {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/admin/audit/query",
      method: "GET",
      apiKeyType: (auth.type || "public") as any,
      status: 401,
      requestId,
    });
    return res;
  }

  const rl = rateLimit(`mcp:admin:audit:${auth.type}`);
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
      endpoint: "/api/mcp/admin/audit/query",
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    const actor = url.searchParams.get("actor") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const resource_id = url.searchParams.get("resource") || undefined;
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      100,
      parseInt(url.searchParams.get("limit") || "20"),
    );
    const offset = (page - 1) * limit;

    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from("audit_logs")
      .select(
        `
        id,
        action,
        actor,
        resource,
        request_id,
        created_at,
        meta
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actor) query = query.eq("actor", actor);
    if (action) query = query.eq("action", action);
    if (resource_id) query = query.eq("resource", resource_id);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data: logs, error, count } = await query;
    if (error) throw error;

    const payload = {
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

    const res = NextResponse.json(payload);
    res.headers.set(
      "X-RateLimit-Limit",
      String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
    );
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));
    await auditMCPAccess({
      endpoint: "/api/mcp/admin/audit/query",
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      responseBytes: JSON.stringify(payload).length,
      requestId,
      query: { actor, action, resource_id, from, to, page, limit },
    });
    return res;
  } catch (_e) {
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    await auditMCPAccess({
      endpoint: "/api/mcp/admin/audit/query",
      method: "GET",
      apiKeyType: auth.type,
      status: 500,
      requestId,
    });
    return res;
  }
}
