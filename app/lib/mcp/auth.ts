export type MCPApiKeyType = "public" | "admin";

export interface MCPAuthResult {
  ok: boolean;
  type?: MCPApiKeyType;
  error?: string;
}

function extractApiKey(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const key = headers.get("x-mcp-api-key");
  return key ? key.trim() : null;
}

export async function validateMCPApiKey(
  headers: Headers,
): Promise<MCPAuthResult> {
  const provided = extractApiKey(headers);
  if (!provided) return { ok: false, error: "missing_api_key" };

  try {
    // Import Supabase client
    const { getSupabaseServiceClient } = await import("../supabase-server");
    const supabase = getSupabaseServiceClient();

    // Check database for active API key
    const { data: apiKey, error } = await supabase
      .from("mcp_api_keys")
      .select("access_level, is_active")
      .eq("api_key", provided)
      .eq("is_active", true)
      .single();

    if (error || !apiKey) {
      // Fallback to ENV-based keys to reduce setup friction in staging
      const publicKeys = (process.env.MCP_PUBLIC_API_KEYS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const adminKeys = (process.env.MCP_ADMIN_API_KEYS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (publicKeys.includes(provided)) {
        return { ok: true, type: "public" };
      }
      if (adminKeys.includes(provided)) {
        return { ok: true, type: "admin" };
      }
      return { ok: false, error: "invalid_api_key" };
    }

    // Map access_level to type
    const type: MCPApiKeyType =
      apiKey.access_level === "admin" ? "admin" : "public";

    return { ok: true, type };
  } catch (err) {
    console.error("MCP API key validation error:", err);
    return { ok: false, error: "validation_error" };
  }
}
