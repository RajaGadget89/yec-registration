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
 * Check admin access status with detailed error information
 * Returns specific status for suspended users vs not in allowlist
 */
export async function checkAdminAccess(email: string): Promise<{
  allowed: boolean;
  reason: "active" | "suspended" | "not_in_allowlist" | "not_found";
}> {
  if (!email) return { allowed: false, reason: "not_found" };

  try {
    // Step 1: Check database first
    const { getSupabaseServiceClient } = await import("./supabase-server");
    const supabase = getSupabaseServiceClient();

    console.log(
      "[checkAdminAccess] Querying database for:",
      email.toLowerCase(),
    );
    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("email, role, is_active, status")
      .eq("email", email.toLowerCase())
      .single();

    console.log("[checkAdminAccess] Database query result:", {
      adminUser,
      error,
    });

    if (error || !adminUser) {
      // User not found in database, check RBAC fallback
      const { getRolesForEmail } = await import("./rbac");
      const roles = getRolesForEmail(email);
      if (roles.size > 0) {
        return { allowed: true, reason: "active" };
      }

      // Check legacy ADMIN_EMAILS
      const adminEmails =
        process.env.ADMIN_EMAILS?.split(",").map((e) =>
          e.trim().toLowerCase(),
        ) || [];
      if (adminEmails.includes(email.toLowerCase())) {
        return { allowed: true, reason: "active" };
      }

      return { allowed: false, reason: "not_in_allowlist" };
    }

    // User exists in database
    console.log("[checkAdminAccess] User found in database:", {
      email: adminUser.email,
      is_active: adminUser.is_active,
      status: adminUser.status,
    });

    if (adminUser.is_active && adminUser.status === "active") {
      console.log("[checkAdminAccess] User is active");
      return { allowed: true, reason: "active" };
    }

    if (adminUser.status === "suspended") {
      console.log("[checkAdminAccess] User is suspended");
      return { allowed: false, reason: "suspended" };
    }

    console.log(
      "[checkAdminAccess] User exists but not active/suspended, reason: not_in_allowlist",
    );
    return { allowed: false, reason: "not_in_allowlist" };
  } catch {
    // Step 4: Environment fallback on any error
    try {
      const { getRolesForEmail } = await import("./rbac");
      const roles = getRolesForEmail(email);
      if (roles.size > 0) {
        return { allowed: true, reason: "active" };
      }
    } catch {
      // Ignore RBAC errors and continue to legacy fallback
    }

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    if (adminEmails.includes(email.toLowerCase())) {
      return { allowed: true, reason: "active" };
    }

    return { allowed: false, reason: "not_in_allowlist" };
  }
}

/**
 * Check if email is in admin allowlist
 * Database-first approach with RBAC system fallback and legacy environment variable support
 */
export async function isAdmin(email: string): Promise<boolean> {
  const result = await checkAdminAccess(email);
  return result.allowed;
}
