import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertDbRouting } from "../../../../lib/env-guards";
import { isE2E } from "../../../../lib/env/isE2E";

export const dynamic = "force-dynamic";

/**
 * Test-only endpoint to get the most recent registration with status 'waiting_for_review'
 * Only works when E2E_TEST_MODE=true
 */
export async function GET() {
  // Check if E2E test mode is enabled
  if (!isE2E()) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    // Create Supabase service client
    assertDbRouting();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get the most recent registration with status 'waiting_for_review'
    const { data: registrations, error } = await supabase
      .from("registrations")
      .select("id, registration_id, email, status")
      .eq("status", "waiting_for_review")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[test/registrations/one] database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { error: "No registrations found with status 'waiting_for_review'" },
        { status: 404 },
      );
    }

    const registration = registrations[0];

    return NextResponse.json({
      id: registration.id, // Return the UUID id field, not registration_id
      registration_id: registration.registration_id, // Also include registration_id for reference
      email: registration.email,
      status: registration.status,
    });
  } catch (error) {
    console.error("[test/registrations/one] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
