import { getSupabaseServiceClient } from "./supabase-server";

/**
 * Dynamic Pricing Calculator for YEC Day registrations
 * Implements the new package pricing system with 6 explicit price fields
 * Following SDD Package Pricing System specification
 */

// Types for the new pricing system
export interface PricingConfig {
  early_bird_deadline: string;
  prices: {
    early_bird_out_of_quota: number;
    early_bird_in_quota_double: number;
    early_bird_in_quota_single: number;
    normal_out_of_quota: number;
    normal_in_quota_double: number;
    normal_in_quota_single: number;
  };
  allow_in_quota_after_early_bird: boolean;
  in_quota_surcharge_after_early_bird: number;
}

export interface PriceCalculationResult {
  price: number;
  currency: string;
  isEarlyBird: boolean;
  packageCode: string;
  breakdown: {
    basePrice: number;
    roomSurcharge: number;
    total: number;
  };
  availableOptions: {
    hotelChoices: string[];
    roomTypes: string[];
  };
}

export interface AvailableOptions {
  hotelChoices: string[];
  roomTypes: string[];
  // Pricing configuration context for dynamic form behavior
  allowInQuotaAfterEarlyBird: boolean;
  isEarlyBird: boolean;
}

export interface PricingConfigUpdate {
  early_bird_deadline: string;
  prices: {
    early_bird_out_of_quota: number;
    early_bird_in_quota_double: number;
    early_bird_in_quota_single: number;
    normal_out_of_quota: number;
    normal_in_quota_double: number;
    normal_in_quota_single: number;
  };
  allow_in_quota_after_early_bird: boolean;
  in_quota_surcharge_after_early_bird: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PricingHistoryEntry {
  id: string;
  admin_email: string;
  changes: any;
  created_at: string;
}

/**
 * Dynamic Pricing Calculator class
 * Implements the new package pricing system with 6 explicit price fields
 */
export class DynamicPricingCalculator {
  /**
   * Calculate price based on hotel choice and room type using 6 explicit price fields
   */
  static async calculatePrice(
    hotelChoice: "in-quota" | "out-of-quota" | "no-accommodation",
    roomType: "single" | "double" | null,
    currentTime: Date = new Date(),
  ): Promise<PriceCalculationResult> {
    const supabase = getSupabaseServiceClient();

    // Get pricing configuration
    const { data: eventSettings, error } = await supabase
      .from("event_settings")
      .select("pricing_config")
      .single();

    if (error || !eventSettings) {
      throw new Error("Event settings not found");
    }

    const pricingConfig = eventSettings.pricing_config as PricingConfig;
    if (!pricingConfig) {
      throw new Error("Pricing configuration not found");
    }

    // Check if current time is before early bird deadline
    const earlyBirdDeadline = new Date(pricingConfig.early_bird_deadline);
    const isEarlyBird = currentTime <= earlyBirdDeadline;

    // Calculate base price based on hotel choice and early bird status
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
      // In quota pricing - check if allowed after early bird
      if (!isEarlyBird && !pricingConfig.allow_in_quota_after_early_bird) {
        throw new Error(
          "In-quota options are not available after early bird period",
        );
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
      if (isEarlyBird) {
        roomSurcharge =
          pricingConfig.prices.early_bird_in_quota_single -
          pricingConfig.prices.early_bird_in_quota_double;
      } else {
        roomSurcharge =
          pricingConfig.prices.normal_in_quota_single -
          pricingConfig.prices.normal_in_quota_double;
      }
    }

    // Calculate total
    const total = basePrice + roomSurcharge;

    // Get available options
    const availableOptions = await this.getAvailableOptions(currentTime);

    return {
      price: total,
      currency: "THB",
      isEarlyBird,
      packageCode,
      breakdown: {
        basePrice,
        roomSurcharge,
        total,
      },
      availableOptions,
    };
  }

