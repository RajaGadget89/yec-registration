import { getSupabaseServiceClient } from "../supabase-server";
import {
  FormPricingConfig,
  FormPricingService,
  PricingData,
} from "../../types/form-system";

/**
 * Form Pricing Service
 * Handles pricing configuration and calculation for form-specific pricing
 */
export class FormPricingServiceImpl implements FormPricingService {
  private supabase = getSupabaseServiceClient();

  /**
   * Calculate price for a form registration
   */
  async calculatePrice(formKey: string, data: any): Promise<PricingData> {
    // Get pricing configuration for the form
    const config = await this.getConfig(formKey);

    if (!config) {
      throw new Error(`No pricing configuration found for form: ${formKey}`);
    }

    const pricingConfig = config.config;

    switch (pricingConfig.pricing_type) {
      case "fixed":
        return this.calculateFixedPrice(pricingConfig, data);

      case "tiered":
        return this.calculateTieredPrice(pricingConfig, data);

      case "early_bird":
        return this.calculateEarlyBirdPrice(pricingConfig, data);

      default:
        throw new Error(
          `Unsupported pricing type: ${pricingConfig.pricing_type}`,
        );
    }
  }

  /**
   * Calculate fixed price
   */
  private calculateFixedPrice(config: any, _data: any): PricingData {
    return {
      total_amount: config.base_price,
      currency: config.currency,
      breakdown: {
        base_price: config.base_price,
        surcharges: 0,
        discounts: 0,
        total: config.base_price,
      },
    };
  }

  /**
   * Calculate tiered price based on selections
   */
  private calculateTieredPrice(config: any, data: any): PricingData {
    let basePrice = config.base_price;

    // Apply tier logic
    if (config.tiers && Array.isArray(config.tiers)) {
      for (const tier of config.tiers) {
        if (this.evaluateCondition(tier.condition, data)) {
          basePrice = tier.price;
          break;
        }
      }
    }

    return {
      total_amount: basePrice,
      currency: config.currency,
      breakdown: {
        base_price: basePrice,
        surcharges: 0,
        discounts: 0,
        total: basePrice,
      },
    };
  }

  /**
   * Calculate early bird price
   */
  private calculateEarlyBirdPrice(config: any, _data: any): PricingData {
    const now = new Date();
    const earlyBirdDeadline = new Date(config.early_bird_deadline);
    const isEarlyBird = now <= earlyBirdDeadline;

    let totalAmount = config.base_price;
    let discount = 0;

    if (isEarlyBird && config.early_bird_discount) {
      discount = config.base_price * (config.early_bird_discount / 100);
      totalAmount = config.base_price - discount;
    }

    return {
      total_amount: totalAmount,
      currency: config.currency,
      is_early_bird: isEarlyBird,
      breakdown: {
        base_price: config.base_price,
        surcharges: 0,
        discounts: discount,
        total: totalAmount,
      },
    };
  }

  /**
   * Evaluate a condition string against data
   */
  private evaluateCondition(_condition: string, _data: any): boolean {
    try {
      // Simple condition evaluation
      // For now, support basic field comparisons
      // In a real implementation, you might use a more sophisticated expression evaluator

      // Example conditions:
      // "field_name == 'value'"
      // "field_name > 100"
      // "field_name in ['option1', 'option2']"

      // This is a simplified implementation
      // In production, you'd want a proper expression parser
      return true; // Placeholder
    } catch (error) {
      console.error("Error evaluating condition:", error);
      return false;
    }
  }

  /**
   * Get pricing configuration for a form
   */
  async getConfig(formKey: string): Promise<FormPricingConfig | null> {
    const { data, error } = await this.supabase
      .from("form_pricing_configs")
      .select("*")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get pricing config: ${error.message}`);
    }

    return data as FormPricingConfig;
  }

  /**
   * Update pricing configuration
   */
  async updateConfig(
    formKey: string,
    config: Partial<FormPricingConfig>,
  ): Promise<FormPricingConfig> {
    // Check if config exists
    const existing = await this.getConfig(formKey);

    if (existing) {
      // Update existing config
      const { data, error } = await this.supabase
        .from("form_pricing_configs")
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq("form_key", formKey)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update pricing config: ${error.message}`);
      }

      return data as FormPricingConfig;
    } else {
      // Create new config
      const { data, error } = await this.supabase
        .from("form_pricing_configs")
        .insert({
          form_key: formKey,
          pricing_type: config.pricing_type || "fixed",
          config: config.config || {},
          is_active: config.is_active !== undefined ? config.is_active : true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create pricing config: ${error.message}`);
      }

      return data as FormPricingConfig;
    }
  }

  /**
   * Validate pricing configuration
   */
  validatePricingConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.pricing_type) {
      errors.push("Pricing type is required");
    } else if (
      !["fixed", "tiered", "early_bird"].includes(config.pricing_type)
    ) {
      errors.push("Invalid pricing type");
    }

    if (!config.base_price || config.base_price <= 0) {
      errors.push("Base price must be greater than 0");
    }

    if (!config.currency) {
      errors.push("Currency is required");
    }

    if (config.pricing_type === "early_bird") {
      if (!config.early_bird_deadline) {
        errors.push("Early bird deadline is required for early bird pricing");
      }
      if (
        config.early_bird_discount &&
        (config.early_bird_discount < 0 || config.early_bird_discount > 100)
      ) {
        errors.push("Early bird discount must be between 0 and 100");
      }
    }

    if (config.pricing_type === "tiered") {
      if (
        !config.tiers ||
        !Array.isArray(config.tiers) ||
        config.tiers.length === 0
      ) {
        errors.push("Tiers are required for tiered pricing");
      } else {
        config.tiers.forEach((tier: any, index: number) => {
          if (!tier.name) {
            errors.push(`Tier ${index} must have a name`);
          }
          if (!tier.condition) {
            errors.push(`Tier ${index} must have a condition`);
          }
          if (!tier.price || tier.price <= 0) {
            errors.push(`Tier ${index} must have a valid price`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all pricing configurations
   */
  async getAllConfigs(): Promise<FormPricingConfig[]> {
    const { data, error } = await this.supabase
      .from("form_pricing_configs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get pricing configs: ${error.message}`);
    }

    return data as FormPricingConfig[];
  }

  /**
   * Delete pricing configuration
   */
  async deleteConfig(formKey: string): Promise<void> {
    const { error } = await this.supabase
      .from("form_pricing_configs")
      .delete()
      .eq("form_key", formKey);

    if (error) {
      throw new Error(`Failed to delete pricing config: ${error.message}`);
    }
  }
}

// Export singleton instance
export const formPricingService = new FormPricingServiceImpl();
