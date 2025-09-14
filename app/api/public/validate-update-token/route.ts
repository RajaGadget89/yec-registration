import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import crypto from "crypto";

/**
 * Public API endpoint to validate update tokens and return registration info
 * This endpoint is used by the registration form to validate tokens and get dimension info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Token parameter is required",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Validate token using a simple approach - check all tokens and find matching hash
    // The generate_simple_deep_link_token stores double-hashed tokens in token_hash
    const { data: allTokens, error: tokenError } = await supabase
      .from("deep_link_tokens")
      .select("*")
      .is("used_at", null) // Only unused tokens
      .gt("expires_at", new Date().toISOString()); // Only non-expired tokens

    if (tokenError) {
      console.error("Token validation error:", tokenError);
      return NextResponse.json(
        {
          success: false,
          error: "Token validation failed",
        },
        { status: 500 },
      );
    }

    if (!allTokens || allTokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid tokens found",
        },
        { status: 401 },
      );
    }

    // Find the matching token by hashing the provided token
    const providedTokenHash = crypto
      .createHmac("sha256", "storage-salt")
      .update(token)
      .digest("hex");

    const tokenRecords = allTokens.find(
      (t) => t.token_hash === providedTokenHash,
    );

    if (!tokenRecords) {
      return NextResponse.json(
        {
          success: false,
          error: "Token not found or invalid",
        },
        { status: 401 },
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRecords.expires_at);
    if (expiresAt < now) {
      return NextResponse.json(
        {
          success: false,
          error: "Token has expired",
        },
        { status: 401 },
      );
    }

    // Check if token has already been used
    if (tokenRecords.used_at) {
      return NextResponse.json(
        {
          success: false,
          error: "Token has already been used",
        },
        { status: 401 },
      );
    }

    // Extract registration ID and dimension from token data
    const registrationId = tokenRecords.registration_id;
    const dimension = tokenRecords.dimension;

    if (!registrationId || !dimension) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token data",
        },
        { status: 400 },
      );
    }

    // Fetch registration data (read-only, token-authorized)
    const { data: registration, error: regError } = await supabase
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
        created_at,
        updated_at
      `,
      )
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("Registration fetch error:", regError);
      return NextResponse.json(
        {
          success: false,
          error: "Registration not found",
        },
        { status: 404 },
      );
    }

    // Return token validation result with registration data
    return NextResponse.json({
      success: true,
      token: {
        valid: true,
        registration_id: registrationId,
        dimension: dimension,
        expires_at: tokenRecords.expires_at,
      },
      registration: {
        id: registration.id,
        registration_id: registration.registration_id,
        first_name: registration.first_name,
        last_name: registration.last_name,
        nickname: registration.nickname,
        phone: registration.phone,
        line_id: registration.line_id,
        email: registration.email,
        company_name: registration.company_name,
        business_type: registration.business_type,
        business_type_other: registration.business_type_other,
        yec_province: registration.yec_province,
        hotel_choice: registration.hotel_choice,
        room_type: registration.room_type,
        roommate_info: registration.roommate_info,
        roommate_phone: registration.roommate_phone,
        external_hotel_name: registration.external_hotel_name,
        travel_type: registration.travel_type,
        profile_image_url: registration.profile_image_url,
        chamber_card_url: registration.chamber_card_url,
        payment_slip_url: registration.payment_slip_url,
        status: registration.status,
        update_reason: registration.update_reason,
        review_checklist: registration.review_checklist,
        price_applied: registration.price_applied,
        selected_package_code: registration.selected_package_code,
      },
      dimension: dimension,
      message: `Token validated successfully for ${dimension} dimension update`,
    });
  } catch (error) {
    console.error("Token validation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
