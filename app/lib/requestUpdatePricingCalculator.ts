import { getSupabaseServiceClient } from "./supabase-server";
import {
  PricingConfig,
  PriceCalculationResult,
} from "./dynamicPricingCalculator";

/**
 * Request Update Pricing Calculator
 *
 * This calculator is specifically designed for the Request Update workflow.
 * It ALWAYS preserves the original pricing for users who registered during
 * the Early Bird period, regardless of when they make updates.
 *
 * Key Features:
 * - Preserves original Early Bird pricing using stored is_early_bird field
 * - Immune to Early Bird deadline changes during testing/administration
 * - Maintains pricing consistency across updates
 * - Separate from main registration pricing logic
 *
 * FIXED: Now uses stored is_early_bird field directly instead of recalculating
 * based on current deadline, preventing conflicts when deadline is changed.
 */
export class RequestUpdatePricingCalculator {
  /**
   * Calculate price for Request Update workflow
   * Always preserves original registration pricing
   */
  static async calculateUpdatePrice(
    registrationId: string,
    hotelChoice: "in-quota" | "out-of-quota" | "no-accommodation",
    roomType: "single" | "double" | null,
  ): Promise<PriceCalculationResult> {
    const supabase = getSupabaseServiceClient();

    // Get registration data to determine original pricing
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select(
        "created_at, price_applied, currency, selected_package_code, is_early_bird, price_breakdown",
      )
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      throw new Error(`Registration not found: ${registrationId}`);
    }

    // Get pricing configuration
    const { data: eventSettings, error: settingsError } = await supabase
      .from("event_settings")
      .select("pricing_config")
      .single();

    if (settingsError || !eventSettings) {
      throw new Error("Event settings not found");
    }

    const pricingConfig = eventSettings.pricing_config as PricingConfig;
    if (!pricingConfig) {
      throw new Error("Pricing configuration not found");
    }

    console.log("[REQUEST_UPDATE_PRICING] Pricing config structure:", {
      hasPrices: !!pricingConfig.prices,
      pricesKeys: pricingConfig.prices ? Object.keys(pricingConfig.prices) : [],
      earlyBirdDeadline: pricingConfig.early_bird_deadline,
    });

    // ✅ FIXED: Use the stored is_early_bird field directly
    // This ensures we always use the original Early Bird status regardless of current deadline changes
    const isEarlyBird = Boolean(registration.is_early_bird);

    console.log("[REQUEST_UPDATE_PRICING] Using stored Early Bird status:", {
      registrationId,
      storedIsEarlyBird: registration.is_early_bird,
      finalIsEarlyBird: isEarlyBird,
      originalPrice: registration.price_applied,
      hotelChoice,
      roomType,
      note: "Using stored is_early_bird field to avoid deadline change conflicts",
    });

    // ✅ DEBUG: Log the exact inputs received
    console.log("[REQUEST_UPDATE_PRICING] Calculator inputs:", {
      registrationId,
      hotelChoice,
      roomType,
      registrationData: {
        id: registrationId,
        created_at: registration.created_at,
        is_early_bird: registration.is_early_bird,
        price_applied: registration.price_applied,
        selected_package_code: registration.selected_package_code,
      },
    });

    // Calculate base price based on hotel choice and ORIGINAL early bird status
    let basePrice: number;
    let packageCode: string;

    if (hotelChoice === "no-accommodation") {
      // No accommodation - use out-of-quota pricing (they still attend the seminar)
      basePrice = isEarlyBird
        ? pricingConfig.prices.early_bird_out_of_quota
        : pricingConfig.prices.normal_out_of_quota;
      packageCode = "no-accommodation";
    } else if (hotelChoice === "out-of-quota") {
      // Out of quota pricing
      basePrice = isEarlyBird
        ? pricingConfig.prices.early_bird_out_of_quota
        : pricingConfig.prices.normal_out_of_quota;
      packageCode = "out-of-quota";
    } else if (hotelChoice === "in-quota") {
      if (!roomType) {
        throw new Error("Room type is required for in-quota hotel choice");
      }

      if (roomType === "single") {
        // For single room, use double room as base price, surcharge will be added later
        basePrice = isEarlyBird
          ? pricingConfig.prices.early_bird_in_quota_double
          : pricingConfig.prices.normal_in_quota_double;
        packageCode = "in-quota-single";
      } else if (roomType === "double") {
        basePrice = isEarlyBird
          ? pricingConfig.prices.early_bird_in_quota_double
          : pricingConfig.prices.normal_in_quota_double;
        packageCode = "in-quota-double";
      } else {
        throw new Error("Room type is required for in-quota hotel choice");
      }
    } else {
      throw new Error(`Invalid hotel choice: ${hotelChoice}`);
    }

