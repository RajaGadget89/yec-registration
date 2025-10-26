import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../../_lib/withSuperAdminApiGuard";

function generateApiKey(): string {
  const prefix = "mcp_";
  const randomPart = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return prefix + randomPart;
}

export async function POST(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const body = await request.json();
    const { key_type = "public" } = body;

    const supabase = getSupabaseServiceClient();
    const newApiKey = generateApiKey();

    // Deactivate old keys of the same type
    await supabase
      .from("mcp_api_keys")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("key_type", key_type);

    // Create new key
    const { data, error } = await supabase
      .from("mcp_api_keys")
      .insert({
        api_key: newApiKey,
        key_type,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to rotate key" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      new_key: newApiKey,
      key_id: data.id,
    });
  })(request, {} as any);
}
