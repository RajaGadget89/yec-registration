import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { createErrorResponse } from "../../../lib/errorResponses";
// import { TokenService } from "../../../lib/tokenService"; // unused

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || url.searchParams.get("t");

    if (!token) {
      return createErrorResponse(
        "MISSING_TOKEN",
        "Token parameter required",
        "Token must be provided as a query parameter",
        400,
      );
    }

    // Validate token by looking it up directly in the database
    const supabase = getSupabaseServiceClient();

    const { data: tokenRow, error: tokenError } = await supabase
      .from("deep_link_tokens")
      .select("*")
      .eq("token_id", token)
      .single();

    if (tokenError || !tokenRow) {
      return createErrorResponse(
        "INVALID_TOKEN",
        "Invalid or expired token",
        "Token not found or expired",
        401,
      );
    }

    // Check if token is expired
    if (new Date(tokenRow.expires_at) < new Date()) {
      return createErrorResponse(
        "INVALID_TOKEN",
        "Invalid or expired token",
        "Token has expired",
        401,
      );
    }

    // Check if token is already used
    if (tokenRow.used_at) {
      return createErrorResponse(
        "INVALID_TOKEN",
        "Invalid or expired token",
        "Token has already been used",
        401,
      );
    }

    const tokenValidation = {
      success: true,
      registration_id: tokenRow.registration_id,
      dimension: tokenRow.dimension,
      admin_email: tokenRow.created_by || "api",
      notes: tokenRow.notes || "",
      message: "Token is valid",
    };

    const registrationId = tokenValidation.registration_id;

    // Get registration details
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (fetchError || !registration) {
      return createErrorResponse(
        "REGISTRATION_NOT_FOUND",
        "Registration not found",
        `Registration with ID ${registrationId} not found`,
        404,
      );
    }

    // Return token validation data with registration details
    return NextResponse.json({
      success: true,
      registration_id: registrationId,
      dimension: tokenValidation.dimension,
      admin_email: tokenValidation.admin_email,
      notes: tokenValidation.notes,
      message: tokenValidation.message,
      registration: {
        first_name: (registration as any).first_name,
        last_name: (registration as any).last_name,
        nickname: (registration as any).nickname,
        phone: (registration as any).phone,
        line_id: (registration as any).line_id,
        email: (registration as any).email,
        company_name: (registration as any).company_name,
        business_type: (registration as any).business_type,
        business_type_other: (registration as any).business_type_other,
        yec_province: (registration as any).yec_province,
        status: (registration as any).status,
        // TCC fields
        tcc_number: (registration as any).tcc_number || "",
        tcc_holder_name: (registration as any).tcc_holder_name || "",
      },
    });
  } catch (error) {
    console.error("Unexpected error in validate-token route:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}
