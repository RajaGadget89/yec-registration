import { NextRequest, NextResponse } from "next/server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import { isE2E } from "../../../../../lib/env/isE2E";

/**
 * Debug endpoint to show registration count with/without RLS bypass
 * Only works when E2E_TEST_MODE=true
 *
 * Headers:
 * - X-E2E-RLS-BYPASS: 1 (optional) - Use service client to bypass RLS
 */
export async function GET(request: NextRequest) {
  // Check if E2E test mode is enabled
  if (!isE2E()) {
    return NextResponse.json(
      { error: "E2E test mode not enabled" },
      { status: 403 },
    );
  }

  try {
    // Get appropriate Supabase client (service client if bypass header present)
    const supabase = await maybeServiceClient(request);

    // Count registrations
    const { count, error } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error counting registrations:", error);
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 },
      );
    }

    const response = {
      count: count || 0,
      bypassEnabled: request.headers.get("X-E2E-RLS-BYPASS") === "1",
      e2eMode: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in registrations count endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
