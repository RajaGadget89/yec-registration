import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { AdminUser } from "../types/database";
import { assertDbRouting } from "./env-guards";
import { getSupabaseServiceClient } from "./supabase-server";

/**
 * Interface for authenticated user data
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  business_roles: string[];
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

/**
 * Interface for auth session data
 */
export interface AuthSession {
  user: AuthenticatedUser;
  access_token: string;
  refresh_token: string;
}

/**
 * Get Supabase client for server-side operations
 */
function getSupabaseClient() {
  // Validate database routing
  assertDbRouting();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: () => {},
          remove: () => {},
        },
      },
    );
    const {
      data: { user },
    } = await supa.auth.getUser();

    // If no Supabase session, try to get admin email from cookie as fallback
    let adminEmail = user?.email;
    if (!adminEmail) {
      const adminEmailCookie = cookieStore.get("admin-email")?.value;
      const checkerEmailCookie = cookieStore.get("checker-email")?.value;

      if (adminEmailCookie) {
        adminEmail = decodeURIComponent(adminEmailCookie);
        console.log(
          `[AUTH] No Supabase session, but found admin-email cookie: ${adminEmail}`,
        );
      } else if (checkerEmailCookie) {
        adminEmail = decodeURIComponent(checkerEmailCookie);
        console.log(
          `[AUTH] No Supabase session, but found checker-email cookie: ${adminEmail}`,
        );
      }
    }

    if (!adminEmail) return null;

    // Try database first
    try {
      const svc = getSupabaseServiceClient();
      const { data: adminUser } = await svc
        .from("admin_users")
        .select("*")
        .eq("email", adminEmail.toLowerCase())
        .eq("is_active", true)
        .eq("status", "active")
        .single();

      if (adminUser) {
        return {
          id: (adminUser as any).id,
          email: (adminUser as any).email,
          role: (adminUser as any).role,
          business_roles: (adminUser as any).business_roles || [],
          created_at: (adminUser as any).created_at,
          updated_at: (adminUser as any).updated_at,
          last_login_at: (adminUser as any).last_login_at,
          is_active: (adminUser as any).is_active,
        };
      }
    } catch (dbError) {
      console.log(
        "[auth] Database query failed, falling back to RBAC:",
        dbError,
      );
    }

    // Fall back to RBAC system when database is unavailable
    const { getRolesForEmail, getBusinessRoles } = await import("./rbac");
    const roles = getRolesForEmail(adminEmail);
    if (roles.size > 0) {
      const businessRoles = await getBusinessRoles(adminEmail);
      return {
        id: "rbac-fallback",
        email: adminEmail,
        role: roles.has("super_admin") ? "super_admin" : "admin",
        business_roles: businessRoles,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: null,
        is_active: true,
      };
    }

    return null;
  } catch (e) {
    if (process.env.NODE_ENV !== "production")
      console.error("[auth] getCurrentUser():", e);
    return null;
  }
}

export async function getCurrentUserFromRequest(
  req: Request,
): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: () => {},
          remove: () => {}, // no-op
        },
      },
    );
    const {
      data: { user },
    } = await supa.auth.getUser();

    // If no Supabase session, try to get admin email from cookie as fallback
    let adminEmail = user?.email;
    if (!adminEmail) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const adminEmailMatch = cookieHeader.match(/admin-email=([^;]+)/);
        if (adminEmailMatch) {
          adminEmail = decodeURIComponent(adminEmailMatch[1]);
          console.log(
            `[AUTH] No Supabase session, but found admin-email cookie: ${adminEmail}`,
          );
        }
      }
    }

    if (!adminEmail) return null;

    // Try database first
    try {
      const svc = getSupabaseServiceClient();
      const { data: adminUser } = await svc
        .from("admin_users")
        .select("*")
        .eq("email", adminEmail.toLowerCase())
        .eq("is_active", true)
        .eq("status", "active")
        .single();

      if (adminUser) {
        return {
          id: (adminUser as any).id,
          email: (adminUser as any).email,
          role: (adminUser as any).role,
          business_roles: (adminUser as any).business_roles || [],
          created_at: (adminUser as any).created_at,
          updated_at: (adminUser as any).updated_at,
          last_login_at: (adminUser as any).last_login_at,
          is_active: (adminUser as any).is_active,
        };
      }
    } catch (dbError) {
      console.log(
        "[auth] Database query failed, falling back to RBAC:",
        dbError,
      );
    }

    // Fall back to RBAC system when database is unavailable
    const { getRolesForEmail, getBusinessRoles } = await import("./rbac");
    const roles = getRolesForEmail(adminEmail);
    if (roles.size > 0) {
      const businessRoles = await getBusinessRoles(adminEmail);
      return {
        id: "rbac-fallback",
        email: adminEmail,
        role: roles.has("super_admin") ? "super_admin" : "admin",
        business_roles: businessRoles,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: null,
        is_active: true,
      };
    }

    return null;
  } catch (e) {
    if (process.env.NODE_ENV !== "production")
      console.error("[auth] getCurrentUserFromRequest():", e);
    return null;
  }
}

