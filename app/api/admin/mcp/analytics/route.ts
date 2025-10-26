import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withSuperAdminApiGuard } from "../../../_lib/withSuperAdminApiGuard";

export async function GET(request: NextRequest) {
  return withSuperAdminApiGuard(async () => {
    const supabase = getSupabaseServiceClient();
    // Get top endpoints by counting occurrences
    const { data: topEndpoints } = await supabase
      .from("mcp_access_logs")
      .select("endpoint")
      .order("created_at", { ascending: false })
      .limit(1000); // Get recent logs to analyze

    // Get API key type distribution
    const { data: byApiKeyType } = await supabase
      .from("mcp_access_logs")
      .select("api_key_type")
      .order("created_at", { ascending: false })
      .limit(1000); // Get recent logs to analyze

    // Process the data to get counts
    const endpointCounts = (topEndpoints || []).reduce(
      (acc: Record<string, number>, log: any) => {
        acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        return acc;
      },
      {},
    );

    const apiKeyTypeCounts = (byApiKeyType || []).reduce(
      (acc: Record<string, number>, log: any) => {
        acc[log.api_key_type] = (acc[log.api_key_type] || 0) + 1;
        return acc;
      },
      {},
    );

    const topEndpointsData = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byApiKeyTypeData = Object.entries(apiKeyTypeCounts)
      .map(([api_key_type, count]) => ({ api_key_type, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      topEndpoints: topEndpointsData,
      byApiKeyType: byApiKeyTypeData,
    });
  })(request, {} as any);
}
