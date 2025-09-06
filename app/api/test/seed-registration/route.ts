import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { isE2EWithHelpers } from "../../../lib/env/isE2E";

export const dynamic = "force-dynamic";

/**
 * Test-only seed route for creating registrations in E2E tests
 * Only available when E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 * Does NOT affect core services, domain events, or AC1-AC6 workflows
 */
export async function POST(request: NextRequest) {
  // Check if E2E test mode with helpers is enabled
  if (!isE2EWithHelpers()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email || `smoke_${Date.now()}@test.local`;

    // Server-side admin client with service role (safe here)
    const supabase = getSupabaseServiceClient();

    // Minimal payload for registrations table
    // Based on schema analysis, these are the required NOT NULL columns without defaults
    const payload = {
      registration_id: `SMOKE-${Date.now()}`,
      title: "Mr.",
      first_name: "Smoke",
      last_name: "Test",
      nickname: "smoke",
      phone: "0812345678",
      line_id: "smoke_test",
      email: email,
      company_name: "Smoke Test Company",
      business_type: "Technology",
      yec_province: "Bangkok",
      hotel_choice: "in-quota",
      travel_type: "private-car",
      // Phase 1: New status model
      status: "waiting_for_review" as const,
      // Phase 1: 3-track checklist - all pending initially
      payment_review_status: "pending" as const,
      profile_review_status: "pending" as const,
      tcc_review_status: "pending" as const,
      // Phase 1: Comprehensive review workflow
      review_checklist: {
        payment: {
          status: "pending" as const,
        },
        profile: {
          status: "pending" as const,
        },
        tcc: {
          status: "pending" as const,
        },
      },
      // Phase 1: Pricing fields
      price_applied: 5000,
      currency: "THB",
      selected_package_code: "standard",
      email_sent: false,
      ip_address: request.headers.get("x-forwarded-for") || null,
      user_agent: request.headers.get("user-agent") || null,
      form_data: { test: true },
    };

    const { data, error } = await supabase
      .from("registrations")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[SEED_REGISTRATION] Error:", error);
      return NextResponse.json(
        { ok: false, error: String(error.message || error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
  } catch (error) {
    console.error("[SEED_REGISTRATION] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
