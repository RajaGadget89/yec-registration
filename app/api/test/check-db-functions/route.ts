import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.TEST_HELPERS_ENABLED === "1" ||
    process.env.E2E_TESTS === "true" ||
    request.headers.get("X-Test-Helpers-Enabled") === "1";
  
  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
  }

  // CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Invalid CRON_SECRET" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServiceClient();

    // Check if deep_link_tokens table exists
    const { error: tokensError } = await supabase
      .from("deep_link_tokens")
      .select("*")
      .limit(1);

    // Check if generate_secure_deep_link_token function exists
    let generateFunctionExists = false;
    try {
      const { data: generateTest } = await supabase.rpc(
        "generate_secure_deep_link_token",
        {
          reg_id: "00000000-0000-0000-0000-000000000000",
          dimension: "profile",
          admin_email: "test@example.com",
          ttl_seconds: 3600,
        },
      );
      // If we get here, the function exists (even if it fails due to invalid UUID)
      generateFunctionExists = true;
    } catch {
      // Function might not exist or have different signature
      generateFunctionExists = false;
    }

    // Check if validate_and_consume_deep_link_token function exists
    let validateFunctionExists = false;
    try {
      const { data: validateTest } = await supabase.rpc(
        "validate_and_consume_deep_link_token",
        {
          token: "test",
          reg_id: "00000000-0000-0000-0000-000000000000",
          user_email: null,
          ip_address: null,
          user_agent: null,
        },
      );
      // If we get here, the function exists (even if it fails due to invalid token)
      validateFunctionExists = true;
    } catch {
      // Function might not exist or have different signature
      validateFunctionExists = false;
    }

    // Check if fn_user_resubmit function exists
    let resubmitFunctionExists = false;
    try {
      const { data: resubmitTest } = await supabase.rpc(
        "fn_user_resubmit",
        {
          reg_id: "00000000-0000-0000-0000-000000000000",
          payload: {},
        },
      );
      // If we get here, the function exists (even if it fails due to invalid UUID)
      resubmitFunctionExists = true;
    } catch {
      // Function might not exist or have different signature
      resubmitFunctionExists = false;
    }

    return NextResponse.json({
      deep_link_tokens_table: tokensError ? { exists: false, error: tokensError.message } : { exists: true },
      generate_secure_deep_link_token_function: generateFunctionExists,
      validate_and_consume_deep_link_token_function: validateFunctionExists,
      fn_user_resubmit_function: resubmitFunctionExists,
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL ? "SET" : "NOT_SET",
        SUPABASE_ENV: process.env.SUPABASE_ENV,
      },
    });
  } catch (error) {
    console.error("Check DB functions error:", error);
    return NextResponse.json(
      {
        error: "Check DB functions failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
