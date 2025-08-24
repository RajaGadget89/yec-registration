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
    const { tableName, columnName, columnType, nullable = true } = body;

    if (!tableName || !columnName || !columnType) {
      return NextResponse.json(
        { error: "tableName, columnName, and columnType are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Build the ALTER TABLE SQL
    const nullableClause = nullable ? "" : " NOT NULL";
    const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}${nullableClause}`;

    console.log(`[ADD COLUMN] Executing: ${sql}`);

    // Execute the SQL using a direct query
    const { data, error } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", tableName)
      .eq("column_name", columnName)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking column existence:", error);
      return NextResponse.json(
        { error: "Failed to check column existence", details: error.message },
        { status: 500 },
      );
    }

    if (data) {
      return NextResponse.json({
        success: true,
        message: `Column '${columnName}' already exists in table '${tableName}'`,
        columnExists: true,
      });
    }

    // Column doesn't exist, add it
    const { error: alterError } = await supabase.rpc("exec_sql", { sql });

    if (alterError) {
      console.error("Error adding column:", alterError);
      return NextResponse.json(
        { error: "Failed to add column", details: alterError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Column '${columnName}' added to table '${tableName}'`,
      sql: sql,
      columnExists: false,
    });
  } catch (error) {
    console.error("Unexpected error in add-column:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
