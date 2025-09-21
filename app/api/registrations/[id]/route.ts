import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

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

    // Fetch registration data by ID
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select(
        `
        id,
        registration_id,
        first_name,
        last_name,
        nickname,
        phone,
        line_id,
        email,
        company_name,
        business_type,
        business_type_other,
        yec_province,
        hotel_choice,
        room_type,
        roommate_info,
        roommate_phone,
        external_hotel_name,
        travel_type,
        profile_image_url,
        chamber_card_url,
        payment_slip_url,
        status,
        update_reason,
        review_checklist,
        price_applied,
        selected_package_code,
        price_breakdown,
        is_early_bird,
        created_at,
        updated_at
      `,
      )
      .eq("id", id)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(registration);
  } catch (error) {
    console.error("Error fetching registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
