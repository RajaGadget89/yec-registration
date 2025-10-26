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
      .from("mcp_content_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Content type not found" },
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
      .from("mcp_content_types")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json(
        { error: "Failed to update content type" },
        { status: 500 },
      );
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
      .from("mcp_content_types")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete content type" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  })(request, {} as any);
}
