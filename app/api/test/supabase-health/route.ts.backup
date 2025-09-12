import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * Supabase Health Check Endpoint
 * Tests connectivity and basic functionality of Supabase
 * Only available in development and E2E test environments
 */
export async function GET() {
  // Only allow in development or E2E test mode
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TEST_MODE) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const supabase = getSupabaseServiceClient();

    // Test basic connectivity by checking if we can query the database
    const { error } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { health: "error", error: error.message },
        { status: 500 },
      );
    }

    // Test authentication service
    const { error: authError } = await supabase.auth.getSession();

    if (authError) {
      return NextResponse.json(
        { health: "error", error: `Auth service error: ${authError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ health: "ok" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { health: "error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