    // Calculate room surcharge (for single room)
    let roomSurcharge = 0;
    if (hotelChoice === "in-quota" && roomType === "single") {
      // Single room surcharge is the difference between single and double room pricing
      const singleRoomPrice = isEarlyBird
        ? pricingConfig.prices.early_bird_in_quota_single
        : pricingConfig.prices.normal_in_quota_single;
      roomSurcharge = singleRoomPrice - basePrice;
    }
    const total = basePrice + roomSurcharge;

    console.log("[REQUEST_UPDATE_PRICING] Price calculation details:", {
      hotelChoice,
      roomType,
      isEarlyBird,
      basePrice,
      roomSurcharge,
      total,
      packageCode,
    });

    // Determine available options based on original registration time
    const _availableOptions = {
      inQuota: true, // Always available for updates
      outOfQuota: true,
      noAccommodation: true,
    };

    const result: PriceCalculationResult = {
      price: total,
      currency: "THB",
      isEarlyBird,
      packageCode,
      breakdown: {
        basePrice,
        roomSurcharge,
        total,
      },
      availableOptions: {
        hotelChoices: ["in-quota", "out-of-quota", "no-accommodation"],
        roomTypes: ["single", "double"],
      },
    };

    // ✅ SAFETY MECHANISM NO LONGER NEEDED
    // Since we now use the stored is_early_bird field directly,
    // the calculation should always be correct and no override is needed

    console.log("[REQUEST_UPDATE_PRICING] Final calculated price:", {
      registrationId,
      result,
      preservedEarlyBird: result.isEarlyBird,
      originalWasEarlyBird: registration.is_early_bird,
    });

    return result;
  }

  /**
   * Get original registration pricing information
   * Used for display purposes in the update form
   */
  static async getOriginalPricingInfo(registrationId: string): Promise<{
    originalPrice: number;
    originalCurrency: string;
    originalIsEarlyBird: boolean;
    originalPackageCode: string;
    originalBreakdown: any;
    originalRegistrationTime: string;
  }> {
    const supabase = getSupabaseServiceClient();

    const { data: registration, error } = await supabase
      .from("registrations")
      .select(
        "created_at, price_applied, currency, selected_package_code, is_early_bird, price_breakdown",
      )
      .eq("id", registrationId)
      .single();

    if (error || !registration) {
      throw new Error(`Registration not found: ${registrationId}`);
    }

    return {
      originalPrice: registration.price_applied || 0,
      originalCurrency: registration.currency || "THB",
      originalIsEarlyBird: registration.is_early_bird || false,
      originalPackageCode: registration.selected_package_code || "",
      originalBreakdown: registration.price_breakdown || {},
      originalRegistrationTime: registration.created_at,
    };
  }

  /**
   * Validate that the requested hotel choice is allowed for updates
   * This ensures business rules are maintained during updates
   */
  static async validateUpdateRequest(
    registrationId: string,
    hotelChoice: "in-quota" | "out-of-quota" | "no-accommodation",
    _roomType: "single" | "double" | null,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Get original registration
      const supabase = getSupabaseServiceClient();
      const { data: registration, error } = await supabase
        .from("registrations")
        .select("created_at, hotel_choice, room_type")
        .eq("id", registrationId)
        .single();

      if (error || !registration) {
        return { valid: false, reason: "Registration not found" };
      }

      // Get pricing configuration
      const { data: eventSettings, error: settingsError } = await supabase
        .from("event_settings")
        .select("pricing_config")
        .single();

      if (settingsError || !eventSettings) {
        return { valid: false, reason: "Pricing configuration not found" };
      }

      const pricingConfig = eventSettings.pricing_config as PricingConfig;
      if (!pricingConfig) {
        return { valid: false, reason: "Pricing configuration not found" };
      }

      // Check if original registration was during Early Bird period
      const originalRegistrationTime = new Date(registration.created_at);
      const earlyBirdDeadline = new Date(pricingConfig.early_bird_deadline);
      const wasEarlyBirdRegistration =
        originalRegistrationTime <= earlyBirdDeadline;

      // If original registration was NOT early bird, check current time restrictions
      if (!wasEarlyBirdRegistration) {
        const currentTime = new Date();
        const isCurrentlyEarlyBird = currentTime <= earlyBirdDeadline;

        // If currently past early bird deadline and requesting in-quota, check if allowed
        if (!isCurrentlyEarlyBird && hotelChoice === "in-quota") {
          if (!pricingConfig.allow_in_quota_after_early_bird) {
            return {
              valid: false,
              reason:
                "In-quota options are not available after early bird period",
            };
          }
        }
      }

      // All validations passed
      return { valid: true };
    } catch (error) {
      console.error("[REQUEST_UPDATE_PRICING] Validation error:", error);
      return { valid: false, reason: "Validation failed" };
    }
  }
}
