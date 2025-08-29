import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { guardTestEndpoint } from "@/app/lib/test-guard";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  try {
    const body = await request.json();
    const { token: tokenToCheck, registrationId } = body;

    if (!tokenToCheck || !registrationId) {
      return NextResponse.json(
        { error: "token and registrationId are required" },
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

    // Generate the token hash that would be stored (same as in the database function)
    // The database function uses: encode(hmac(token, 'storage-salt', 'sha256'), 'hex')

    const tokenHash = crypto
      .createHmac("sha256", "storage-salt")
      .update(tokenToCheck)
      .digest("hex");

    // Check if token exists in database
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("deep_link_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("registration_id", registration.id)
      .single();

    if (tokenError) {
      return NextResponse.json({
        token_exists: false,
        error: tokenError.message,
        token_hash: tokenHash,
        registration_id: registration.id,
      });
    }

    return NextResponse.json({
      token_exists: true,
      token_record: tokenRecord,
      token_hash: tokenHash,
      registration_id: registration.id,
    });
  } catch (error) {
    console.error("Check token error:", error);
    return NextResponse.json(
      {
        error: "Check token failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
