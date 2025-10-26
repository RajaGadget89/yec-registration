import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 Testing database connection...");

    const supabase = getSupabaseServiceClient();
    console.log("✅ Supabase client created");

    // Test a simple query
    const { data, error } = await supabase
      .from("cms_faq_groups")
      .select("id, title")
      .limit(1);

    console.log("📊 Query result:", { data: data?.length || 0, error });

    if (error) {
      console.error("❌ Database error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Database connection working",
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    return NextResponse.json(
      {
        error: "Test endpoint error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
