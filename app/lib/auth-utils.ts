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
 * Database-first approach with RBAC system fallback and legacy environment variable support
 */
export async function isAdmin(email: string): Promise<boolean> {
  if (!email) return false;

  try {
    // Step 1: Check database first
    const { getSupabaseServiceClient } = await import("./supabase-server");
    const supabase = getSupabaseServiceClient();

    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("email, role, is_active, status")
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .eq("status", "active")
      .single();

    if (!error && adminUser) {
      return true; // User exists in database and is active
    }

    // Step 2: Fall back to RBAC system (new approach for AC1-AC6)
    const { getRolesForEmail } = await import("./rbac");
    const roles = getRolesForEmail(email);
    if (roles.size > 0) {
      return true; // User has any admin role
    }

    // Step 3: Fall back to legacy ADMIN_EMAILS (backward compatibility)
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    return adminEmails.includes(email.toLowerCase());
  } catch {
    // Step 4: Environment fallback on any error
    try {
      const { getRolesForEmail } = await import("./rbac");
      const roles = getRolesForEmail(email);
      if (roles.size > 0) {
        return true;
      }
    } catch {
      // Ignore RBAC errors and continue to legacy fallback
    }

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    return adminEmails.includes(email.toLowerCase());
  }
}
