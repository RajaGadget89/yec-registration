import { createClient } from "@/app/lib/supabase/server";

export interface PricingConfig {
  pricing_type: "fixed" | "tiered" | "early_bird";
  fixed_price?: number;
  tiered_pricing?: {
    tiers: Array<{
      name: string;
      min_quantity: number;
      max_quantity?: number;
      price_per_item: number;
    }>;
  };
  early_bird_pricing?: {
    early_price: number;
    regular_price: number;
    deadline: string; // ISO date
  };
  currency: string;
  tax_included: boolean;
  tax_rate?: number;
}

export interface PricingResult {
  base_price: number;
  tax_amount: number;
  total_price: number;
  currency: string;
  pricing_type: string;
  is_early_bird: boolean;
  applied_tier?: string;
}

export class FormPricingCalculator {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Get pricing configuration for a form
   */
  async getPricingConfig(formKey: string): Promise<PricingConfig | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("form_pricing_configs")
        .select("config")
        .eq("form_key", formKey)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return null;
      }

      return data.config as PricingConfig;
    } catch (error) {
      console.error("Error fetching pricing config:", error);
      return null;
    }
  }

  /**
   * Calculate pricing for a form registration
   */
  async calculatePricing(
    formKey: string,
    registrationData: any,
    quantity: number = 1
  ): Promise<PricingResult | null> {
    try {
      const config = await this.getPricingConfig(formKey);
      if (!config) {
        throw new Error(`No pricing configuration found for form: ${formKey}`);
      }

      let basePrice = 0;
      let appliedTier: string | undefined;
      let isEarlyBird = false;

      // Calculate base price based on pricing type
      switch (config.pricing_type) {
        case "fixed":
          basePrice = config.fixed_price || 0;
          break;

        case "tiered":
          const tierResult = this.calculateTieredPricing(
            config.tiered_pricing?.tiers || [],
            quantity
          );
          basePrice = tierResult.price;
          appliedTier = tierResult.tierName;
          break;

        case "early_bird":
          const earlyBirdResult = this.calculateEarlyBirdPricing(
            config.early_bird_pricing!,
            quantity
          );
          basePrice = earlyBirdResult.price;
          isEarlyBird = earlyBirdResult.isEarlyBird;
          break;

        default:
          throw new Error(`Unknown pricing type: ${config.pricing_type}`);
      }

      // Calculate tax
      const taxRate = config.tax_rate || 0;
      const taxAmount = config.tax_included
        ? (basePrice * taxRate) / (100 + taxRate)
        : (basePrice * taxRate) / 100;

      const totalPrice = config.tax_included
        ? basePrice
        : basePrice + taxAmount;

      return {
        base_price: basePrice,
        tax_amount: taxAmount,
        total_price: totalPrice,
        currency: config.currency,
        pricing_type: config.pricing_type,
        is_early_bird: isEarlyBird,
        applied_tier: appliedTier,
      };
    } catch (error) {
      console.error("Error calculating pricing:", error);
      return null;
    }
  }

  /**
   * Calculate tiered pricing
   */
  private calculateTieredPricing(
    tiers: Array<{
      name: string;
      min_quantity: number;
      max_quantity?: number;
      price_per_item: number;
    }>,
    quantity: number
  ): { price: number; tierName: string } {
    // Sort tiers by min_quantity
    const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

    // Find the appropriate tier
    for (const tier of sortedTiers) {
      if (
        quantity >= tier.min_quantity &&
        (tier.max_quantity === undefined || quantity <= tier.max_quantity)
      ) {
        return {
          price: tier.price_per_item * quantity,
          tierName: tier.name,
        };
      }
    }

    // If no tier matches, use the first tier (fallback)
    const firstTier = sortedTiers[0];
    if (firstTier) {
      return {
        price: firstTier.price_per_item * quantity,
        tierName: firstTier.name,
      };
    }

    return { price: 0, tierName: "No tier" };
  }

  /**
   * Calculate early bird pricing
   */
  private calculateEarlyBirdPricing(
    earlyBirdConfig: {
      early_price: number;
      regular_price: number;
      deadline: string;
    },
    quantity: number
  ): { price: number; isEarlyBird: boolean } {
    const now = new Date();
    const deadline = new Date(earlyBirdConfig.deadline);
    const isEarlyBird = now <= deadline;

    const pricePerItem = isEarlyBird
      ? earlyBirdConfig.early_price
      : earlyBirdConfig.regular_price;

    return {
      price: pricePerItem * quantity,
      isEarlyBird,
    };
  }

  /**
   * Validate pricing configuration
   */
  validatePricingConfig(config: PricingConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.pricing_type) {
      errors.push("Pricing type is required");
    }

    if (!config.currency) {
      errors.push("Currency is required");
    }

    switch (config.pricing_type) {
      case "fixed":
        if (config.fixed_price === undefined || config.fixed_price < 0) {
          errors.push("Fixed price must be a non-negative number");
        }
        break;

      case "tiered":
        if (!config.tiered_pricing?.tiers || config.tiered_pricing.tiers.length === 0) {
          errors.push("At least one pricing tier is required");
        } else {
          config.tiered_pricing.tiers.forEach((tier, index) => {
            if (!tier.name) {
              errors.push(`Tier ${index + 1}: Name is required`);
            }
            if (tier.min_quantity < 0) {
              errors.push(`Tier ${index + 1}: Min quantity must be non-negative`);
            }
            if (tier.max_quantity !== undefined && tier.max_quantity < tier.min_quantity) {
              errors.push(`Tier ${index + 1}: Max quantity must be greater than or equal to min quantity`);
            }
            if (tier.price_per_item < 0) {
              errors.push(`Tier ${index + 1}: Price per item must be non-negative`);
            }
          });
        }
        break;

      case "early_bird":
        if (!config.early_bird_pricing) {
          errors.push("Early bird pricing configuration is required");
        } else {
          if (config.early_bird_pricing.early_price < 0) {
            errors.push("Early bird price must be non-negative");
          }
          if (config.early_bird_pricing.regular_price < 0) {
            errors.push("Regular price must be non-negative");
          }
          if (!config.early_bird_pricing.deadline) {
            errors.push("Early bird deadline is required");
          } else {
            const deadline = new Date(config.early_bird_pricing.deadline);
            if (isNaN(deadline.getTime())) {
              errors.push("Early bird deadline must be a valid date");
            }
          }
        }
        break;
    }

    if (config.tax_rate !== undefined && (config.tax_rate < 0 || config.tax_rate > 100)) {
      errors.push("Tax rate must be between 0 and 100");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get pricing summary for a form
   */
  async getPricingSummary(formKey: string): Promise<{
    has_pricing: boolean;
    pricing_type?: string;
    price_range?: { min: number; max: number };
    currency?: string;
  }> {
    try {
      const config = await this.getPricingConfig(formKey);
      if (!config) {
        return { has_pricing: false };
      }

      let priceRange: { min: number; max: number } | undefined;

      switch (config.pricing_type) {
        case "fixed":
          priceRange = {
            min: config.fixed_price || 0,
            max: config.fixed_price || 0,
          };
          break;

        case "tiered":
          if (config.tiered_pricing?.tiers && config.tiered_pricing.tiers.length > 0) {
            const prices = config.tiered_pricing.tiers.map(tier => tier.price_per_item);
            priceRange = {
              min: Math.min(...prices),
              max: Math.max(...prices),
            };
          }
          break;

        case "early_bird":
          if (config.early_bird_pricing) {
            priceRange = {
              min: Math.min(
                config.early_bird_pricing.early_price,
                config.early_bird_pricing.regular_price
              ),
              max: Math.max(
                config.early_bird_pricing.early_price,
                config.early_bird_pricing.regular_price
              ),
            };
          }
          break;
      }

      return {
        has_pricing: true,
        pricing_type: config.pricing_type,
        price_range: priceRange,
        currency: config.currency,
      };
    } catch (error) {
      console.error("Error getting pricing summary:", error);
      return { has_pricing: false };
    }
  }
}

// Export singleton instance
export const formPricingCalculator = new FormPricingCalculator();
