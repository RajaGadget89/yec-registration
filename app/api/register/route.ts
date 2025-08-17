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
import { precheckRegistration } from "../../lib/precheck";
import { createErrorResponse, createUnexpectedErrorResponse } from "../../lib/errorResponses";
import { logAccess } from "../../lib/audit/auditClient";

// Ensure Node.js runtime for service role key access
export const runtime = "nodejs";

async function handlePOST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log("[REGISTER_ROUTE] handlePOST called", { requestId });

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
        400
      );
    }

    // Precheck: Validate preconditions
    const precheckResult = await precheckRegistration();
    if (!precheckResult.success) {
      return createErrorResponse(
        precheckResult.code!,
        precheckResult.hint!,
        precheckResult.details,
        precheckResult.code === "REGISTRATION_CLOSED" ? 400 : 409
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
        return createErrorResponse(
          "PRICING_CALCULATION_FAILED",
          "Failed to calculate registration price. Please try again.",
          error instanceof Error ? error.message : "Unknown pricing error",
          400
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
      
      // Handle duplicate registration errors
      if (error.code === "23505") { // PostgreSQL unique constraint violation
        const constraint = error.details?.match(/Key \((.+)\)=/)?.[1];
        if (constraint?.includes("email")) {
          return createErrorResponse(
            "DUPLICATE_REGISTRATION",
            "A registration with this email address already exists.",
            `email: ${body.email}`,
            409
          );
        }
        if (constraint?.includes("registration_id")) {
          return createErrorResponse(
            "DUPLICATE_REGISTRATION",
            "Registration ID collision. Please try again.",
            `registration_id: ${insertPayload.registration_id}`,
            409
          );
        }
      }
      
      return createErrorResponse(
        "DATABASE_ERROR",
        "Failed to save registration. Please try again.",
        error.message,
        500
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
      const emailConfig = await import("../../lib/emails/config").then(m => m.getEmailConfig());
      const allowCheck = await import("../../lib/emails/config").then(m => m.isEmailAllowed(registration.email));
      
      if (!allowCheck.allowed) {
        emailDispatchStatus = "blocked";
        emailDispatchDetails = allowCheck.reason;
      } else if (emailConfig.mode === "DRY_RUN") {
        emailDispatchStatus = "dry_run";
        emailDispatchDetails = "EMAIL_MODE=DRY_RUN";
      } else {
        emailDispatchStatus = "sent";
        emailDispatchDetails = "Email queued for delivery";
      }
    } catch (eventError) {
      console.error("Error emitting registration submitted event:", eventError);
      emailDispatchStatus = "failed";
      emailDispatchDetails = eventError instanceof Error ? eventError.message : "Unknown error";
      // Don't fail the registration if event emission fails
    }

    // Return success response
    const response = {
      success: true,
      message:
        "Registration submitted successfully and is waiting for admin review",
      registration_id: registration.registration_id,
      price_applied: priceApplied,
      currency: currency,
      is_early_bird: priceApplied
        ? await PricingCalculator.isEarlyBirdAvailable()
        : null,
    };

    // Add email dispatch status in non-prod
    if (process.env.NODE_ENV !== "production") {
      (response as any).emailDispatch = emailDispatchStatus;
      (response as any).emailDispatchDetails = emailDispatchDetails;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in registration route:", error);
    return createUnexpectedErrorResponse(error, "registration route");
  } finally {
    // Log access for audit
    const latency = Date.now() - startTime;
    try {
      await logAccess({
        action: "registration.submit",
        method: "POST",
        resource: "/api/register",
        result: "success",
        request_id: requestId,
        src_ip: req.headers.get("x-forwarded-for") || undefined,
        user_agent: req.headers.get("user-agent") || undefined,
        latency_ms: latency,
      });
    } catch (auditError) {
      console.error("Failed to log access:", auditError);
    }
  }
}

export { handlePOST as POST };
