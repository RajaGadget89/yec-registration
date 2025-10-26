import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../../lib/mcp/auth";
import { rateLimit } from "../../../../../lib/mcp/rate-limiter";
import { auditMCPAccess } from "../../../../../lib/mcp/audit";

export async function POST(request: NextRequest) {
  const start = Date.now();
  const requestId = `mcp_admin_lookup_${start}_${Math.random().toString(36).slice(2, 8)}`;

  const auth = await validateMCPApiKey(request.headers);
  if (!auth.ok || auth.type !== "admin") {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await auditMCPAccess({
      endpoint: "/api/mcp/admin/users/lookup",
      method: "POST",
      apiKeyType: (auth.type || "public") as any,
      status: 401,
      requestId,
    });
    return res;
  }

  const rl = rateLimit(`mcp:admin:lookup:${auth.type}`);
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
      endpoint: "/api/mcp/admin/users/lookup",
      method: "POST",
      apiKeyType: auth.type,
      status: 429,
      requestId,
    });
    return res;
  }

  try {
    const { email, line_id, registration_id } = await request.json();
    if (!email && !line_id && !registration_id) {
      return NextResponse.json(
        { error: "Provide email, line_id, or registration_id" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    let registration = null as any;
    if (registration_id) {
      const { data } = await supabase
        .from("registrations")
        .select(
          "id, email, full_name, phone, status, created_at, updated_at, line_id",
        )
        .eq("id", registration_id)
        .single();
      registration = data || null;
    }

    if (!registration && email) {
      const { data } = await supabase
        .from("registrations")
        .select(
          "id, email, full_name, phone, status, created_at, updated_at, line_id",
        )
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      registration = data || null;
    }

    if (!registration && line_id) {
      const { data } = await supabase
        .from("registrations")
        .select(
          "id, email, full_name, phone, status, created_at, updated_at, line_id",
        )
        .eq("line_id", line_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      registration = data || null;
    }

    const payload = { user: registration };

    const res = NextResponse.json(payload);
    res.headers.set(
      "X-RateLimit-Limit",
      String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
    );
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.reset));

    await auditMCPAccess({
      endpoint: "/api/mcp/admin/users/lookup",
      method: "POST",
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
      endpoint: "/api/mcp/admin/users/lookup",
      method: "POST",
      apiKeyType: auth.type,
      status: 500,
      requestId,
    });
    return res;
  }
}
