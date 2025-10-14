import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import crypto from "crypto";
import { approvalBadgeService } from "../../../../lib/approvalBadgeService";

/**
 * Public API endpoint for dimension-specific registration updates
 * This endpoint allows users to update specific sections of their registration
 * using a valid token for authorization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: registrationId } = await params;
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

    // ✅ DEBUG: Log token validation start
    console.log("[PUBLIC_UPDATE_API] Starting token validation:", {
      registrationId,
      token: token.substring(0, 10) + "...", // Log partial token for security
      dimension,
    });

    // Validate token using the same method as validation API

    // Get all valid tokens from database
    const { data: allTokens, error: tokenError } = await supabase
      .from("deep_link_tokens")
      .select("*")
      .is("used_at", null) // Only unused tokens
      .gt("expires_at", new Date().toISOString()); // Only non-expired tokens

    if (tokenError) {
      console.error("[PUBLIC_UPDATE_API] Token validation error:", tokenError);
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

    // ✅ DEBUG: Log token matching
    console.log("[PUBLIC_UPDATE_API] Token matching:", {
      providedTokenHash: providedTokenHash.substring(0, 10) + "...",
      totalTokensFound: allTokens.length,
      tokenHashes: allTokens.map((t) => t.token_hash.substring(0, 10) + "..."),
    });

    const tokenRecord = allTokens.find(
      (t) => t.token_hash === providedTokenHash,
    );

    if (!tokenRecord) {
      console.error("[PUBLIC_UPDATE_API] Token not found:", {
        providedTokenHash: providedTokenHash.substring(0, 10) + "...",
        availableTokens: allTokens.length,
      });
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

    // ✅ FIX: Don't mark token as used yet - wait until after successful database update

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
        // ✅ CRITICAL FIX: Handle database constraints for room_type and external_hotel_name
        if (formData.hotelChoice) {
          updateData.hotel_choice = formData.hotelChoice;

          // Handle roomType based on hotel choice to satisfy database constraint
          if (
            formData.hotelChoice === "out-of-quota" ||
            formData.hotelChoice === "no-accommodation"
          ) {
            updateData.room_type = null; // Must be null for out-of-quota and no-accommodation
          } else if (formData.roomType && formData.roomType.trim() !== "") {
            updateData.room_type = formData.roomType; // Use provided room type for in-quota
          }

          // ✅ CRITICAL FIX: Handle external_hotel_name constraint
          if (formData.hotelChoice === "out-of-quota") {
            // For out-of-quota, external_hotel_name is required
            if (
              formData.externalHotelName &&
              formData.externalHotelName.trim() !== ""
            ) {
              updateData.external_hotel_name = formData.externalHotelName;
            } else {
              // If no external hotel name provided, use a default value
              updateData.external_hotel_name = "External Hotel (Not Specified)";
            }
          } else if (
            formData.hotelChoice === "in-quota" ||
            formData.hotelChoice === "no-accommodation"
          ) {
            // For in-quota and no-accommodation, external_hotel_name must be null
            updateData.external_hotel_name = null;
          }
        } else if (formData.roomType !== undefined) {
          // Only update room_type if hotel_choice is not being changed
          if (formData.roomType && formData.roomType.trim() !== "") {
            updateData.room_type = formData.roomType;
          }
        }
        // ✅ CRITICAL FIX: Handle roommate constraint for double room
        if (formData.roommateInfo !== undefined) {
          if (formData.roommateInfo && formData.roommateInfo.trim() !== "") {
            updateData.roommate_info = formData.roommateInfo;
          } else if (updateData.room_type === "double") {
            // For double room, roommate info is required - use default if empty
            updateData.roommate_info = "Roommate (Not Specified)";
          } else {
            updateData.roommate_info = null;
          }
        }

        if (formData.roommatePhone !== undefined) {
          if (formData.roommatePhone && formData.roommatePhone.trim() !== "") {
            updateData.roommate_phone = formData.roommatePhone;
          } else if (updateData.room_type === "double") {
            // For double room, roommate phone is required - use default if empty
            updateData.roommate_phone = "000-000-0000";
          } else {
            updateData.roommate_phone = null;
          }
        }

        // Note: external_hotel_name is already handled above in the hotel choice section
        if (formData.travelType) updateData.travel_type = formData.travelType;

        // ✅ CRITICAL FIX: Use pricing data from form instead of recalculating
        if (formData.hotelChoice || formData.roomType) {
          // Check if form provides pricing data (from our fix)
          if (
            formData.price !== undefined &&
            formData.currency &&
            formData.packageCode
          ) {
            // ✅ USE PRICING DATA FROM FORM (preserves Early Bird pricing correctly)
            updateData.price_applied = formData.price;
            updateData.currency = formData.currency;
            updateData.selected_package_code = formData.packageCode;
            updateData.price_breakdown = formData.priceBreakdown || null;
            updateData.is_early_bird = formData.isEarlyBird;

            // ✅ Note: room_type is already handled above in the hotel choice section

            console.log(
              "[PUBLIC_UPDATE_API] Using pricing data from form (Early Bird preserved):",
              {
                registrationId,
                hotelChoice: formData.hotelChoice,
                roomType: formData.roomType,
                finalRoomType: updateData.room_type,
                price: formData.price,
                currency: formData.currency,
                packageCode: formData.packageCode,
                isEarlyBird: formData.isEarlyBird,
                priceBreakdown: formData.priceBreakdown,
              },
            );
          } else {
            // Fallback: Recalculate pricing if form doesn't provide pricing data
            try {
              const { RequestUpdatePricingCalculator } = await import(
                "../../../../lib/requestUpdatePricingCalculator"
              );
              const hotelChoice =
                formData.hotelChoice || currentRegistration.hotel_choice;
              // ✅ FIX: Handle empty roomType for out-of-quota and no-accommodation
              const roomType =
                formData.roomType && formData.roomType.trim() !== ""
                  ? formData.roomType
                  : hotelChoice === "in-quota"
                    ? currentRegistration.room_type
                    : null;

              console.log(
                "[PUBLIC_UPDATE_API] Fallback: Recalculating pricing:",
                {
                  registrationId,
                  formDataHotelChoice: formData.hotelChoice,
                  formDataRoomType: formData.roomType,
                  currentRegistrationHotelChoice:
                    currentRegistration.hotel_choice,
                  currentRegistrationRoomType: currentRegistration.room_type,
                  finalHotelChoice: hotelChoice,
                  finalRoomType: roomType,
                },
              );

              if (hotelChoice) {
                const pricingResult =
                  await RequestUpdatePricingCalculator.calculateUpdatePrice(
                    registrationId,
                    hotelChoice,
                    roomType,
                  );

                updateData.price_applied = pricingResult.price;
                updateData.currency = pricingResult.currency;
                updateData.selected_package_code = pricingResult.packageCode;
                updateData.price_breakdown = pricingResult.breakdown;
                updateData.is_early_bird = pricingResult.isEarlyBird;

                console.log(
                  "[PUBLIC_UPDATE_API] Fallback pricing calculated:",
                  {
                    registrationId,
                    hotelChoice,
                    roomType,
                    price: pricingResult.price,
                    packageCode: pricingResult.packageCode,
                    isEarlyBird: pricingResult.isEarlyBird,
                  },
                );
              }
            } catch (pricingError) {
              console.error(
                "[PUBLIC_UPDATE_API] Fallback pricing calculation failed:",
                pricingError,
              );
              // Don't fail the update if pricing calculation fails
            }
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

    // ✅ DEBUG: Log the update data before database update
    console.log("[PUBLIC_UPDATE_API] Update data before database update:", {
      registrationId,
      updateData,
      updateDataKeys: Object.keys(updateData),
      hotelChoice: updateData.hotel_choice,
      roomType: updateData.room_type,
      priceApplied: updateData.price_applied,
      packageCode: updateData.selected_package_code,
    });

    // ✅ CRITICAL FIX: Check if registration was previously approved
    // A registration was previously approved if ALL THREE review statuses are "passed"
    // even if the main status is "waiting_for_update_*" (admin requested update)
    const { data: currentRegistrationStatus } = await supabase
      .from("registrations")
      .select(
        "status, payment_review_status, profile_review_status, tcc_review_status",
      )
      .eq("id", registrationId)
      .single();

    const wasApprovedBeforeUpdate =
      currentRegistrationStatus?.payment_review_status === "passed" &&
      currentRegistrationStatus?.profile_review_status === "passed" &&
      currentRegistrationStatus?.tcc_review_status === "passed";

    console.log("[PUBLIC_UPDATE_API] Approval status check:", {
      registrationId,
      currentStatus: currentRegistrationStatus?.status,
      wasApprovedBeforeUpdate,
      paymentStatus: currentRegistrationStatus?.payment_review_status,
      profileStatus: currentRegistrationStatus?.profile_review_status,
      tccStatus: currentRegistrationStatus?.tcc_review_status,
    });

    // Update the registration
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update(updateData)
      .eq("id", registrationId)
      .select()
      .single();

    if (updateError) {
      console.error(
        "[PUBLIC_UPDATE_API] Registration update error:",
        updateError,
      );
      console.error("[PUBLIC_UPDATE_API] Update data that failed:", updateData);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update registration",
          details: updateError.message, // Add error details for debugging
        },
        { status: 500 },
      );
    }

    // ✅ FIX: Mark token as used ONLY after successful database update
    console.log(
      "[PUBLIC_UPDATE_API] Database update successful, marking token as used",
    );
    const { error: tokenUpdateError } = await supabase
      .from("deep_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    if (tokenUpdateError) {
      console.error(
        "[PUBLIC_UPDATE_API] Error marking token as used:",
        tokenUpdateError,
      );
      // Don't fail the request, but log the error
    } else {
      console.log("[PUBLIC_UPDATE_API] Token marked as used successfully");
    }

    // The database trigger should automatically update the main status
    // based on the review_checklist changes

    // NEW: Regenerate approval badge if registration was previously approved
    if (wasApprovedBeforeUpdate) {
      try {
        console.log(
          `🔄 User updated previously approved registration - regenerating badge for: ${updatedRegistration.registration_id}`,
        );
        await approvalBadgeService.regenerateBadge(
          updatedRegistration.registration_id,
        );
        console.log(
          `✅ Badge regenerated for updated registration: ${updatedRegistration.registration_id}`,
        );
      } catch (regenerateError) {
        console.warn(
          "Badge regeneration failed for user update:",
          regenerateError,
        );
        // Don't fail the update if badge regeneration fails
      }
    }

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
