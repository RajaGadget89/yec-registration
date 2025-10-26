import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../_lib/withSuperAdminApiGuard";

export async function GET(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("mcp_content_exposure")
      .select(
        "id, content_type_id, content_id, is_exposed, exposure_metadata, created_at, updated_at",
      );
    if (error)
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    return NextResponse.json({ rules: data || [] });
  })(request, {} as any);
}

export async function POST(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const body = await request.json();
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("mcp_content_exposure")
      .insert(body)
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: "Failed to create" }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  })(request, {} as any);
}
