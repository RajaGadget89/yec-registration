import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { guardTestEndpoint } from "@/app/lib/test-guard";
import crypto from "crypto";

/**
 * Test helper endpoint to generate deep link tokens for testing
 * Requires TEST_HELPERS_ENABLED=1 and CRON_SECRET authentication
 */
export async function POST(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  try {
    const body = await request.json();
    const { registrationId, dimension } = body;

    // Validate required fields
    if (!registrationId || !dimension) {
      return NextResponse.json(
        {
          error: "Missing required fields: registrationId, dimension",
          code: "MISSING_FIELDS",
        },
        { status: 400 },
      );
    }

    // Validate dimension
    if (!["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        {
          error: "Invalid dimension. Must be 'payment', 'profile', or 'tcc'",
          code: "INVALID_DIMENSION",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // First, look up the registration by registration_id to get the UUID
    const { data: registration, error: lookupError } = await supabase
      .from("registrations")
      .select("id")
      .eq("registration_id", registrationId)
      .single();

    if (lookupError || !registration) {
      return NextResponse.json(
        {
          error: "Registration not found",
          code: "REGISTRATION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Generate a test token
    const testToken = `test-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Hash the token for storage
    const tokenHash = crypto
      .createHmac("sha256", "storage-salt")
      .update(testToken)
      .digest("hex");

    // Store the token in the database
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("deep_link_tokens")
      .insert({
        token_hash: tokenHash,
        registration_id: registration.id,
        dimension: dimension,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tokenError) {
      console.error("Failed to create token:", tokenError);
      return NextResponse.json(
        {
          error: "Failed to create token",
          details: tokenError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      token: testToken,
      tokenRecord: {
        id: tokenRecord.id,
        dimension: tokenRecord.dimension,
        expires_at: tokenRecord.expires_at,
        created_at: tokenRecord.created_at,
      },
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      {
        error: "Token generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
