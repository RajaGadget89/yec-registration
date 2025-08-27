import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { isE2E } from "../../../lib/env/isE2E";

export async function POST(request: NextRequest) {
  // Check if E2E test mode is enabled
  if (!isE2E()) {
    return new Response("Forbidden", { status: 403 });
  }

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
    const { functionName, params } = body;

    if (!functionName) {
      return NextResponse.json(
        { error: "functionName is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Call the database function
    const { data, error } = await supabase.rpc(functionName, params || {});

    if (error) {
      console.error(`Error calling database function ${functionName}:`, error);
      return NextResponse.json(
        {
          error: `Failed to call database function ${functionName}`,
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      functionName,
      params,
      result: data,
      message: `Database function ${functionName} called successfully`,
    });
  } catch (error) {
    console.error("Unexpected error in call-db-function:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