  /**
   * Calculate price preserving original registration time for updates
   * This method ensures that users who registered during early bird period
   * maintain their early bird pricing even when updating after the deadline
   */
  static async calculatePriceWithOriginalTime(
    hotelChoice: "in-quota" | "out-of-quota" | "no-accommodation",
    roomType: "single" | "double" | null,
    originalRegistrationTime: Date,
  ): Promise<PriceCalculationResult> {
    const supabase = getSupabaseServiceClient();

    // Get pricing configuration
    const { data: eventSettings, error } = await supabase
      .from("event_settings")
      .select("pricing_config")
      .single();

    if (error || !eventSettings) {
      throw new Error("Event settings not found");
    }

    const pricingConfig = eventSettings.pricing_config as PricingConfig;
    if (!pricingConfig) {
      throw new Error("Pricing configuration not found");
    }

    // Check if ORIGINAL registration time is before early bird deadline
    const earlyBirdDeadline = new Date(pricingConfig.early_bird_deadline);
    const isEarlyBird = originalRegistrationTime <= earlyBirdDeadline;

    console.log("[PRICING_CALCULATOR] Preserving original registration time:", {
      originalRegistrationTime: originalRegistrationTime.toISOString(),
      earlyBirdDeadline: earlyBirdDeadline.toISOString(),
      isEarlyBird,
      hotelChoice,
      roomType,
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
      // In quota pricing - check if allowed after early bird
      if (!isEarlyBird && !pricingConfig.allow_in_quota_after_early_bird) {
        throw new Error(
          "In-quota options are not available after early bird period",
        );
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
      // Single room surcharge is the difference between single and double pricing
      const singlePrice = isEarlyBird
        ? pricingConfig.prices.early_bird_in_quota_single
        : pricingConfig.prices.normal_in_quota_single;
      roomSurcharge = singlePrice - basePrice;
    }

    // Calculate total price
    const total = basePrice + roomSurcharge;

    // Get available options (this can use current time since it's for display purposes)
    const availableOptions = await this.getAvailableOptions();

    return {
      price: total,
      currency: "THB",
      isEarlyBird,
      packageCode,
      breakdown: {
        basePrice,
        roomSurcharge,
        total,
      },
      availableOptions,
    };
  }

  /**
   * Get available options based on current time
   */
  static async getAvailableOptions(
    currentTime: Date = new Date(),
  ): Promise<AvailableOptions> {
    const supabase = getSupabaseServiceClient();

    // Get pricing configuration
    const { data: eventSettings, error } = await supabase
      .from("event_settings")
      .select("pricing_config")
      .single();

    if (error || !eventSettings) {
      throw new Error("Event settings not found");
    }

    const pricingConfig = eventSettings.pricing_config as PricingConfig;
    if (!pricingConfig) {
      throw new Error("Pricing configuration not found");
    }

    // Check if current time is before early bird deadline
    const earlyBirdDeadline = new Date(pricingConfig.early_bird_deadline);
    const isEarlyBird = currentTime <= earlyBirdDeadline;

    // Determine available hotel choices
    const hotelChoices: string[] = ["out-of-quota", "no-accommodation"];

    if (isEarlyBird || pricingConfig.allow_in_quota_after_early_bird) {
      hotelChoices.unshift("in-quota");
    }

    // Determine available room types
    const roomTypes: string[] = [];
    if (hotelChoices.includes("in-quota")) {
      roomTypes.push("double", "single");
    }

    return {
      hotelChoices,
      roomTypes,
      allowInQuotaAfterEarlyBird: pricingConfig.allow_in_quota_after_early_bird,
      isEarlyBird,
    };
  }

  /**
   * Get current pricing configuration with 6 explicit price fields
   */
  static async getPricingConfig(): Promise<PricingConfig> {
    const supabase = getSupabaseServiceClient();

    const { data: eventSettings, error } = await supabase
      .from("event_settings")
      .select("pricing_config")
      .single();

    if (error || !eventSettings) {
      throw new Error("Event settings not found");
    }

    const pricingConfig = eventSettings.pricing_config as PricingConfig;
    if (!pricingConfig) {
      throw new Error("Pricing configuration not found");
    }

    return pricingConfig;
  }

  /**
   * Update pricing configuration (admin only) - 6 explicit price fields
   */
  static async updatePricingConfig(
    config: PricingConfigUpdate,
    adminEmail: string,
  ): Promise<void> {
    const supabase = getSupabaseServiceClient();

    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(
        `Invalid pricing configuration: ${validation.errors.join(", ")}`,
      );
    }

    // Check if event_settings record exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from("event_settings")
      .select("id")
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected if no record exists
      throw new Error(
        `Failed to check existing configuration: ${fetchError.message}`,
      );
    }

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from("event_settings")
        .update({
          pricing_config: config,
          early_bird_deadline_utc: config.early_bird_deadline,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id);

      if (error) {
        throw new Error(
          `Failed to update pricing configuration: ${error.message}`,
        );
      }
    } else {
      // Create new record
      const { error } = await supabase.from("event_settings").insert({
        pricing_config: config,
        early_bird_deadline_utc: config.early_bird_deadline,
        registration_deadline_utc: config.early_bird_deadline, // Use same as early bird for now
        // price_packages is NOT NULL in schema (legacy field). Seed with empty array to satisfy constraint.
        price_packages: [],
        // keep eligibility rules empty by default
        eligibility_rules: {
          blocked_emails: [],
          blocked_domains: [],
          blocked_keywords: [],
        },
        timezone: "Asia/Bangkok",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(
          `Failed to create pricing configuration: ${error.message}`,
        );
      }
    }

    // Log the change for audit trail
    console.log(
      `[PRICING_CONFIG_UPDATE] Admin ${adminEmail} updated pricing configuration:`,
      config,
    );
  }

  /**
   * Validate pricing configuration (6 price fields validation)
   */
  static validateConfig(config: PricingConfigUpdate): ValidationResult {
    const errors: string[] = [];

    // Validate early bird deadline
    if (!config.early_bird_deadline) {
      errors.push("Early bird deadline is required");
    } else {
      const deadline = new Date(config.early_bird_deadline);
      if (isNaN(deadline.getTime())) {
        errors.push("Early bird deadline must be a valid date");
      }
    }

    // Validate all 6 price fields
    const priceFields = [
      "early_bird_out_of_quota",
      "early_bird_in_quota_double",
      "early_bird_in_quota_single",
      "normal_out_of_quota",
      "normal_in_quota_double",
      "normal_in_quota_single",
    ];

    for (const field of priceFields) {
      const price = config.prices[field as keyof typeof config.prices];
      if (typeof price !== "number" || price < 0) {
        errors.push(`${field} must be a non-negative number`);
      }
    }

    // Validate logical pricing relationships
    if (
      config.prices.early_bird_in_quota_single <
      config.prices.early_bird_in_quota_double
    ) {
      errors.push("Early bird single room price must be >= double room price");
    }

    if (
      config.prices.normal_in_quota_single <
      config.prices.normal_in_quota_double
    ) {
      errors.push("Normal single room price must be >= double room price");
    }

    // Validate surcharge
    if (
      typeof config.in_quota_surcharge_after_early_bird !== "number" ||
      config.in_quota_surcharge_after_early_bird < 0
    ) {
      errors.push(
        "In-quota surcharge after early bird must be a non-negative number",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number, currency: string = "THB"): string {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: currency,
    }).format(price);
  }

  /**
   * Get pricing history (audit trail)
   */
  static async getPricingHistory(): Promise<PricingHistoryEntry[]> {
    // This would be implemented with a separate pricing_history table
    // For now, return empty array as we don't have the history table yet
    return [];
  }
}
