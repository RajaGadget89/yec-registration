import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import crypto from "crypto";

/**
 * Public API endpoint for dimension-specific registration updates
 * This endpoint allows users to update specific sections of their registration
 * using a valid token for authorization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const registrationId = params.id;
    const body = await request.json();
    const { token, dimension, formData } = body;

    // Validate required parameters
    if (!token || !dimension || !formData) {
      return NextResponse.json(
        {
          success: false,
          error: "Token, dimension, and formData are required",
        },
        { status: 400 },
      );
    }

    // Validate dimension
    if (!["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid dimension. Must be payment, profile, or tcc",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Validate token using the same method as validation API

    // Get all valid tokens from database
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
    const tokenRecord = allTokens.find(
      (t) => t.token_hash === providedTokenHash,
    );

    if (!tokenRecord) {
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
    const expiresAt = new Date(tokenRecord.expires_at);
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
    if (tokenRecord.used_at) {
      return NextResponse.json(
        {
          success: false,
          error: "Token has already been used",
        },
        { status: 401 },
      );
    }

    // Verify the token is for the correct registration and dimension
    if (
      tokenRecord.registration_id !== registrationId ||
      tokenRecord.dimension !== dimension
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Token mismatch",
        },
        { status: 403 },
      );
    }

    // Mark token as used (single-use)
    const { error: tokenUpdateError } = await supabase
      .from("deep_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    if (tokenUpdateError) {
      console.error("Error marking token as used:", tokenUpdateError);
      // Don't fail the request, but log the error
    }

    // Get current registration
    const { data: currentRegistration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (fetchError || !currentRegistration) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration not found",
        },
        { status: 404 },
      );
    }

    // Prepare update data based on dimension
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update specific fields based on dimension
    switch (dimension) {
      case "payment":
        if (formData.paymentSlip) {
          // Handle file upload - this would need to be implemented
          // For now, we'll assume the file URL is provided
          updateData.payment_slip_url = formData.paymentSlip;
        }

        // Handle hotel choice fields for payment dimension (moved from profile)
        if (formData.hotelChoice)
          updateData.hotel_choice = formData.hotelChoice;
        if (formData.roomType) updateData.room_type = formData.roomType;
        if (formData.roommateInfo)
          updateData.roommate_info = formData.roommateInfo;
        if (formData.roommatePhone)
          updateData.roommate_phone = formData.roommatePhone;
        if (formData.externalHotelName)
          updateData.external_hotel_name = formData.externalHotelName;

        // Recalculate pricing if hotel choice changed
        if (formData.hotelChoice || formData.roomType) {
          try {
            const { DynamicPricingCalculator } = await import(
              "../../../../lib/dynamicPricingCalculator"
            );
            const hotelChoice =
              formData.hotelChoice || currentRegistration.hotel_choice;
            const roomType = formData.roomType || currentRegistration.room_type;

            if (hotelChoice) {
              // ✅ PRESERVE ORIGINAL REGISTRATION TIME for early bird pricing
              const originalRegistrationTime = new Date(
                currentRegistration.created_at,
              );

              const pricingResult =
                await DynamicPricingCalculator.calculatePriceWithOriginalTime(
                  hotelChoice,
                  roomType,
                  originalRegistrationTime,
                );

              updateData.price_applied = pricingResult.price;
              updateData.currency = pricingResult.currency;
              updateData.selected_package_code = pricingResult.packageCode;
              updateData.price_breakdown = pricingResult.breakdown;
              updateData.is_early_bird = pricingResult.isEarlyBird;

              console.log(
                "[PUBLIC_UPDATE_API] Pricing recalculated preserving original registration time:",
                {
                  hotelChoice,
                  roomType,
                  originalRegistrationTime:
                    originalRegistrationTime.toISOString(),
                  price: pricingResult.price,
                  packageCode: pricingResult.packageCode,
                  isEarlyBird: pricingResult.isEarlyBird,
                },
              );
            }
          } catch (pricingError) {
            console.error(
              "[PUBLIC_UPDATE_API] Pricing recalculation failed:",
              pricingError,
            );
            // Don't fail the update if pricing calculation fails
          }
        }
        break;

      case "profile":
        // Update profile information fields
        if (formData.firstName) updateData.first_name = formData.firstName;
        if (formData.lastName) updateData.last_name = formData.lastName;
        if (formData.nickname) updateData.nickname = formData.nickname;
        if (formData.phone) updateData.phone = formData.phone;
        if (formData.lineId) updateData.line_id = formData.lineId;
        if (formData.email) updateData.email = formData.email;
        if (formData.companyName)
          updateData.company_name = formData.companyName;
        if (formData.businessType)
          updateData.business_type = formData.businessType;
        if (formData.businessTypeOther)
          updateData.business_type_other = formData.businessTypeOther;
        if (formData.yecProvince)
          updateData.yec_province = formData.yecProvince;
        if (formData.travelType) updateData.travel_type = formData.travelType;
        if (formData.profileImage)
          updateData.profile_image_url = formData.profileImage;
        break;

      case "tcc":
        if (formData.chamberCard) {
          updateData.chamber_card_url = formData.chamberCard;
        }
        if (formData.tccNumber) updateData.tcc_number = formData.tccNumber;
        if (formData.tccHolderName)
          updateData.tcc_holder_name = formData.tccHolderName;
        break;
    }

    // Update the review checklist to set the dimension back to pending
    const currentChecklist = currentRegistration.review_checklist || {
      payment: { status: "pending" },
      profile: { status: "pending" },
      tcc: { status: "pending" },
    };

    // Reset the updated dimension to pending
    currentChecklist[dimension] = {
      status: "pending",
      notes: null, // Clear any previous notes
    };

    updateData.review_checklist = currentChecklist;

    // Update the registration
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update(updateData)
      .eq("id", registrationId)
      .select()
      .single();

    if (updateError) {
      console.error("Registration update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update registration",
        },
        { status: 500 },
      );
    }

    // The database trigger should automatically update the main status
    // based on the review_checklist changes

    return NextResponse.json({
      success: true,
      registration: {
        id: updatedRegistration.id,
        registration_id: updatedRegistration.registration_id,
        status: updatedRegistration.status,
        update_reason: updatedRegistration.update_reason,
        review_checklist: updatedRegistration.review_checklist,
      },
      dimension: dimension,
      message: `Successfully updated ${dimension} dimension. Status set to pending for review.`,
    });
  } catch (error) {
    console.error("Registration update API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
