import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../lib/mcp/auth";
import { rateLimit } from "../../../../lib/mcp/rate-limiter";
import { auditMCPAccess } from "../../../../lib/mcp/audit";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const url = new URL(request.url);
  const requestId = `mcp_admin_stats_${start}_${Math.random().toString(36).slice(2, 8)}`;

  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok || auth.type !== "admin") {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/admin/stats",
      method: "GET",
      apiKeyType: (auth.type || "public") as any,
      status: 401,
      requestId,
    });
    return res;
  }

  const rl = rateLimit(`mcp:admin:stats:${auth.type}`);
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
      endpoint: "/api/mcp/admin/stats",
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    const period = url.searchParams.get("period") || "all";
    const supabase = getSupabaseServiceClient();

    const { count: total } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true });

    const statuses = ["approved", "pending", "rejected"] as const;
    const by_status: Record<string, number> = {};
    for (const s of statuses) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      by_status[s] = count || 0;
    }

    const payload = {
      total: total || 0,
      by_status,
      period,
    };

    const res = NextResponse.json(payload);
    res.headers.set(
      "X-RateLimit-Limit",
      String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
    );
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));
    await auditMCPAccess({
      endpoint: "/api/mcp/admin/stats",
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      responseBytes: JSON.stringify(payload).length,
      requestId,
      query: { period },
    });
    return res;
  } catch (_e) {
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    await auditMCPAccess({
      endpoint: "/api/mcp/admin/stats",
      method: "GET",
      apiKeyType: auth.type,
      status: 500,
      requestId,
    });
    return res;
  }
}
