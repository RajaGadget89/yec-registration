import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../lib/mcp/auth";
import { rateLimit } from "../../../../lib/mcp/rate-limiter";
import { auditMCPAccess } from "../../../../lib/mcp/audit";
import { mcpContentRegistry } from "../../../../lib/mcp/content-registry";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const requestId = `mcp_status_${start}_${Math.random().toString(36).slice(2, 8)}`;

  const auth = await await validateMCPApiKey(request.headers);
  if (!auth.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/public/status",
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
      endpoint: "/api/mcp/public/status",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 403,
      requestId,
    });
    return res;
  }

  const rl = rateLimit(`mcp:status:${auth.type}`);
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
      endpoint: "/api/mcp/public/status",
      method: "GET",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    const supabase = getSupabaseServiceClient();

    // Basic stats and flags (adjust as needed based on actual schema)
    const { data: settings } = await supabase
      .from("event_settings")
      .select("registration_open, event_start_date, event_end_date")
      .single();

    const { data: regCountRow } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true });

    const enabledPublicTypes =
      await mcpContentRegistry.getEnabledTypes("public");

    const payload = {
      system: "operational",
      registration_open: settings?.registration_open ?? false,
      event_dates: {
        start: settings?.event_start_date ?? null,
        end: settings?.event_end_date ?? null,
      },
      statistics: { total_registered: regCountRow as any as number | 0 },
      available_content_types: (enabledPublicTypes || []).map(
        (t: any) => t.type_key,
      ),
    };

    const res = NextResponse.json(payload);
    res.headers.set(
      "X-RateLimit-Limit",
      String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
    );
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));

    await auditMCPAccess({
      endpoint: "/api/mcp/public/status",
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
      endpoint: "/api/mcp/public/status",
      method: "GET",
      apiKeyType: auth.type || "public",
      status: 500,
      requestId,
    });
    return res;
  }
}
