import { NextRequest, NextResponse } from "next/server";
import { withSuperAdminApiGuard } from "../../../_lib/withSuperAdminApiGuard";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";

function generateApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "mcp_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from("mcp_api_keys")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json(
        { error: "Failed to fetch count" },
        { status: 500 },
      );
    }

    // Get paginated data
    const { data, error } = await supabase
      .from("mcp_api_keys")
      .select(
        "id, key_name, key_type, access_level, api_key, is_active, created_at, last_used, usage_count",
      )
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch API keys" },
        { status: 500 },
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      apiKeys: data || [],
      totalCount: count || 0,
      totalPages,
      currentPage: page,
    });
  })(request, {} as any);
}

export async function POST(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const body = await request.json();
    const supabase = getSupabaseServiceClient();

    const apiKeyData = {
      key_name: body.key_name,
      key_type: body.key_type || "public",
      access_level: body.access_level || body.key_type || "public",
      api_key: generateApiKey(),
      is_active: true,
      created_at: new Date().toISOString(),
      usage_count: 0,
    };

    const { data, error } = await supabase
      .from("mcp_api_keys")
      .insert(apiKeyData)
      .select()
      .single();

    if (error) {
      console.error("Create API key error:", error);
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  })(request, {} as any);
}
