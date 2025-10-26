import { getSupabaseServiceClient } from "../supabase-server";
import type { MCPContentTypeConfig } from "./types";

export class MCPContentRegistry {
  async getEnabledTypes(accessLevel: "public" | "admin") {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("mcp_content_types")
      .select(
        "id, type_key, type_name, endpoint_path, is_enabled, access_level, source_table, schema_definition, query_config",
      )
      .eq("is_enabled", true)
      .eq("access_level", accessLevel);
    if (error) throw error;
    return data;
  }

  async isContentExposed(typeKey: string, contentId: string): Promise<boolean> {
    const supabase = getSupabaseServiceClient();
    const { data: typeRow, error: typeErr } = await supabase
      .from("mcp_content_types")
      .select("id")
      .eq("type_key", typeKey)
      .eq("is_enabled", true)
      .single();
    if (typeErr || !typeRow) return false;

    const { data: exposure, error } = await supabase
      .from("mcp_content_exposure")
      .select("is_exposed")
      .eq("content_type_id", typeRow.id)
      .eq("content_id", contentId)
      .single();

    if (error && error.code !== "PGRST116") return false; // not found is allowed
    if (!exposure) return true; // default allow when no explicit rule
    return !!exposure.is_exposed;
  }

  async registerContentType(_config: MCPContentTypeConfig): Promise<void> {
    // Management UI/API will handle creation. This placeholder exists for tests.
  }
}

export const mcpContentRegistry = new MCPContentRegistry();
