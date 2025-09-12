import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Registration ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Look up the registration by ID
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select(
        "id, email, status, registration_id, profile_review_status, tcc_review_status, payment_review_status, created_at, updated_at",
      )
      .eq("id", id)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: (registration as any).id,
      registration_id: (registration as any).registration_id,
      email: (registration as any).email,
      status: (registration as any).status,
      registration_status: (registration as any).status, // Alias for compatibility
      profile_review_status: (registration as any).profile_review_status,
      tcc_review_status: (registration as any).tcc_review_status,
      payment_review_status: (registration as any).payment_review_status,
      created_at: (registration as any).created_at,
      updated_at: (registration as any).updated_at,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
