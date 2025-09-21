import { NextRequest, NextResponse } from "next/server";
import { DynamicPricingCalculator } from "../../../lib/dynamicPricingCalculator";
import { withAuditLogging } from "../../../lib/audit/withAuditAccess";

/**
 * GET /api/pricing/options
 * Get available hotel choices and room types based on current time and configuration
 *
 * Query parameters:
 * - currentTime: ISO string (optional, defaults to now)
 *
 * Returns:
 * - hotelChoices: Array of available hotel choice values
 * - roomTypes: Array of available room type values
 */
export const GET = withAuditLogging(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const currentTimeParam = url.searchParams.get("currentTime");

    // Parse current time
    const currentTime = currentTimeParam
      ? new Date(currentTimeParam)
      : new Date();
    if (currentTimeParam && isNaN(currentTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid currentTime format. Must be ISO string" },
        { status: 400 },
      );
    }

    // Get available options based on current time
    const options =
      await DynamicPricingCalculator.getAvailableOptions(currentTime);

    return NextResponse.json(options);
  } catch (error) {
    console.error("[PRICING_OPTIONS_API] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Event settings not found")) {
        return NextResponse.json(
          {
            error: "Event settings not found",
            code: "EVENT_SETTINGS_NOT_FOUND",
          },
          { status: 500 },
        );
      }

      if (error.message.includes("Pricing configuration not found")) {
        return NextResponse.json(
          {
            error: "Pricing configuration not found",
            code: "CONFIG_NOT_FOUND",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
          code: "OPTIONS_FETCH_ERROR",
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
});
