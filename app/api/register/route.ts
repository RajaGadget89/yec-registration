import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../lib/supabase-server";
import {
  validateRegistrationData,
  mapFrontendToDatabase,
} from "../../components/RegistrationForm/formValidation";
import { generateAndUploadBadge } from "../../lib/generateBadge";
import { getThailandTimeISOString } from "../../lib/timezoneUtils";
import { EventService } from "../../lib/events/eventService";
import { DynamicPricingCalculator } from "../../lib/dynamicPricingCalculator";
import { EventFactory } from "../../lib/events/eventFactory";
import { precheckRegistration } from "../../lib/precheck";
import {
  createErrorResponse,
  createUnexpectedErrorResponse,
} from "../../lib/errorResponses";
import { withAuditLogging } from "../../lib/audit/withAuditAccess";
import { getProvinceCode } from "../../lib/provinceCodes";

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
      return createErrorResponse(
        "VALIDATION_FAILED",
        "Registration data validation failed",
        validationErrors.join(", "),
        400,
      );
    }

    // Precheck: Validate preconditions
    const precheckResult = await precheckRegistration();
    if (!precheckResult.success) {
      return createErrorResponse(
        precheckResult.code!,
        precheckResult.hint!,
        precheckResult.details,
        precheckResult.code === "REGISTRATION_CLOSED" ? 400 : 409,
      );
    }

    // Calculate pricing using new dynamic pricing system
    let priceApplied: number | null = null;
    let currency: string = "THB";
    let selectedPackageCode: string | null = null;
    let priceBreakdown: any = null;
    let isEarlyBird: boolean | null = null;

    try {
      const pricingResult = await DynamicPricingCalculator.calculatePrice(
        body.hotelChoice,
        body.roomType,
        new Date(),
      );

      priceApplied = pricingResult.price;
      currency = pricingResult.currency;
      selectedPackageCode = pricingResult.packageCode;
      priceBreakdown = pricingResult.breakdown;
      isEarlyBird = pricingResult.isEarlyBird;

      console.log("[REGISTER_ROUTE] Pricing calculated:", {
        price: priceApplied,
        currency,
        packageCode: selectedPackageCode,
        isEarlyBird,
        breakdown: priceBreakdown,
      });
    } catch (error) {
      console.error("Pricing calculation failed:", error);
      return createErrorResponse(
        "PRICING_CALCULATION_FAILED",
        "Failed to calculate registration price. Please try again.",
        error instanceof Error ? error.message : "Unknown pricing error",
        400,
      );
    }

    // Map frontend data to database format
    const mappedData = mapFrontendToDatabase(body);

    // Initialize Supabase client first
    const supabase = getSupabaseServiceClient();

    // Generate tracking code first
    let trackingCode: string | null = null;
    try {
      const provinceCode = getProvinceCode(mappedData.yec_province);
      const { data: genCode, error: genErr } = await (supabase as any).rpc(
        "generate_tracking_code",
        { p_province_code: provinceCode },
      );
      if (genErr) throw genErr;
      trackingCode = genCode as string;
    } catch (genError) {
      console.error("Failed to generate tracking code:", genError);
      return createErrorResponse(
        "TRACKING_CODE_FAILED",
        "Failed to generate tracking code",
        genError instanceof Error ? genError.message : String(genError),
        500,
      );
    }

    // Update mappedData with the generated tracking code
    const mappedDataWithTracking = {
      ...mappedData,
      registration_id: trackingCode,
    };

    // Generate badge and upload to Supabase
    let badgeUrl: string | null = null;
    try {
      console.log(
        "Starting badge generation process with tracking code:",
        trackingCode,
      );
      badgeUrl = await generateAndUploadBadge(mappedDataWithTracking, body);
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
      // Phase 1: Comprehensive review workflow - required by database constraint
      review_checklist: {
        payment: {
          status: "pending" as const,
        },
        profile: {
          status: "pending" as const,
        },
        tcc: {
          status: "pending" as const,
        },
      },
      // Phase 1: Pricing fields
      price_applied: priceApplied,
      currency: currency,
      selected_package_code: selectedPackageCode,
      // New pricing system fields
      price_breakdown: priceBreakdown,
      is_early_bird: isEarlyBird,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
      form_data: body,
      created_at: getThailandTimeISOString(), // Use Thailand timezone
      updated_at: getThailandTimeISOString(),
    };

    // trackingCode already generated above for badge generation

    const { data: registration, error } = await (supabase as any)
      .from("registrations")
      .insert([{ ...insertPayload, registration_id: trackingCode }])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);

      // Handle duplicate registration errors
      if (error.code === "23505") {
        // PostgreSQL unique constraint violation
        const constraint = error.details?.match(/Key \((.+)\)=/)?.[1];
        if (constraint?.includes("email")) {
          return createErrorResponse(
            "DUPLICATE_REGISTRATION",
            "A registration with this email address already exists.",
            `email: ${body.email}`,
            409,
          );
        }
        if (constraint?.includes("registration_id")) {
          return createErrorResponse(
            "DUPLICATE_REGISTRATION",
            "Registration ID collision. Please try again.",
            `registration_id: ${insertPayload.registration_id}`,
            409,
          );
        }
      }

      return createErrorResponse(
        "DATABASE_ERROR",
        "Failed to save registration. Please try again.",
        error.message,
        500,
      );
    }

    // Emit registration submitted event for centralized side-effects
    let emailDispatchStatus = "success";
    let emailDispatchDetails = "";
    try {
      const event = EventFactory.createRegistrationSubmitted(
        registration,
        priceApplied || undefined,
        selectedPackageCode || undefined,
      );
      await EventService.emit(event);
      console.log("Registration submitted event emitted successfully");

      // Check if email was actually sent or blocked
      const emailConfig = await import("../../lib/emails/config").then((m) =>
        m.getEmailConfig(),
      );
      const allowCheck = await import("../../lib/emails/config").then((m) =>
        m.isEmailAllowed((registration as any).email),
      );

      if (!allowCheck.allowed) {
        emailDispatchStatus = "blocked";
        emailDispatchDetails = allowCheck.reason;
      } else if (emailConfig.mode === "DRY_RUN") {
        emailDispatchStatus = "dry_run";
        emailDispatchDetails = "EMAIL_MODE=DRY_RUN";
      } else {
        emailDispatchStatus = "sent";
        emailDispatchDetails = "Email queued for delivery";

        // In development or preview, dispatch emails immediately since cron job doesn't run in these environments
        if (
          process.env.NODE_ENV === "development" ||
          process.env.VERCEL_ENV === "preview"
        ) {
          try {
            const { dispatchEmailBatch } = await import(
              "../../lib/emails/dispatcher"
            );
            const dispatchResult = await dispatchEmailBatch(10, false); // Dispatch up to 10 emails

            if (dispatchResult.sent > 0) {
              emailDispatchDetails = `Email dispatched immediately (${dispatchResult.sent} sent)`;
            } else if (dispatchResult.errors > 0) {
              emailDispatchDetails = `Email dispatch failed (${dispatchResult.errors} errors)`;
            }
          } catch (dispatchError) {
            console.warn(
              "Failed to dispatch emails immediately:",
              dispatchError,
            );
            emailDispatchDetails = "Email queued (dispatch failed)";
          }
        }
      }
    } catch (eventError) {
      console.error("Error emitting registration submitted event:", eventError);
      emailDispatchStatus = "failed";
      emailDispatchDetails =
        eventError instanceof Error ? eventError.message : "Unknown error";
      // Don't fail the registration if event emission fails
    }

    // Return success response
    const response = {
      success: true,
      message:
        "Registration submitted successfully and is waiting for admin review",

      registration_id: (registration as any).registration_id,

      price_applied: priceApplied,
      currency: currency,
      is_early_bird: isEarlyBird,
      price_breakdown: priceBreakdown,
      selected_package_code: selectedPackageCode,
    };

    // Add email dispatch status in non-prod or preview environments
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.VERCEL_ENV === "preview"
    ) {
      (response as any).emailDispatch = emailDispatchStatus;
      (response as any).emailDispatchDetails = emailDispatchDetails;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in registration route:", error);
    return createUnexpectedErrorResponse(error, "registration route");
  }
}

// Export the wrapped handler for audit compliance
export const POST = withAuditLogging(handlePOST);
