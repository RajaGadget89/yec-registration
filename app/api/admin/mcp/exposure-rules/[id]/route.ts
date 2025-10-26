import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../../_lib/withSuperAdminApiGuard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withSuperAdminApiGuard(async () => {
    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("mcp_content_exposure")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Exposure rule not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  })(request, {} as any);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withSuperAdminApiGuard(async () => {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("mcp_content_exposure")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 400 });
    }

    return NextResponse.json(data);
  })(request, {} as any);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withSuperAdminApiGuard(async () => {
    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase
      .from("mcp_content_exposure")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  })(request, {} as any);
}
