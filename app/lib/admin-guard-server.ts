import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "./admin-guard";
import { withAuditLogging } from "./audit/withAuditAccess";
import {
  getRolesForEmail,
  canReviewDimension,
  canApprove,
  type Dimension,
} from "./rbac";

/**
 * Admin guard wrapper for server-side functions
 * Ensures only authenticated admin users can access protected functionality
 */
export function withAdminGuard<T extends any[], R>(
  handler: (req: NextRequest, ...args: T) => Promise<R>,
) {
  return async (req: NextRequest, ...args: T): Promise<R> => {
    // Check admin authentication
    const adminEmail = req.cookies.get("admin-email")?.value;

    if (!adminEmail || !isAdmin(adminEmail)) {
      // Return 401/403 response for API routes
      if (req.nextUrl.pathname.startsWith("/api/")) {
        throw new Error("Unauthorized. Admin access required.");
      }

      // For non-API routes, redirect to login
      throw new Error("Admin authentication required");
    }

    // Log admin access for audit
    console.log(
      `[ADMIN_ACCESS] ${adminEmail} accessed ${req.nextUrl.pathname}`,
    );

    return handler(req, ...args);
  };
}

/**
 * Admin guard wrapper specifically for API routes
 * Returns proper HTTP responses for unauthorized access
 */
export function withAdminApiGuard<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
) {
  return withAuditLogging(
    async (req: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        // Check admin authentication
        const adminEmail = req.cookies.get("admin-email")?.value;

        if (!adminEmail || !isAdmin(adminEmail)) {
          return NextResponse.json(
            {
              error: "Unauthorized. Admin access required.",
              code: "ADMIN_ACCESS_REQUIRED",
            },
            { status: 401 },
          );
        }

        // Log admin access for audit
        console.log(
          `[ADMIN_API_ACCESS] ${adminEmail} accessed ${req.nextUrl.pathname}`,
        );

        return await handler(req, ...args);
      } catch (error) {
        console.error("[ADMIN_API_GUARD] Error:", error);

        if (error instanceof Error && error.message.includes("Unauthorized")) {
          return NextResponse.json(
            {
              error: "Unauthorized. Admin access required.",
              code: "ADMIN_ACCESS_REQUIRED",
            },
            { status: 401 },
          );
        }

        return NextResponse.json(
          {
            error: "Internal server error",
            code: "INTERNAL_ERROR",
          },
          { status: 500 },
        );
      }
    },
  );
}

/**
 * Admin guard wrapper for server actions (non-API routes)
 * Throws errors that can be caught by the calling function
 */
export function withAdminActionGuard<T extends any[], _R>(
  handler: (req: NextRequest, ...args: T) => Promise<_R>,
) {
  return async (req: NextRequest, ...args: T): Promise<_R> => {
    // Check admin authentication
    const adminEmail = req.cookies.get("admin-email")?.value;

    if (!adminEmail || !isAdmin(adminEmail)) {
      throw new Error("Admin authentication required");
    }

    // Log admin action for audit
    console.log(
      `[ADMIN_ACTION] ${adminEmail} performed action on ${req.nextUrl.pathname}`,
    );

    return handler(req, ...args);
  };
}

/**
 * Validates admin access and returns admin email if valid
 * @param req - NextRequest object
 * @returns {valid: boolean, adminEmail?: string, error?: string}
 */
export function validateAdminAccess(req: NextRequest): {
  valid: boolean;
  adminEmail?: string;
  error?: string;
} {
  const adminEmail = req.cookies.get("admin-email")?.value;

  // Development bypass for easier testing
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_ADMIN_BYPASS === "true"
  ) {
    console.log(
      "[admin-guard-server] DEV_ADMIN_BYPASS enabled - allowing access",
    );
    return { valid: true, adminEmail: "dev-admin@example.com" };
  }

  if (!adminEmail) {
    return { valid: false, error: "No admin email found in cookies" };
  }

  // Check if user has any RBAC roles
  const roles = getRolesForEmail(adminEmail);
  if (roles.size === 0) {
    return { valid: false, error: "Email not in admin allowlist" };
  }

  return { valid: true, adminEmail };
}

/**
 * Middleware function to check admin access for any route
 * Can be used in middleware.ts or individual route handlers
 */
export function checkAdminAccess(req: NextRequest): boolean {
  const adminEmail = req.cookies.get("admin-email")?.value;
  if (!adminEmail) return false;

  const roles = getRolesForEmail(adminEmail);
  return roles.size > 0;
}

/**
 * Validates if a user can review a specific dimension
 * @param req - NextRequest object
 * @param dimension - Dimension to check access for
 * @returns {valid: boolean, adminEmail?: string, error?: string}
 */
export function validateDimensionAccess(
  req: NextRequest,
  dimension: Dimension,
): {
  valid: boolean;
  adminEmail?: string;
  error?: string;
} {
  const adminEmail = req.cookies.get("admin-email")?.value;

  // Development bypass for easier testing
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_ADMIN_BYPASS === "true"
  ) {
    console.log(
      `[admin-guard-server] DEV_ADMIN_BYPASS enabled - allowing ${dimension} access`,
    );
    return { valid: true, adminEmail: "dev-admin@example.com" };
  }

  if (!adminEmail) {
    return { valid: false, error: "No admin email found in cookies" };
  }

  if (!canReviewDimension(adminEmail, dimension)) {
    return {
      valid: false,
      error: `Access denied. User does not have permission to review ${dimension} dimension.`,
    };
  }

  return { valid: true, adminEmail };
}

/**
 * Validates if a user can approve registrations
 * @param req - NextRequest object
 * @returns {valid: boolean, adminEmail?: string, error?: string}
 */
export function validateApprovalAccess(req: NextRequest): {
  valid: boolean;
  adminEmail?: string;
  error?: string;
} {
  const adminEmail = req.cookies.get("admin-email")?.value;

  // Development bypass for easier testing
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_ADMIN_BYPASS === "true"
  ) {
    console.log(
      "[admin-guard-server] DEV_ADMIN_BYPASS enabled - allowing approval access",
    );
    return { valid: true, adminEmail: "dev-admin@example.com" };
  }

  if (!adminEmail) {
    return { valid: false, error: "No admin email found in cookies" };
  }

  if (!canApprove(adminEmail)) {
    return {
      valid: false,
      error: "Access denied. Only super admin users can approve registrations.",
    };
  }

  return { valid: true, adminEmail };
}
