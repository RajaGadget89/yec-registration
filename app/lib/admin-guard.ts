/**
 * Admin access control utilities
 * Handles parsing of admin emails from environment variables and checking admin status
 */

import { getRolesForEmail } from "./rbac";

/**
 * Dev cookie name for development-only authentication
 */
export const DEV_COOKIE_NAME = "dev-user-email";

/**
 * Parses admin emails from environment variable
 * @returns Array of admin email addresses (lowercase, trimmed, de-duplicated)
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if the given email is in the admin allowlist
 * @param email - Email address to check (case-insensitive)
 * @returns true if email is in admin allowlist, false otherwise
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;

  // Development bypass for easier testing
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_ADMIN_BYPASS === "true"
  ) {
    console.log("[admin-guard] DEV_ADMIN_BYPASS enabled - allowing any email");
    return true;
  }

  // Check legacy admin emails
  const legacyAdmins = new Set(getAdminEmails());
  if (legacyAdmins.has(email.toLowerCase())) {
    return true;
  }

  // Check new RBAC system - any user with any admin role is considered an admin
  const roles = getRolesForEmail(email);
  return roles.size > 0;
}

/**
 * Gets the dev email from cookies for development-only authentication
 * @param req - Request object to extract cookies from
 * @returns Email from dev cookie or null if not found/invalid
 */
export function getDevEmailFromCookies(req: Request): string | null {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const m = cookieHeader.match(new RegExp(`${DEV_COOKIE_NAME}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Gets the current admin emails for debugging/logging purposes
 * @returns Array of admin emails (for logging only)
 */
export function getAdminEmailsForLogging(): string[] {
  return getAdminEmails();
}
