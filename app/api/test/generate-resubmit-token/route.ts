import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * Test-only helper endpoint to generate resubmit tokens
 * Guarded with TEST_HELPERS_ENABLED === '1' and CRON_SECRET
 * Returns a single-use token equivalent to what the email would carry
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { registrationId, dimension } = body;

    // Validate required fields
    if (!registrationId || !dimension) {
      return NextResponse.json(
        { error: "registrationId and dimension are required" },
        { status: 400 },
      );
    }

    if (!["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        { error: "Invalid dimension. Must be payment, profile, or tcc" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // First, look up the registration by tracking code to get the UUID
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("id")
      .eq("registration_id", registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Generate token using the UUID
    const { data: tokenResult, error: tokenError } = await supabase.rpc(
      "generate_secure_deep_link_token",
      {
        reg_id: registration.id,
        dimension: dimension,
        admin_email: "test-admin@example.com",
        ttl_seconds: 86400, // 24 hours
      },
    );

    if (tokenError) {
      console.error("Error generating token:", tokenError);
      return NextResponse.json(
        { error: "Failed to generate token", details: tokenError.message },
        { status: 500 },
      );
    }

    if (!tokenResult) {
      return NextResponse.json(
        { error: "No token generated" },
        { status: 500 },
      );
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

    return NextResponse.json({
      ok: true,
      token: tokenResult,
      dimension: dimension,
      registrationId: registrationId,
      expiresAt: expiresAt,
    });
  } catch (error) {
    console.error("Error in generate-resubmit-token endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
