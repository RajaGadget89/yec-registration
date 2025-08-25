// Re-export types and client-safe functions
export type { AuthenticatedUser, AuthSession } from "./auth-utils.server";
export type { AuthenticatedUser as ClientAuthenticatedUser } from "./auth-client";

// Re-export client-safe functions
export {
  getSupabaseAuth,
  getSupabaseBrowserClient,
  getClientUser,
} from "./auth-client";

// Re-export server functions for API routes and server components
export {
  getCurrentUser,
  getCurrentUserFromRequest,
  isAuthenticatedAdmin,
  isAuthenticatedSuperAdmin,
  isAuthenticated,
  hasRole,
  updateLastLogin,
  upsertAdminUser,
  serverLogout,
} from "./auth-utils.server";

// Re-export environment utilities
export {
  getAppUrl,
  getCookieOptions as cookieOptions,
  isProduction as isProd,
} from "./env";

/**
 * Check if email is in admin allowlist
 */
export function isAdmin(email: string): boolean {
  if (!email) return false;

  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
    [];
  return adminEmails.includes(email.toLowerCase());
}
