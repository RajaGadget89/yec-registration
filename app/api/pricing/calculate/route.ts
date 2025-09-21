import { NextRequest, NextResponse } from "next/server";
import { DynamicPricingCalculator } from "../../../lib/dynamicPricingCalculator";
import { withAuditLogging } from "../../../lib/audit/withAuditAccess";

// Types for the API
interface PriceCalculationRequest {
  hotelChoice: "in-quota" | "out-of-quota" | "no-accommodation";
  roomType: "single" | "double" | null;
  currentTime?: string; // ISO string, optional
  originalRegistrationTime?: string; // ISO string, optional - for preserving early bird pricing
}

/**
 * GET /api/pricing/calculate
 * Calculate price based on hotel choice and room type
 *
 * Query parameters:
 * - hotelChoice: 'in-quota' | 'out-of-quota' | 'no-accommodation'
 * - roomType: 'single' | 'double' | null (required for in-quota)
 * - currentTime: ISO string (optional, defaults to now)
 * - originalRegistrationTime: ISO string (optional, for preserving early bird pricing)
 */
export const GET = withAuditLogging(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const hotelChoice = url.searchParams.get("hotelChoice") as
      | "in-quota"
      | "out-of-quota"
      | "no-accommodation";
    const roomType = url.searchParams.get("roomType") as
      | "single"
      | "double"
      | null;
    const currentTimeParam = url.searchParams.get("currentTime");
    const originalRegistrationTimeParam = url.searchParams.get(
      "originalRegistrationTime",
    );

    // Validate required parameters
    if (!hotelChoice) {
      return NextResponse.json(
        { error: "hotelChoice parameter is required" },
        { status: 400 },
      );
    }

    if (
      !["in-quota", "out-of-quota", "no-accommodation"].includes(hotelChoice)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid hotelChoice. Must be 'in-quota', 'out-of-quota', or 'no-accommodation'",
        },
        { status: 400 },
      );
    }

    if (roomType !== null && !["single", "double"].includes(roomType)) {
      return NextResponse.json(
        { error: "Invalid roomType. Must be 'single' or 'double'" },
        { status: 400 },
      );
    }

    // Validate room type requirement for in-quota
    if (hotelChoice === "in-quota" && !roomType) {
      return NextResponse.json(
        { error: "roomType is required when hotelChoice is 'in-quota'" },
        { status: 400 },
      );
    }

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

    // Parse original registration time if provided
    let originalRegistrationTime: Date | undefined;
    if (originalRegistrationTimeParam) {
      originalRegistrationTime = new Date(originalRegistrationTimeParam);
      if (isNaN(originalRegistrationTime.getTime())) {
        return NextResponse.json(
          {
            error:
              "Invalid originalRegistrationTime format. Must be ISO string",
          },
          { status: 400 },
        );
      }
    }

    // Calculate price - use original time if provided, otherwise use current time
    const result = originalRegistrationTime
      ? await DynamicPricingCalculator.calculatePriceWithOriginalTime(
          hotelChoice,
          roomType,
          originalRegistrationTime,
        )
      : await DynamicPricingCalculator.calculatePrice(
          hotelChoice,
          roomType,
          currentTime,
        );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PRICING_CALCULATE_API] Error:", error);

    if (error instanceof Error) {
      // Handle specific business logic errors
      if (error.message.includes("not available after early bird")) {
        return NextResponse.json(
          {
            error: "In-quota options are not available after early bird period",
            code: "EARLY_BIRD_EXPIRED",
          },
          { status: 400 },
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
          code: "CALCULATION_ERROR",
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

/**
 * POST /api/pricing/calculate
 * Calculate price based on hotel choice and room type (alternative to GET)
 */
export const POST = withAuditLogging(async (req: NextRequest) => {
  try {
    const body: PriceCalculationRequest = await req.json();

    // Validate required fields
    if (!body.hotelChoice) {
      return NextResponse.json(
        { error: "hotelChoice is required" },
        { status: 400 },
      );
    }

    if (
      !["in-quota", "out-of-quota", "no-accommodation"].includes(
        body.hotelChoice,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid hotelChoice. Must be 'in-quota', 'out-of-quota', or 'no-accommodation'",
        },
        { status: 400 },
      );
    }

    if (
      body.roomType !== null &&
      !["single", "double"].includes(body.roomType)
    ) {
      return NextResponse.json(
        { error: "Invalid roomType. Must be 'single' or 'double'" },
        { status: 400 },
      );
    }

    // Validate room type requirement for in-quota
    if (body.hotelChoice === "in-quota" && !body.roomType) {
      return NextResponse.json(
        { error: "roomType is required when hotelChoice is 'in-quota'" },
        { status: 400 },
      );
    }

    // Parse current time
    const currentTime = body.currentTime
      ? new Date(body.currentTime)
      : new Date();
    if (body.currentTime && isNaN(currentTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid currentTime format. Must be ISO string" },
        { status: 400 },
      );
    }

    // Parse original registration time if provided
    let originalRegistrationTime: Date | undefined;
    if (body.originalRegistrationTime) {
      originalRegistrationTime = new Date(body.originalRegistrationTime);
      if (isNaN(originalRegistrationTime.getTime())) {
        return NextResponse.json(
          {
            error:
              "Invalid originalRegistrationTime format. Must be ISO string",
          },
          { status: 400 },
        );
      }
    }

    // Calculate price - use original time if provided, otherwise use current time
    const result = originalRegistrationTime
      ? await DynamicPricingCalculator.calculatePriceWithOriginalTime(
          body.hotelChoice,
          body.roomType,
          originalRegistrationTime,
        )
      : await DynamicPricingCalculator.calculatePrice(
          body.hotelChoice,
          body.roomType,
          currentTime,
        );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PRICING_CALCULATE_API] Error:", error);

    if (error instanceof Error) {
      // Handle specific business logic errors
      if (error.message.includes("not available after early bird")) {
        return NextResponse.json(
          {
            error: "In-quota options are not available after early bird period",
            code: "EARLY_BIRD_EXPIRED",
          },
          { status: 400 },
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
          code: "CALCULATION_ERROR",
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
