import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

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
    const {
      email,
      dimension: _dimension,
      updates,
      registrationId,
      payload,
    } = body;

    const supabase = getSupabaseServiceClient();

    // Look up registration by email if registrationId not provided
    let registration;
    if (registrationId) {
      const { data: reg, error: fetchError } = await supabase
        .from("registrations")
        .select("id, status, update_reason, review_checklist, registration_id")
        .eq("registration_id", registrationId)
        .single();

      if (fetchError || !reg) {
        return NextResponse.json(
          { error: "Registration not found", details: fetchError },
          { status: 404 },
        );
      }
      registration = reg;
    } else if (email) {
      const { data: reg, error: fetchError } = await supabase
        .from("registrations")
        .select("id, status, update_reason, review_checklist, registration_id")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !reg) {
        return NextResponse.json(
          { error: "Registration not found for email", details: fetchError },
          { status: 404 },
        );
      }
      registration = reg;
    } else {
      return NextResponse.json(
        { error: "Either registrationId or email is required" },
        { status: 400 },
      );
    }

    // Prepare payload for domain function
    const domainPayload = payload || {};

    // If updates are provided, merge them into the payload
    if (updates) {
      Object.assign(domainPayload, updates);
    }

    // Test the domain function directly
    const { data: result, error: domainError } = await (supabase as any).rpc(
      "fn_user_resubmit",
      {
        reg_id: (registration as any).id,
        payload: domainPayload,
      },
    );

    return NextResponse.json({
      ok: true,
      registration: {
        id: (registration as any).id,
        registration_id: (registration as any).registration_id,
        status: (registration as any).status,
        update_reason: (registration as any).update_reason,
        review_checklist: (registration as any).review_checklist,
      },
      domain_result: result,
      domain_error: domainError,
      payload_sent: domainPayload,
    });
  } catch (error) {
    console.error("Test resubmit error:", error);
    return NextResponse.json(
      {
        error: "Test resubmit failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
