import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../_lib/withSuperAdminApiGuard";

export async function GET(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      100,
      parseInt(url.searchParams.get("limit") || "20"),
    );
    const offset = (page - 1) * limit;

    // Get filters
    const endpoint = url.searchParams.get("endpoint");
    const statusCode = url.searchParams.get("status_code");
    const apiKeyType = url.searchParams.get("api_key_type");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from("mcp_access_logs")
      .select(
        "id, api_key_type, endpoint, method, status_code, response_time_ms, ip_address, user_agent, created_at",
        { count: "exact" },
      );

    // Apply filters
    if (endpoint) {
      query = query.ilike("endpoint", `%${endpoint}%`);
    }
    if (statusCode) {
      query = query.eq("status_code", parseInt(statusCode));
    }
    if (apiKeyType) {
      query = query.eq("api_key_type", apiKeyType);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Access logs error:", error);
      return NextResponse.json(
        { error: "Failed to fetch logs" },
        { status: 500 },
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      accessLogs: data || [],
      totalCount: count || 0,
      totalPages,
      currentPage: page,
    });
  })(request, {} as any);
}
