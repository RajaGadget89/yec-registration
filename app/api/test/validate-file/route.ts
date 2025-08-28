import { NextRequest, NextResponse } from "next/server";
import { validateFile, type ValidationDimension } from "../../../lib/files/validation";
import { fileValidationMessage, getLanguageFromHeader } from "../../../lib/i18n/file-validation";

/**
 * Gated E2E helper endpoint for file validation testing
 * Allows testing validation logic without uploading large files
 * Requires TEST_HELPERS_ENABLED=1 and CRON_SECRET authentication
 */
export async function POST(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.TEST_HELPERS_ENABLED === "1" ||
    process.env.E2E_TESTS === "true";
  
  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
  }

  // CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  
  if (!cronSecret || !authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Invalid CRON_SECRET" }, { status: 401 });
  }
  
  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Invalid CRON_SECRET" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dimension, mime, sizeBytes } = body;

    // Validate required fields
    if (!dimension || !mime || typeof sizeBytes !== 'number') {
      return NextResponse.json(
        { 
          error: "Missing required fields: dimension, mime, sizeBytes",
          code: "MISSING_FIELDS"
        },
        { status: 400 },
      );
    }

    // Validate dimension
    if (!['payment', 'profile', 'tcc'].includes(dimension)) {
      return NextResponse.json(
        { 
          error: "Invalid dimension. Must be 'payment', 'profile', or 'tcc'",
          code: "INVALID_DIMENSION"
        },
        { status: 400 },
      );
    }

    // Get language from Accept-Language header
    const acceptLanguage = request.headers.get("accept-language");
    const language = getLanguageFromHeader(acceptLanguage);

    // Validate file
    const validationResult = validateFile({
      dimension: dimension as ValidationDimension,
      mime,
      sizeBytes,
    });

    if (validationResult.ok) {
      return NextResponse.json({ ok: true });
    }

    // Generate localized error message
    const message = fileValidationMessage(
      validationResult.code!,
      language,
      {
        allowed: validationResult.allowed,
        limitBytes: validationResult.limitBytes,
      }
    );

    // Return structured error response matching production endpoints
    return NextResponse.json(
      {
        code: "FILE_VALIDATION_FAILED",
        errors: [
          {
            dimension,
            code: validationResult.code,
            message,
          },
        ],
      },
      { status: 422 },
    );
  } catch (error) {
    console.error("File validation test error:", error);
    return NextResponse.json(
      {
        error: "File validation test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
