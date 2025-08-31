import { NextResponse } from "next/server";

/**
 * Error mapping helper for invitation endpoints
 * Normalizes error responses with consistent codes and formats
 */

export interface InvitationErrorResponse {
  code: string;
  error?: string;
  request_id?: string;
}

/**
 * Create a 410 Gone response for invalid/expired/revoked tokens
 */
export function gone(data: InvitationErrorResponse): NextResponse {
  // Add error messages based on code if not provided
  const response = { ...data };
  if (!response.error) {
    switch (data.code) {
      case INVITATION_ERROR_CODES.INVALID_TOKEN:
        response.error = "Invalid invitation token";
        break;
      case INVITATION_ERROR_CODES.EXPIRED_TOKEN:
        response.error = "Invitation has expired";
        break;
      case INVITATION_ERROR_CODES.REVOKED_TOKEN:
        response.error = "Invitation has been revoked";
        break;
      case INVITATION_ERROR_CODES.ALREADY_ACCEPTED:
        response.error = "Invitation has already been accepted";
        break;
      default:
        response.error = "Invalid invitation";
    }
  }
  return NextResponse.json(response, { status: 410 });
}

/**
 * Create a 409 Conflict response for already accepted invitations
 */
export function conflict(data: InvitationErrorResponse): NextResponse {
  return NextResponse.json(data, { status: 409 });
}

/**
 * Create a 200 OK response for successful operations
 */
export function ok(data: any): NextResponse {
  return NextResponse.json(data, { status: 200 });
}

/**
 * Create a 201 Created response for successful creation operations
 */
export function created(data: any): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Error codes for invitation endpoints
 */
export const INVITATION_ERROR_CODES = {
  INVALID_TOKEN: "INVALID_TOKEN",
  EXPIRED_TOKEN: "EXPIRED_TOKEN",
  REVOKED_TOKEN: "REVOKED_TOKEN",
  ALREADY_ACCEPTED: "ALREADY_ACCEPTED",
  INVALID_INVITATION: "INVALID_INVITATION",
} as const;
