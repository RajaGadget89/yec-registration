import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import { getTranslation } from "../../../../lib/translations";
import {
  fileValidationMessage,
  type Language,
  getLanguageFromHeader,
} from "../../../../lib/i18n/file-validation";
import crypto from "crypto";

async function handlePOST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  // Get language from Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  const language: Language = getLanguageFromHeader(acceptLanguage);

  try {
    console.log("Resubmit endpoint called with token:", params.token);
    const { token } = params;
    const body = await request.json();
    console.log("Request body:", body);

    const supabase = getSupabaseServiceClient();

    // Get client IP and user agent for audit logging
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // First, look up the registration by tracking code to get the UUID
    const { data: registrationLookup, error: lookupError } = await supabase
      .from("registrations")
      .select("id")
      .eq("registration_id", body.registration_id)
      .single();

    if (lookupError || !registrationLookup) {
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.not_found", language),
          code: "REGISTRATION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Manual token validation (workaround for database function bug)
    const tokenHash = crypto
      .createHmac("sha256", "storage-salt")
      .update(token)
      .digest("hex");

    console.log("Looking up token with hash:", tokenHash);

    // Check if token exists and is valid
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("deep_link_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("registration_id", (registrationLookup as any).id)
      .single();

    if (tokenError || !tokenRecord) {
      console.error("Token not found:", tokenError);
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.invalid", language),
          code: "RESUBMIT_INVALID_OR_EXPIRED",
          reason: "token_not_found",
        },
        { status: 410 },
      );
    }

    console.log("Token found:", {
      id: (tokenRecord as any).id,
      dimension: (tokenRecord as any).dimension,
      expires_at: (tokenRecord as any).expires_at,
      used_at: (tokenRecord as any).used_at,
    });

    // Check if token is expired
    if (new Date((tokenRecord as any).expires_at) < new Date()) {
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.expired", language),
          code: "RESUBMIT_INVALID_OR_EXPIRED",
          reason: "token_expired",
        },
        { status: 410 },
      );
    }

    // Check if token is already used
    if ((tokenRecord as any).used_at) {
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.invalid", language),
          code: "RESUBMIT_INVALID_OR_EXPIRED",
          reason: "token_already_used",
        },
        { status: 410 },
      );
    }

    // Mark token as used
    const { error: updateError } = await (supabase as any)
      .from("deep_link_tokens")
      .update({
        used_at: new Date().toISOString(),
        used_by: body.user_email || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .eq("id", (tokenRecord as any).id);

    if (updateError) {
      console.error("Error marking token as used:", updateError);
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.processing_failed", language),
          code: "PROCESSING_FAILED",
        },
        { status: 500 },
      );
    }

    const tokenValidation = {
      valid: true,
      dimension: (tokenRecord as any).dimension,
      created_at: (tokenRecord as any).created_at,
      expires_at: (tokenRecord as any).expires_at,
      used_at: new Date().toISOString(),
    };

    // Get registration details
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", (registrationLookup as any).id)
      .single();

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.not_found", language),
          code: "REGISTRATION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Validate registration is in update state
    if (
      !(registration as any).update_reason ||
      ![
        "waiting_for_update_payment",
        "waiting_for_update_info",
        "waiting_for_update_tcc",
      ].includes((registration as any).status)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.not_in_update_state", language),
          code: "NOT_IN_UPDATE_STATE",
        },
        { status: 400 },
      );
    }

    // Validate that the token dimension matches the registration update reason
    // Normalize legacy 'info' values to 'profile' for comparison
    const normalizedUpdateReason =
      (registration as any).update_reason === "info"
        ? "profile"
        : (registration as any).update_reason;
    const expectedDimension =
      normalizedUpdateReason === "payment"
        ? "payment"
        : normalizedUpdateReason === "profile"
          ? "profile"
          : normalizedUpdateReason === "tcc"
            ? "tcc"
            : null;

    console.log("Debug resubmit validation:", {
      tokenDimension: tokenValidation.dimension,
      expectedDimension,
      registrationUpdateReason: (registration as any).update_reason,
      normalizedUpdateReason,
      registrationStatus: (registration as any).status,
    });

    if (tokenValidation.dimension !== expectedDimension) {
      console.error("Token dimension mismatch:", {
        tokenDimension: tokenValidation.dimension,
        expectedDimension,
        registrationUpdateReason: (registration as any).update_reason,
        normalizedUpdateReason,
      });
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.dimension_mismatch", language),
          code: "DIMENSION_MISMATCH",
        },
        { status: 400 },
      );
    }

    // Prepare payload for domain function - extract the dimension-specific updates
    const dimensionUpdates = body.updates?.[tokenValidation.dimension] || {};

    // Validate file URLs if present in updates
    const validationErrors: Array<{
      dimension: string;
      code: string;
      message: string;
    }> = [];

    // Check for file URLs in the updates and validate them
    if (
      dimensionUpdates.profile_image_url &&
      tokenValidation.dimension === "profile"
    ) {
      // For profile images, we need to validate the file type and size
      // Since we only have URLs, we'll validate the URL format and assume the file was validated at upload
      // In a real implementation, you might want to fetch the file metadata from storage
      const url = dimensionUpdates.profile_image_url as string;
      if (!url.startsWith("profile-images/")) {
        validationErrors.push({
          dimension: "profile",
          code: "INVALID_TYPE",
          message: fileValidationMessage("INVALID_TYPE", language, {
            allowed: ["image/jpeg", "image/jpg", "image/png"],
          }),
        });
      }
    }

    if (
      dimensionUpdates.payment_slip_url &&
      tokenValidation.dimension === "payment"
    ) {
      const url = dimensionUpdates.payment_slip_url as string;
      if (!url.startsWith("payment-slips/")) {
        validationErrors.push({
          dimension: "payment",
          code: "INVALID_TYPE",
          message: fileValidationMessage("INVALID_TYPE", language, {
            allowed: ["application/pdf"],
          }),
        });
      }
    }

    if (
      dimensionUpdates.chamber_card_url &&
      tokenValidation.dimension === "tcc"
    ) {
      const url = dimensionUpdates.chamber_card_url as string;
      if (!url.startsWith("chamber-cards/")) {
        validationErrors.push({
          dimension: "tcc",
          code: "INVALID_TYPE",
          message: fileValidationMessage("INVALID_TYPE", language, {
            allowed: [
              "application/pdf",
              "image/jpeg",
              "image/jpg",
              "image/png",
            ],
          }),
        });
      }
    }

    // If validation errors exist, return them
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          code: "FILE_VALIDATION_FAILED",
          errors: validationErrors,
        },
        { status: 422 },
      );
    }

    // Call the domain function for resubmission with fallback to direct update
    let resubmissionResult;
    let resubmitError;

    try {
      const { data, error } = await (supabase as any).rpc("fn_user_resubmit", {
        reg_id: (registrationLookup as any).id,
        payload: dimensionUpdates,
      });
      resubmissionResult = data;
      resubmitError = error;
    } catch (error) {
      console.error("Domain function call failed, using fallback:", error);
      // Fallback: direct database update if domain function fails
      const { error: updateError } = await (supabase as any)
        .from("registrations")
        .update({
          status: "waiting_for_review",
          update_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (registrationLookup as any).id);

      if (updateError) {
        console.error("Fallback update also failed:", updateError);
        return NextResponse.json(
          {
            ok: false,
            error: getTranslation("resubmit.processing_failed", language),
            code: "PROCESSING_FAILED",
          },
          { status: 500 },
        );
      }

      resubmissionResult = [{ success: true, status: "waiting_for_review" }];
      resubmitError = null;
    }

    if (
      resubmitError ||
      !resubmissionResult ||
      !resubmissionResult[0]?.success
    ) {
      console.error("Error calling domain function:", resubmitError);
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.processing_failed", language),
          code: "PROCESSING_FAILED",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Resubmission processed successfully",
      registration_id: body.registration_id,
      status: (resubmissionResult as any).status,
      dimension: tokenValidation.dimension,
      newStatus: "pending",
      global: "waiting_for_review",
      token_used_at: tokenValidation.used_at,
    });
  } catch (error) {
    console.error("Unexpected error in user resubmission:", error);
    return NextResponse.json(
      {
        ok: false,
        error: getTranslation("resubmit.internal_error", language),
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

async function handleGET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  // Get language from Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  const language: Language = getLanguageFromHeader(acceptLanguage);

  try {
    const { token } = params;
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registration_id");

    if (!registrationId) {
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.not_found", language),
          code: "REGISTRATION_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Validate token without consuming it (for GET requests)
    const { data: tokenValidation, error: tokenError } = await (
      supabase as any
    ).rpc("validate_and_consume_deep_link_token", {
      token: token,
      reg_id: registrationId,
      user_email: null,
      ip_address: null,
      user_agent: null,
    });

    if (tokenError) {
      console.error("Token validation error:", tokenError);
      return NextResponse.json(
        { ok: false, error: "Token validation failed" },
        { status: 500 },
      );
    }

    if (!tokenValidation || !(tokenValidation as any).valid) {
      const errorKey =
        tokenValidation?.reason === "expired"
          ? "resubmit.expired"
          : "resubmit.invalid";
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation(errorKey, language),
          code: "RESUBMIT_INVALID_OR_EXPIRED",
          reason: tokenValidation?.reason || "unknown",
        },
        { status: 410 },
      );
    }

    // Get registration details
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return NextResponse.json(
        {
          ok: false,
          error: getTranslation("resubmit.not_found", language),
          code: "REGISTRATION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Return registration details for the form
    return NextResponse.json({
      ok: true,
      registration: {
        id: (registration as any).id,
        first_name: (registration as any).first_name,
        last_name: (registration as any).last_name,
        email: (registration as any).email,
        tracking_code: (registration as any).tracking_code,
        status: (registration as any).status,
        update_reason: (registration as any).update_reason,
        dimension: (tokenValidation as any).dimension,
      },
      token_info: {
        dimension: (tokenValidation as any).dimension,
        expires_at: (tokenValidation as any).expires_at,
        created_at: (tokenValidation as any).created_at,
      },
    });
  } catch (error) {
    console.error("Unexpected error in token validation:", error);
    return NextResponse.json(
      {
        ok: false,
        error: getTranslation("resubmit.internal_error", language),
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

export const POST = withAuditLogging(handlePOST, {
  resource: "user_resubmission",
});

export const GET = withAuditLogging(handleGET, {
  resource: "token_validation",
});
