import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../../../_lib/withSuperAdminApiGuard";

function generateApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "mcp_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withSuperAdminApiGuard(async () => {
    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    const newApiKey = generateApiKey();

    const { data, error } = await supabase
      .from("mcp_api_keys")
      .update({
        api_key: newApiKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Rotate API key error:", error);
      return NextResponse.json(
        { error: "Failed to rotate API key" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...data,
      api_key: newApiKey, // Return the new key for display
    });
  })(request, {} as any);
}
