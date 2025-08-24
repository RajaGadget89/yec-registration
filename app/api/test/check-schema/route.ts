import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  // Check for test helpers enabled
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  if (!testHelpersEnabled || testHelpersEnabled !== "1") {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { tableName } = body;

    if (!tableName) {
      return NextResponse.json(
        { error: "tableName is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Query to get table structure
    const { data, error } = await supabase.rpc("get_table_columns", {
      table_name: tableName,
    });

    if (error) {
      // Fallback: use direct SQL query
      const { data: columns, error: sqlError } = await supabase
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable, column_default")
        .eq("table_schema", "public")
        .eq("table_name", tableName)
        .order("ordinal_position");

      if (sqlError) {
        console.error("Error querying table schema:", sqlError);
        return NextResponse.json(
          { error: "Failed to query table schema", details: sqlError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        tableName,
        columns: columns || [],
        count: columns?.length || 0,
      });
    }

    return NextResponse.json({
      success: true,
      tableName,
      columns: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Unexpected error in check-schema:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
