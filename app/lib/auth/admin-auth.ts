import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "../supabase-server";
import { getRolesForEmail } from "../rbac";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AdminValidationResult {
  valid: boolean;
  user?: AdminUser;
  error?: string;
}

/**
 * Validates admin access with database-first approach
 * Checks both database and environment-based admin lists
 */
export async function validateAdminAccess(
  request: NextRequest,
): Promise<AdminValidationResult> {
  try {
    // Get admin email from cookies
    const adminEmail = request.cookies.get("admin-email")?.value;

    if (!adminEmail) {
      return {
        valid: false,
        error: "No admin email found in cookies",
      };
    }

    // Development bypass for easier testing
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DEV_ADMIN_BYPASS === "true"
    ) {
      console.log("[ADMIN_AUTH] DEV_ADMIN_BYPASS enabled - allowing access");
      return {
        valid: true,
        user: {
          id: "dev-admin-id",
          email: adminEmail,
          role: "super_admin",
          is_active: true,
        },
      };
    }

    // Step 1: Check database first
    try {
      const supabase = getSupabaseServiceClient();
      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("id, email, role, is_active")
        .eq("email", adminEmail)
        .single();

      if (error || !adminUser) {
        console.log(
          "[ADMIN_AUTH] Database check failed, falling back to environment-based admin check",
        );

        // Step 2: Fall back to environment-based admin check
        const roles = getRolesForEmail(adminEmail);
        if (roles.size > 0) {
          return {
            valid: true,
            user: {
              id: "env-admin-id",
              email: adminEmail,
              role: Array.from(roles)[0], // Use first role
              is_active: true,
            },
          };
        }

        // Step 3: Check legacy admin emails
        const legacyAdmins = new Set(
          process.env.ADMIN_EMAILS?.split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean) || [],
        );

        if (legacyAdmins.has(adminEmail.toLowerCase())) {
          return {
            valid: true,
            user: {
              id: "legacy-admin-id",
              email: adminEmail,
              role: "admin",
              is_active: true,
            },
          };
        }

        return {
          valid: false,
          error: "Email not in admin allowlist",
        };
      }

      // Database check succeeded
      if (!adminUser.is_active) {
        return {
          valid: false,
          error: "Admin account is not active",
        };
      }

      return {
        valid: true,
        user: adminUser as AdminUser,
      };
    } catch (dbError) {
      console.error(
        "[ADMIN_AUTH] Database error, falling back to environment-based admin check:",
        dbError,
      );

      // Fallback to environment-based admin check
      const roles = getRolesForEmail(adminEmail);
      if (roles.size > 0) {
        return {
          valid: true,
          user: {
            id: "env-admin-id",
            email: adminEmail,
            role: Array.from(roles)[0], // Use first role
            is_active: true,
          },
        };
      }

      return {
        valid: false,
        error: "Database error and email not in admin allowlist",
      };
    }
  } catch (error) {
    console.error("[ADMIN_AUTH] Error validating admin access:", error);
    return {
      valid: false,
      error: "Internal error validating admin access",
    };
  }
}

/**
 * Validates super admin access specifically
 * Only allows users with super_admin role
 */
export async function validateSuperAdminAccess(
  request: NextRequest,
): Promise<AdminValidationResult> {
  const adminValidation = await validateAdminAccess(request);

  if (!adminValidation.valid) {
    return adminValidation;
  }

  // Check if user has super_admin role
  if (adminValidation.user?.role !== "super_admin") {
    return {
      valid: false,
      error: "Super admin access required",
    };
  }

  return adminValidation;
}

/**
 * Validates admin access for specific role
 */
export async function validateRoleAccess(
  request: NextRequest,
  requiredRole: string,
): Promise<AdminValidationResult> {
  const adminValidation = await validateAdminAccess(request);

  if (!adminValidation.valid) {
    return adminValidation;
  }

  // Check if user has required role
  if (adminValidation.user?.role !== requiredRole) {
    return {
      valid: false,
      error: `${requiredRole} access required`,
    };
  }

  return adminValidation;
}

/**
 * Checks if user has specific role
 */
export function hasRole(user: AdminUser, role: string): boolean {
  return user.role === role;
}

/**
 * Checks if user is super admin
 */
export function isSuperAdmin(user: AdminUser): boolean {
  return user.role === "super_admin";
}

/**
 * Checks if user is active
 */
export function isActive(user: AdminUser): boolean {
  return user.is_active;
}
