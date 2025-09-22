import { NextRequest, NextResponse } from "next/server";
import { RequestUpdatePricingCalculator } from "../../../lib/requestUpdatePricingCalculator";
import { withAuditLogging } from "../../../lib/audit/withAuditAccess";

// Types for the Request Update Pricing API
interface RequestUpdatePricingRequest {
  registrationId: string;
  hotelChoice: "in-quota" | "out-of-quota" | "no-accommodation";
  roomType: "single" | "double" | null;
}

/**
 * POST /api/pricing/calculate-update
 * Calculate price for Request Update workflow
 *
 * This endpoint is specifically designed for the Request Update workflow.
 * It ALWAYS preserves the original pricing for users who registered during
 * the Early Bird period, regardless of when they make updates.
 *
 * Request body:
 * - registrationId: string (required) - The registration ID to update
 * - hotelChoice: 'in-quota' | 'out-of-quota' | 'no-accommodation' (required)
 * - roomType: 'single' | 'double' | null (required for in-quota)
 */
export const POST = withAuditLogging(async (req: NextRequest) => {
  try {
    const body: RequestUpdatePricingRequest = await req.json();

    // Validate required fields
    if (!body.registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 },
      );
    }

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

    // Validate the update request first
    const validation =
      await RequestUpdatePricingCalculator.validateUpdateRequest(
        body.registrationId,
        body.hotelChoice,
        body.roomType,
      );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.reason || "Update request validation failed",
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    // Calculate the update price
    const result = await RequestUpdatePricingCalculator.calculateUpdatePrice(
      body.registrationId,
      body.hotelChoice,
      body.roomType,
    );

    // Also get original pricing info for comparison
    const originalPricing =
      await RequestUpdatePricingCalculator.getOriginalPricingInfo(
        body.registrationId,
      );

    return NextResponse.json({
      ...result,
      originalPricing,
      updateType: "request_update",
    });
  } catch (error) {
    console.error("[REQUEST_UPDATE_PRICING_API] Error:", error);

    if (error instanceof Error) {
      // Handle specific business logic errors
      if (error.message.includes("Registration not found")) {
        return NextResponse.json(
          {
            error: "Registration not found",
            code: "REGISTRATION_NOT_FOUND",
          },
          { status: 404 },
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

      if (error.message.includes("not available after early bird")) {
        return NextResponse.json(
          {
            error: "In-quota options are not available after early bird period",
            code: "EARLY_BIRD_EXPIRED",
          },
          { status: 400 },
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
 * GET /api/pricing/calculate-update
 * Get original pricing information for a registration
 *
 * Query parameters:
 * - registrationId: string (required) - The registration ID
 */
export const GET = withAuditLogging(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const registrationId = url.searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId parameter is required" },
        { status: 400 },
      );
    }

    // Get original pricing information
    const originalPricing =
      await RequestUpdatePricingCalculator.getOriginalPricingInfo(
        registrationId,
      );

    return NextResponse.json({
      originalPricing,
      updateType: "request_update",
    });
  } catch (error) {
    console.error("[REQUEST_UPDATE_PRICING_API] GET Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Registration not found")) {
        return NextResponse.json(
          {
            error: "Registration not found",
            code: "REGISTRATION_NOT_FOUND",
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
          code: "GET_ERROR",
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
