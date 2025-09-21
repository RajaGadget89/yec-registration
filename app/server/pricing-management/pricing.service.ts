import { getSupabaseServiceClient } from "../../lib/supabase-server";
import {
  DynamicPricingCalculator,
  PricingConfig,
  PricingConfigUpdate,
  ValidationResult,
  PricingHistoryEntry,
} from "../../lib/dynamicPricingCalculator";

/**
 * Pricing Management Service
 * Handles admin operations for pricing configuration
 * Following SDD Package Pricing System specification
 */

export class PricingManagementService {
  /**
   * Get pricing configuration with 6 explicit price fields
   */
  static async getConfig(): Promise<PricingConfig> {
    return await DynamicPricingCalculator.getPricingConfig();
  }

  /**
   * Update pricing configuration with 6 explicit price fields
   */
  static async updateConfig(
    config: PricingConfigUpdate,
    adminEmail: string,
  ): Promise<void> {
    return await DynamicPricingCalculator.updatePricingConfig(
      config,
      adminEmail,
    );
  }

  /**
   * Validate pricing configuration (6 price fields validation)
   */
  static validateConfig(config: PricingConfigUpdate): ValidationResult {
    return DynamicPricingCalculator.validateConfig(config);
  }

  /**
   * Get pricing history (audit trail)
   */
  static async getPricingHistory(): Promise<PricingHistoryEntry[]> {
    return await DynamicPricingCalculator.getPricingHistory();
  }

  /**
   * Get available options for current time
   */
  static async getAvailableOptions(currentTime?: Date): Promise<{
    hotelChoices: string[];
    roomTypes: string[];
  }> {
    return await DynamicPricingCalculator.getAvailableOptions(currentTime);
  }

  /**
   * Calculate price preview for admin
   */
  static async calculatePricePreview(
    hotelChoice: "in-quota" | "out-of-quota" | "no-accommodation",
    roomType: "single" | "double" | null,
    currentTime?: Date,
  ) {
    return await DynamicPricingCalculator.calculatePrice(
      hotelChoice,
      roomType,
      currentTime,
    );
  }

  /**
   * Get pricing configuration summary for admin dashboard
   */
  static async getConfigSummary(): Promise<{
    isEarlyBirdActive: boolean;
    earlyBirdDeadline: string;
    totalPriceFields: number;
    allowInQuotaAfterEarlyBird: boolean;
    lastUpdated?: string;
  }> {
    const config = await this.getConfig();
    const currentTime = new Date();
    const earlyBirdDeadline = new Date(config.early_bird_deadline);

    return {
      isEarlyBirdActive: currentTime <= earlyBirdDeadline,
      earlyBirdDeadline: config.early_bird_deadline,
      totalPriceFields: 6, // Always 6 explicit price fields
      allowInQuotaAfterEarlyBird: config.allow_in_quota_after_early_bird,
      lastUpdated: new Date().toISOString(), // This would come from audit trail in real implementation
    };
  }

  /**
   * Validate admin permissions for pricing management
   */
  static async validateAdminPermissions(adminEmail: string): Promise<{
    canManage: boolean;
    reason?: string;
  }> {
    const supabase = getSupabaseServiceClient();

    try {
      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("role, is_active")
        .eq("email", adminEmail.toLowerCase())
        .single();

      if (error || !adminUser) {
        return {
          canManage: false,
          reason: "Admin user not found",
        };
      }

      if ((adminUser as any).role !== "super_admin") {
        return {
          canManage: false,
          reason: "Super admin role required",
        };
      }

      if (!(adminUser as any).is_active) {
        return {
          canManage: false,
          reason: "Admin account is not active",
        };
      }

      return {
        canManage: true,
      };
    } catch (error) {
      console.error(
        "[PRICING_MANAGEMENT_SERVICE] Error validating admin permissions:",
        error,
      );
      return {
        canManage: false,
        reason: "Error validating permissions",
      };
    }
  }

  /**
   * Get pricing statistics for admin dashboard
   */
  static async getPricingStats(): Promise<{
    totalRegistrations: number;
    earlyBirdRegistrations: number;
    totalRevenue: number;
    averagePrice: number;
    priceDistribution: {
      outOfQuota: number;
      inQuotaDouble: number;
      inQuotaSingle: number;
      noAccommodation: number;
    };
  }> {
    const supabase = getSupabaseServiceClient();

    try {
      // Get all registrations with pricing data
      const { data: registrations, error } = await supabase
        .from("registrations")
        .select("price_applied, is_early_bird, selected_package_code")
        .not("price_applied", "is", null);

      if (error) {
        throw new Error(`Failed to fetch pricing statistics: ${error.message}`);
      }

      const totalRegistrations = registrations?.length || 0;
      const earlyBirdRegistrations =
        registrations?.filter((r) => r.is_early_bird).length || 0;

      const totalRevenue =
        registrations?.reduce((sum, r) => sum + (r.price_applied || 0), 0) || 0;
      const averagePrice =
        totalRegistrations > 0 ? totalRevenue / totalRegistrations : 0;

      // Calculate price distribution
      const priceDistribution = {
        outOfQuota: 0,
        inQuotaDouble: 0,
        inQuotaSingle: 0,
        noAccommodation: 0,
      };

      registrations?.forEach((reg) => {
        const packageCode = reg.selected_package_code;
        if (packageCode === "out-of-quota") priceDistribution.outOfQuota++;
        else if (packageCode === "in-quota-double")
          priceDistribution.inQuotaDouble++;
        else if (packageCode === "in-quota-single")
          priceDistribution.inQuotaSingle++;
        else if (packageCode === "no-accommodation")
          priceDistribution.noAccommodation++;
      });

      return {
        totalRegistrations,
        earlyBirdRegistrations,
        totalRevenue,
        averagePrice,
        priceDistribution,
      };
    } catch (error) {
      console.error(
        "[PRICING_MANAGEMENT_SERVICE] Error getting pricing stats:",
        error,
      );
      throw error;
    }
  }
}
