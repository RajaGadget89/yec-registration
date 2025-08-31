import { z } from "zod";

// Validation schemas for admin management APIs

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  roles: z
    .array(z.enum(["admin", "super_admin"]))
    .min(1, "At least one role is required"),
});

export const acceptSchema = z.object({
  name: z.string().optional(),
});

export const updateAdminSchema = z.object({
  add_roles: z.array(z.enum(["admin", "super_admin"])).optional(),
  remove_roles: z.array(z.enum(["admin", "super_admin"])).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export const listAdminsSchema = z.object({
  search: z.string().optional(),
  role: z.enum(["admin", "super_admin"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  page: z.coerce.number().min(1).default(1),
  size: z.coerce.number().min(1).max(50).default(20),
});

// Error codes for consistent error responses
export const ERROR_CODES = {
  UNAUTHENTICATED: "unauthenticated",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  DUPLICATE_INVITATION: "duplicate_invitation",
  LAST_SUPER_ADMIN_FORBIDDEN: "last_super_admin_forbidden",
  SELF_CHANGE_FORBIDDEN: "self_change_forbidden",
  INVITATION_INVALID_OR_EXPIRED: "invitation_invalid_or_expired",
  VALIDATION_ERROR: "validation_error",
  RATE_LIMITED: "rate_limited",
} as const;

// Validation functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRoles(roles: string[]): boolean {
  const validRoles = ["admin", "super_admin"];
  return roles.every(role => validRoles.includes(role));
}

export function sanitizeSearchQuery(search: string): string {
  // Remove potentially dangerous characters and limit length
  return search
    .replace(/[<>]/g, "") // Remove angle brackets
    .substring(0, 100); // Limit length
}

export function validatePagination(page: number, size: number): boolean {
  return page >= 1 && size >= 1 && size <= 50;
}

// Error response helpers
export function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: any
) {
  return {
    error: message,
    code,
    ...(details && { details }),
  };
}

export function createValidationErrorResponse(validationError: z.ZodError) {
  return createErrorResponse(
    422,
    ERROR_CODES.VALIDATION_ERROR,
    "Validation failed",
    validationError.errors
  );
}

// Rate limiting error response
export function createRateLimitErrorResponse(
  retryAfter: number,
  limit: number,
  remaining: number,
  resetTime: number
) {
  return {
    error: "Rate limit exceeded",
    code: ERROR_CODES.RATE_LIMITED,
    retryAfter,
    headers: {
      "Retry-After": retryAfter.toString(),
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": new Date(resetTime).toISOString(),
    },
  };
}