/**
 * Checks if user is authenticated and has admin role
 * @returns true if user is authenticated and has admin role, false otherwise
 */
export async function isAuthenticatedAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null && user.is_active;
}

/**
 * Checks if user is authenticated and has super_admin role
 * @returns true if user is authenticated and has super_admin role, false otherwise
 */
export async function isAuthenticatedSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null && user.role === "super_admin" && user.is_active;
}

/**
 * Checks if user from request has super_admin role
 * @param request - The request object
 * @returns true if user has super_admin role, false otherwise
 */
export async function hasSuperAdminRoleFromRequest(
  request: Request,
): Promise<boolean> {
  return hasRoleFromRequest(request, "super_admin");
}

/**
 * Checks if user is authenticated (has any valid session)
 * @returns true if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Check if user has required role
 * @param requiredRole - The role required for access
 * @returns true if user has the required role, false otherwise
 */
export async function hasRole(
  requiredRole: "admin" | "super_admin",
): Promise<boolean> {
  console.log("[HAS_ROLE] Checking role:", requiredRole);
  const user = await getCurrentUser();
  console.log("[HAS_ROLE] User:", user);

  if (!user || !user.is_active) {
    console.log("[HAS_ROLE] User not found or not active");
    return false;
  }

  if (requiredRole === "super_admin") {
    const result = user.role === "super_admin";
    console.log("[HAS_ROLE] Super admin check result:", result);
    return result;
  }

  // admin role can access admin-level resources
  const result = user.role === "admin" || user.role === "super_admin";
  console.log("[HAS_ROLE] Admin check result:", result);
  return result;
}

/**
 * Check if user has required role (from request)
 * @param request - The request object
 * @param requiredRole - The role required for access
 * @returns true if user has the required role, false otherwise
 */
export async function hasRoleFromRequest(
  request: Request,
  requiredRole: "admin" | "super_admin",
): Promise<boolean> {
  console.log("[HAS_ROLE_FROM_REQUEST] Checking role:", requiredRole);
  const user = await getCurrentUserFromRequest(request);
  console.log("[HAS_ROLE_FROM_REQUEST] User:", user);

  if (!user || !user.is_active) {
    console.log("[HAS_ROLE_FROM_REQUEST] User not found or not active");
    return false;
  }

  if (requiredRole === "super_admin") {
    const result = user.role === "super_admin";
    console.log("[HAS_ROLE_FROM_REQUEST] Super admin check result:", result);
    return result;
  }

  // admin role can access admin-level resources
  const result = user.role === "admin" || user.role === "super_admin";
  console.log("[HAS_ROLE_FROM_REQUEST] Admin check result:", result);
  return result;
}

/**
 * Update user's last login timestamp
 * @param userId - The user ID to update
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await (supabase as any)
      .from("admin_users")
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch (error) {
    console.error("Error updating last login:", error);
  }
}

/**
 * Create or update admin user
 * @param userData - The user data to create/update
 * @returns The created/updated admin user
 */
export async function upsertAdminUser(userData: {
  id: string;
  email: string;
  role: "admin" | "super_admin";
}): Promise<AdminUser | null> {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from("admin_users")
      .upsert({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        created_at: now,
        updated_at: now,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting admin user:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error upserting admin user:", error);
    return null;
  }
}

/**
 * Server-side logout function
 * Signs out the current user and clears auth cookies
 * @returns Response object with cleared cookies
 */
export async function serverLogout(): Promise<Response> {
  try {
    const supabase = getSupabaseClient();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Server logout error:", error);
      throw new Error("Failed to logout from Supabase");
    }

    // Create response with cleared cookies
    const response = new Response(null, { status: 302 });

    // Clear all authentication cookies
    response.headers.set(
      "Set-Cookie",
      [
        "admin-email=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        "sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        "sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        "sb-auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        "dev-user-email=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      ].join(", "),
    );

    return response;
  } catch (error) {
    console.error("Server logout error:", error);
    throw error;
  }
}
