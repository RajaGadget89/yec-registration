import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { AdminUser } from "../types/database";
import { assertDbRouting } from "./env-guards";

/**
 * Interface for authenticated user data
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  created_at: string;
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

/**
 * Gets the current authenticated user from Supabase session
 * @returns AuthenticatedUser object or null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();

    // Create Supabase server client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => cookieStore.get(key)?.value,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          set: (key, value, options) => {
            // This is read-only, so we don't need to implement set
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          remove: (key, options) => {
            // This is read-only, so we don't need to implement remove
          },
        },
      },
    );

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      // Only log genuine errors, not "no session" states
      if (process.env.NODE_ENV !== "production") {
        console.error("[auth] getCurrentUser(): session error:", sessionError);
      }
      return null;
    }

    if (!session) {
      // Fallback: Check for custom admin-email cookie (for legacy support)
      const adminEmail = cookieStore.get("admin-email")?.value;
      if (adminEmail) {
        console.log("Using legacy admin-email cookie fallback");
        // Get user from admin_users table using email
        const serviceClient = getSupabaseClient();
        const { data: adminUser, error } = await serviceClient
          .from("admin_users")
          .select("*")
          .eq("email", adminEmail)
          .eq("is_active", true)
          .single();

        if (!error && adminUser) {
          return {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
            created_at: adminUser.created_at,
            last_login_at: adminUser.last_login_at,
            is_active: adminUser.is_active,
          };
        }
      }
      return null;
    }

    // Get user from admin_users table using Supabase session
    const serviceClient = getSupabaseClient();
    const { data: adminUser, error } = await serviceClient
      .from("admin_users")
      .select("*")
      .eq("id", session.user.id)
      .eq("is_active", true)
      .single();

    if (!error && adminUser) {
      return {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        created_at: adminUser.created_at,
        last_login_at: adminUser.last_login_at,
        is_active: adminUser.is_active,
      };
    }

    // If user not found in admin_users table, check if they should be added
    if (session.user.email) {
      const adminEmails =
        process.env.ADMIN_EMAILS?.split(",").map((e) =>
          e.trim().toLowerCase(),
        ) || [];
      if (adminEmails.includes(session.user.email.toLowerCase())) {
        // Auto-create admin user if they're in the allowlist
        console.log("Auto-creating admin user for:", session.user.email);
        const newAdminUser = await upsertAdminUser({
          id: session.user.id,
          email: session.user.email,
          role: "admin",
        });

        if (newAdminUser) {
          return {
            id: newAdminUser.id,
            email: newAdminUser.email,
            role: newAdminUser.role,
            created_at: newAdminUser.created_at,
            last_login_at: newAdminUser.last_login_at,
            is_active: newAdminUser.is_active,
          };
        }
      }
    }

    return null;
  } catch (error) {
    // Only log genuine errors in development
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] getCurrentUser(): unexpected error:", error);
    }
    return null;
  }
}

/**
 * Gets the current authenticated user from request headers or cookies
 * @returns AuthenticatedUser object or null if not authenticated
 */
export async function getCurrentUserFromRequest(
  request: Request,
): Promise<AuthenticatedUser | null> {
  try {
    const supabase = getSupabaseClient();

    // Extract session from request headers
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      // Verify the token and get user
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      // Get user from admin_users table
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", user.id)
        .eq("is_active", true)
        .single();

      if (adminError || !adminUser) {
        return null;
      }

      return {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        created_at: adminUser.created_at,
        last_login_at: adminUser.last_login_at,
        is_active: adminUser.is_active,
      };
    }

    // E2E test mode fallback: check for admin-email cookie
    if (process.env.E2E_TEST_MODE === "true") {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(";").map((cookie) => {
            const [name, value] = cookie.trim().split("=");
            return [name, value];
          }),
        );

        const adminEmail = cookies["admin-email"];
        if (adminEmail) {
          // URL-decode the email since cookies are automatically encoded
          const decodedEmail = decodeURIComponent(adminEmail);

          // Get user from admin_users table using email
          const { data: adminUser, error } = await supabase
            .from("admin_users")
            .select("*")
            .eq("email", decodedEmail)
            .eq("is_active", true)
            .single();

          if (!error && adminUser) {
            return {
              id: adminUser.id,
              email: adminUser.email,
              role: adminUser.role,
              created_at: adminUser.created_at,
              last_login_at: adminUser.last_login_at,
              is_active: adminUser.is_active,
            };
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting current user from request:", error);
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
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    return false;
  }

  if (requiredRole === "super_admin") {
    return user.role === "super_admin";
  }

  // admin role can access admin-level resources
  return user.role === "admin" || user.role === "super_admin";
}

/**
 * Update user's last login timestamp
 * @param userId - The user ID to update
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
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

    const { data, error } = await supabase
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
