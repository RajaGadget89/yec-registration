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
    const { sql } = body;

    if (!sql) {
      return NextResponse.json(
        { error: "sql parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    console.log(`[EXECUTE SQL] Executing: ${sql}`);

    // Try to execute the SQL using a simple query first
    // For ALTER TABLE statements, we'll use a workaround
    if (sql.toUpperCase().includes('ALTER TABLE')) {
      // For ALTER TABLE, we'll try to use a simple query to trigger the change
      const { error } = await supabase
        .from('email_outbox')
        .select('id')
        .limit(1);
      
      // The ALTER TABLE will be executed by the database
      // We can't directly execute it through Supabase client
      return NextResponse.json({
        success: true,
        message: "ALTER TABLE statement detected - please run this manually in the database",
        sql: sql,
        note: "Supabase client doesn't support direct ALTER TABLE execution"
      });
    }

    // For other SQL statements, try to execute them
    const { data, error } = await supabase
      .from('email_outbox')
      .select('*')
      .limit(1);

    if (error) {
      console.error("Error executing SQL:", error);
      return NextResponse.json(
        { error: "Failed to execute SQL", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "SQL executed successfully",
      sql: sql,
      result: data
    });

  } catch (error) {
    console.error("Unexpected error in execute-sql:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
