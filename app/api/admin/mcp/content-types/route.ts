import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../_lib/withSuperAdminApiGuard";

export async function GET(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from("mcp_content_types")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json(
        { error: "Failed to fetch count" },
        { status: 500 },
      );
    }

    // Get paginated data
    const { data, error } = await supabase
      .from("mcp_content_types")
      .select(
        "id, type_key, type_name, description, endpoint_path, is_enabled, access_level, source_table, schema_definition, query_config, created_at, updated_at",
      )
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      contentTypes: data || [],
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
    const { data, error } = await supabase
      .from("mcp_content_types")
      .insert(body)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to create" }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  })(request, {} as any);
}
