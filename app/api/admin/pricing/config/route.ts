import { NextRequest, NextResponse } from "next/server";
import {
  DynamicPricingCalculator,
  PricingConfigUpdate,
} from "../../../../lib/dynamicPricingCalculator";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../lib/auth-utils.server";

/**
 * GET /api/admin/pricing/config
 * Get current pricing configuration with 6 explicit price fields
 *
 * Auth: Super admin only
 */
export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super_admin role
    if (!(await hasRoleFromRequest(req, "super_admin"))) {
      return NextResponse.json(
        { error: "Insufficient permissions. Super admin access required." },
        { status: 403 },
      );
    }

    const config = await DynamicPricingCalculator.getPricingConfig();

    return NextResponse.json({
      earlyBirdDeadline: config.early_bird_deadline,
      prices: {
        earlyBirdOutOfQuota: config.prices.early_bird_out_of_quota,
        earlyBirdInQuotaDouble: config.prices.early_bird_in_quota_double,
        earlyBirdInQuotaSingle: config.prices.early_bird_in_quota_single,
        normalOutOfQuota: config.prices.normal_out_of_quota,
        normalInQuotaDouble: config.prices.normal_in_quota_double,
        normalInQuotaSingle: config.prices.normal_in_quota_single,
      },
      allowInQuotaAfterEarlyBird: config.allow_in_quota_after_early_bird,
      inQuotaSurchargeAfterEarlyBird:
        config.in_quota_surcharge_after_early_bird,
    });
  } catch (error) {
    console.error("[ADMIN_PRICING_CONFIG_GET] Error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
          code: "CONFIG_FETCH_ERROR",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/pricing/config
 * Update pricing configuration with 6 explicit price fields
 *
 * Auth: Super admin only
 */
export async function PUT(req: NextRequest) {
  try {
    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super_admin role
    if (!(await hasRoleFromRequest(req, "super_admin"))) {
      return NextResponse.json(
        { error: "Insufficient permissions. Super admin access required." },
        { status: 403 },
      );
    }

    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      "earlyBirdDeadline",
      "prices.earlyBirdOutOfQuota",
      "prices.earlyBirdInQuotaDouble",
      "prices.earlyBirdInQuotaSingle",
      "prices.normalOutOfQuota",
      "prices.normalInQuotaDouble",
      "prices.normalInQuotaSingle",
      "allowInQuotaAfterEarlyBird",
      "inQuotaSurchargeAfterEarlyBird",
    ];

    for (const field of requiredFields) {
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        if (!body[parent] || body[parent][child] === undefined) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400 },
          );
        }
      } else {
        if (body[field] === undefined) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400 },
          );
        }
      }
    }

    // Transform request body to internal format
    const configUpdate: PricingConfigUpdate = {
      early_bird_deadline: body.earlyBirdDeadline,
      prices: {
        early_bird_out_of_quota: body.prices.earlyBirdOutOfQuota,
        early_bird_in_quota_double: body.prices.earlyBirdInQuotaDouble,
        early_bird_in_quota_single: body.prices.earlyBirdInQuotaSingle,
        normal_out_of_quota: body.prices.normalOutOfQuota,
        normal_in_quota_double: body.prices.normalInQuotaDouble,
        normal_in_quota_single: body.prices.normalInQuotaSingle,
      },
      allow_in_quota_after_early_bird: body.allowInQuotaAfterEarlyBird,
      in_quota_surcharge_after_early_bird: body.inQuotaSurchargeAfterEarlyBird,
    };

    // Get admin email from current user
    const adminEmail = currentUser.email;

    // Update pricing configuration
    await DynamicPricingCalculator.updatePricingConfig(
      configUpdate,
      adminEmail,
    );

    return NextResponse.json({
      success: true,
      message: "Pricing configuration updated successfully",
    });
  } catch (error) {
    console.error("[ADMIN_PRICING_CONFIG_PUT] Error:", error);

    if (error instanceof Error) {
      // Handle validation errors
      if (error.message.includes("Invalid pricing configuration")) {
        return NextResponse.json(
          {
            error: error.message,
            code: "VALIDATION_ERROR",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
          code: "CONFIG_UPDATE_ERROR",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
