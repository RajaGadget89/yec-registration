import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { createErrorResponse } from "../../../lib/errorResponses";
import { TokenService } from "../../../lib/tokenService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return createErrorResponse(
        "MISSING_TOKEN",
        "Token parameter required",
        "Token must be provided as a query parameter",
        400,
      );
    }

    // Validate token using TokenService
    const tokenValidation = await TokenService.validateTokenById(token);

    if (!tokenValidation.success) {
      return createErrorResponse(
        "INVALID_TOKEN",
        "Invalid or expired token",
        tokenValidation.message || "Token validation failed",
        401,
      );
    }

    const registrationId = tokenValidation.registration_id;

    // Get registration details
    const supabase = getSupabaseServiceClient();
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
