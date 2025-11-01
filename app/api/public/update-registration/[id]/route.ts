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
        // Get current hotel_choice from existing registration to handle constraint when hotel_choice is not being updated
        const currentHotelChoice = currentRegistration.hotel_choice;
        const effectiveHotelChoice = formData.hotelChoice || currentHotelChoice;

        if (formData.hotelChoice) {
          // ✅ CRITICAL FIX: Map 'no-accommodation' to 'out-of-quota' for database
          // The database only accepts 'in-quota' or 'out-of-quota', but form can send 'no-accommodation'
          const dbHotelChoice =
            formData.hotelChoice === "no-accommodation"
              ? "out-of-quota"
              : formData.hotelChoice;

          updateData.hotel_choice = dbHotelChoice;

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
          if (formData.hotelChoice === "no-accommodation") {
            // For 'no-accommodation' (mapped to 'out-of-quota' in DB), use special default value
            updateData.external_hotel_name = "ไม่ต้องการที่พัก";
          } else if (formData.hotelChoice === "out-of-quota") {
            // For out-of-quota, external_hotel_name is required
            if (
              formData.externalHotelName &&
              formData.externalHotelName.trim() !== ""
            ) {
              updateData.external_hotel_name = formData.externalHotelName;
            } else {
              // If no external hotel name provided, use existing value or default
              updateData.external_hotel_name =
                currentRegistration.external_hotel_name ||
                "External Hotel (Not Specified)";
            }
          } else if (formData.hotelChoice === "in-quota") {
            // For in-quota, external_hotel_name must be null
            updateData.external_hotel_name = null;
          }
        } else {
          // ✅ CRITICAL FIX: Hotel choice is not being updated, but we need to ensure constraint is satisfied
          // If existing hotel_choice is out-of-quota, ensure external_hotel_name is not null
          if (currentHotelChoice === "out-of-quota") {
            // Preserve existing external_hotel_name if it exists, otherwise set default
            if (!currentRegistration.external_hotel_name) {
              updateData.external_hotel_name = "External Hotel (Not Specified)";
            }
            // If external_hotel_name is provided in form, use it
            if (
              formData.externalHotelName &&
              formData.externalHotelName.trim() !== ""
            ) {
              updateData.external_hotel_name = formData.externalHotelName;
            }
          } else if (currentHotelChoice === "in-quota") {
            // Ensure external_hotel_name is null for in-quota
            // Note: Database doesn't store 'no-accommodation', it's stored as 'out-of-quota' with special external_hotel_name
            if (currentRegistration.external_hotel_name) {
              updateData.external_hotel_name = null;
            }
          }
          // Note: If currentHotelChoice is 'out-of-quota', it's already handled above

          // Handle roomType if provided
          if (formData.roomType !== undefined) {
            if (formData.roomType && formData.roomType.trim() !== "") {
              updateData.room_type = formData.roomType;
            } else if (
              effectiveHotelChoice === "out-of-quota" ||
              effectiveHotelChoice === "no-accommodation"
            ) {
              updateData.room_type = null;
            }
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
        // ✅ CRITICAL: yec_province is intentionally excluded from updates
        // Province changes affect registration tracking numbers and tracking system integrity
        // The field is hidden in the update form UI and any attempts to update it are ignored
        // if (formData.yecProvince) updateData.yec_province = formData.yecProvince;
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

    // ✅ CRITICAL FIX: Ensure external_hotel_name constraint is satisfied before update
    // Check if hotel_choice will be 'out-of-quota' after update
    // Note: 'no-accommodation' from form is already mapped to 'out-of-quota' in updateData.hotel_choice above
    const finalHotelChoice =
      updateData.hotel_choice || currentRegistration.hotel_choice;

    // Always check constraint regardless of which fields are being updated
    // The database only accepts 'in-quota' or 'out-of-quota', so finalHotelChoice should never be 'no-accommodation' here
    if (finalHotelChoice === "out-of-quota") {
      // For out-of-quota, external_hotel_name MUST be set (not null) and have length > 0
      // Check if external_hotel_name is in updateData
      const hasExternalHotelInUpdate = "external_hotel_name" in updateData;
      const currentExternalHotel = currentRegistration.external_hotel_name;

      if (!hasExternalHotelInUpdate) {
        // external_hotel_name is not being updated, so we need to ensure existing value is valid
        if (!currentExternalHotel || currentExternalHotel.trim() === "") {
          // Existing value is invalid, must set a default
          updateData.external_hotel_name = "External Hotel (Not Specified)";
          console.log(
            "[PUBLIC_UPDATE_API] Auto-setting external_hotel_name for out-of-quota constraint (existing was empty):",
            updateData.external_hotel_name,
          );
        } else {
          // Existing value is valid, explicitly preserve it in updateData
          // This is critical when updating other fields (like travel_type) while hotel_choice stays 'out-of-quota'
          updateData.external_hotel_name = currentExternalHotel;
          console.log(
            "[PUBLIC_UPDATE_API] Preserving existing external_hotel_name for out-of-quota constraint:",
            currentExternalHotel,
          );
        }
      } else {
        // external_hotel_name is in updateData, validate it
        if (
          !updateData.external_hotel_name ||
          (typeof updateData.external_hotel_name === "string" &&
            updateData.external_hotel_name.trim() === "")
        ) {
          updateData.external_hotel_name = "External Hotel (Not Specified)";
          console.log(
            "[PUBLIC_UPDATE_API] Auto-setting external_hotel_name for out-of-quota constraint (provided was empty):",
            updateData.external_hotel_name,
          );
        }
      }
    } else if (finalHotelChoice === "in-quota") {
      // For in-quota, external_hotel_name MUST be null
      const hasExternalHotelInUpdate = "external_hotel_name" in updateData;
      const currentExternalHotel = currentRegistration.external_hotel_name;

      if (!hasExternalHotelInUpdate && currentExternalHotel) {
        // Not updating external_hotel_name but existing value is not null, must clear it
        updateData.external_hotel_name = null;
        console.log(
          "[PUBLIC_UPDATE_API] Clearing existing external_hotel_name for in-quota (was:",
          currentExternalHotel,
          ")",
        );
      } else if (
        hasExternalHotelInUpdate &&
        updateData.external_hotel_name !== null &&
        updateData.external_hotel_name !== undefined
      ) {
        // Explicitly setting to null
        updateData.external_hotel_name = null;
        console.log(
          "[PUBLIC_UPDATE_API] Setting external_hotel_name to null for in-quota",
        );
      }
    }
    // Note: We don't need to handle 'no-accommodation' here because it's already mapped to 'out-of-quota' above

    // ✅ DEBUG: Log the update data before database update
    console.log("[PUBLIC_UPDATE_API] Update data before database update:", {
      registrationId,
      updateData,
      updateDataKeys: Object.keys(updateData),
      hotelChoice: updateData.hotel_choice || currentRegistration.hotel_choice,
      finalHotelChoice,
      currentHotelChoice: currentRegistration.hotel_choice,
      externalHotelName: updateData.external_hotel_name,
      currentExternalHotelName: currentRegistration.external_hotel_name,
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
