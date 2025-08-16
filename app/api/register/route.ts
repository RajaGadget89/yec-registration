import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../lib/supabase-server";
import {
  validateRegistrationData,
  mapFrontendToDatabase,
} from "../../components/RegistrationForm/formValidation";
import { generateAndUploadBadge } from "../../lib/generateBadge";
import { getThailandTimeISOString } from "../../lib/timezoneUtils";
import { EventService } from "../../lib/events/eventService";
import { PricingCalculator } from "../../lib/pricingCalculator";
import { EventFactory } from "../../lib/events/types";

// Ensure Node.js runtime for service role key access
export const runtime = "nodejs";

async function handlePOST(req: NextRequest) {
  console.log("[REGISTER_ROUTE] handlePOST called");

  try {
    // Log environment variables for debugging (without exposing sensitive data)
    console.log("Environment check:", {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
    });

    const body = await req.json();

    // Validate data against database constraints
    const validationErrors = validateRegistrationData(body);

    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      return NextResponse.json(
        {
          error: "Validation failed",
          message: validationErrors.join(", "), // Frontend expects 'message' field
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // Check if registration is still open
    const isRegistrationOpen = await PricingCalculator.isRegistrationOpen();
    if (!isRegistrationOpen) {
      return NextResponse.json(
        {
          error: "Registration closed",
          message:
            "Registration deadline has passed. Registration is no longer accepting new submissions.",
        },
        { status: 400 },
      );
    }

    // Calculate pricing
    let priceApplied: number | null = null;
    let currency: string = "THB";
    let selectedPackageCode: string | null = null;

    if (body.selectedPackage) {
      try {
        const pricingResult = await PricingCalculator.calculatePrice(
          body.selectedPackage,
        );
        priceApplied = pricingResult.price;
        currency = pricingResult.currency;
        selectedPackageCode = body.selectedPackage;
      } catch (error) {
        console.error("Pricing calculation failed:", error);
        return NextResponse.json(
          {
            error: "Pricing error",
            message:
              "Failed to calculate registration price. Please try again.",
          },
          { status: 500 },
        );
      }
    }

    // Map frontend data to database format
    const mappedData = mapFrontendToDatabase(body);

    // Generate badge and upload to Supabase
    let badgeUrl: string | null = null;
    try {
      console.log("Starting badge generation process...");
      badgeUrl = await generateAndUploadBadge(mappedData, body);
      console.log("Badge generation completed successfully:", badgeUrl);
    } catch (error) {
      console.error("Badge generation failed:", error);
      // Continue without badge if generation fails
      badgeUrl = null;
    }

    // Construct insert payload with Phase 1 status model
    const insertPayload = {
      ...mappedData,
      badge_url: badgeUrl,
      email_sent: false,
      // Phase 1: New status model
      status: "waiting_for_review" as const,
      update_reason: null,
      rejected_reason: null,
      // Phase 1: 3-track checklist - all pending initially
      payment_review_status: "pending" as const,
      profile_review_status: "pending" as const,
      tcc_review_status: "pending" as const,
      // Phase 1: Pricing fields
      price_applied: priceApplied,
      currency: currency,
      selected_package_code: selectedPackageCode,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
      form_data: body,
      created_at: getThailandTimeISOString(), // Use Thailand timezone
      updated_at: getThailandTimeISOString(),
    };

    const supabase = getSupabaseServiceClient();
    const { data: registration, error } = await supabase
      .from("registrations")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          error: "Database error",
          message: "Failed to save registration. Please try again.",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Emit registration submitted event for centralized side-effects
    try {
      const event = EventFactory.createRegistrationSubmitted(
        registration,
        priceApplied || undefined,
        selectedPackageCode || undefined,
      );
      await EventService.emit(event);
      console.log("Registration submitted event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting registration submitted event:", eventError);
      // Don't fail the registration if event emission fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message:
        "Registration submitted successfully and is waiting for admin review",
      registration_id: registration.registration_id,
      price_applied: priceApplied,
      currency: currency,
      is_early_bird: priceApplied
        ? await PricingCalculator.isEarlyBirdAvailable()
        : null,
    });
  } catch (error) {
    console.error("Unexpected error in registration route:", error);
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export { handlePOST as POST };
