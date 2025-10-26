import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../../_lib/withSuperAdminApiGuard";

export async function POST(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const body = await request.json();
    const { action, content_type_id, content_ids, is_exposed } = body;

    if (!action || !content_type_id || !Array.isArray(content_ids)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    if (action === "bulk_update") {
      // Update multiple exposure rules
      const updates = content_ids.map((content_id: string) => ({
        content_type_id,
        content_id,
        is_exposed: is_exposed ?? true,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("mcp_content_exposure")
        .upsert(updates, { onConflict: "content_type_id,content_id" })
        .select();

      if (error) {
        return NextResponse.json(
          { error: "Failed to bulk update" },
          { status: 400 },
        );
      }

      return NextResponse.json({ updated: data?.length || 0 });
    }

    if (action === "bulk_delete") {
      // Delete multiple exposure rules
      const { error } = await supabase
        .from("mcp_content_exposure")
        .delete()
        .eq("content_type_id", content_type_id)
        .in("content_id", content_ids);

      if (error) {
        return NextResponse.json(
          { error: "Failed to bulk delete" },
          { status: 400 },
        );
      }

      return NextResponse.json({ deleted: content_ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  })(request, {} as any);
}
