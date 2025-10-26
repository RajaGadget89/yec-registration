import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../lib/mcp/auth";

/**
 * Get embedding jobs status
 * GET /api/admin/embedding-jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin API key
    const auth = await validateMCPApiKey(request.headers);
    if (!auth.ok || auth.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();

    // Get recent jobs
    const { data: jobs, error } = await supabase
      .from("embedding_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching jobs:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Get job statistics
    const { data: stats } = await supabase
      .from("embedding_jobs")
      .select("status")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ); // Last 24 hours

    const statsCount =
      stats?.reduce((acc: any, job: any) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {}) || {};

    return NextResponse.json({
      jobs: jobs || [],
      stats: {
        last24h: statsCount,
        total: jobs?.length || 0,
      },
    });
  } catch (error) {
    console.error("Embedding jobs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
