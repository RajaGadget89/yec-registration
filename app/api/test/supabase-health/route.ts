import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../lib/auth-client";

/**
 * Supabase Health Check Endpoint
 * Tests connectivity and basic functionality of Supabase
 * Only available in development and E2E test environments
 */
export async function GET(request: NextRequest) {
  // Only allow in development or E2E test mode
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TEST_MODE) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const supabase = getSupabaseAuth();
    
    // Test basic connectivity by checking if we can query the database
    const { data, error } = await supabase
      .from('admin_users')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({
        status: "unhealthy",
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    // Test authentication service
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      return NextResponse.json({
        status: "partially_healthy",
        database: "healthy",
        auth: "unhealthy",
        authError: authError.message
      }, { status: 200 });
    }

    return NextResponse.json({
      status: "healthy",
      database: "healthy",
      auth: "healthy",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
