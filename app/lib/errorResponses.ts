import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export interface ErrorResponse {
  code: string;
  hint: string;
  details?: string;
  errorId: string;
}

/**
 * Create a structured error response with appropriate HTTP status code
 */
export function createErrorResponse(
  code: string,
  hint: string,
  details?: string,
  status: number = 400,
): NextResponse<ErrorResponse> {
  const errorId = randomUUID();

  // Log error for debugging (in non-prod)
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR ${code}] ${hint}`, { errorId, details });
  }

  return NextResponse.json(
    {
      code,
      hint,
      details: process.env.NODE_ENV === "production" ? undefined : details,
      errorId,
    },
    { status },
  );
}

/**
 * Create a duplicate registration error response (409 Conflict)
 */
export function createDuplicateErrorResponse(
  field: string,
  value: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    "DUPLICATE_REGISTRATION",
    `Registration with this ${field} already exists.`,
    `${field}: ${value}`,
    409,
  );
}

/**
 * Create an unexpected error response (500 Internal Server Error)
 */
export function createUnexpectedErrorResponse(
  error: unknown,
  context: string,
): NextResponse<ErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorId = randomUUID();

  // Log full error for debugging
  console.error(`[UNEXPECTED_ERROR] ${context}:`, error);

  return NextResponse.json(
    {
      code: "UNEXPECTED_ERROR",
      hint: "An unexpected error occurred. Please try again.",
      details:
        process.env.NODE_ENV === "production"
          ? undefined
          : `${context}: ${errorMessage}`,
      errorId,
    },
    { status: 500 },
  );
}
