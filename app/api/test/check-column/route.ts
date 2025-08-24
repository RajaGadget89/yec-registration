import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  // Check for test helpers enabled
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  if (!testHelpersEnabled || testHelpersEnabled !== "1") {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { tableName, columnName } = body;

    if (!tableName || !columnName) {
      return NextResponse.json(
        { error: "tableName and columnName are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // Query to check if column exists
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .eq('column_name', columnName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Column not found
        return NextResponse.json({
          success: true,
          tableName,
          columnName,
          exists: false,
          message: `Column '${columnName}' does not exist in table '${tableName}'`
        });
      }
      
      console.error("Error checking column:", error);
      return NextResponse.json(
        { error: "Failed to check column", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tableName,
      columnName,
      exists: true,
      columnInfo: data,
      message: `Column '${columnName}' exists in table '${tableName}'`
    });

  } catch (error) {
    console.error("Unexpected error in check-column:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
