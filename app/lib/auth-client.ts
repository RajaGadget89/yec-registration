import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

/**
 * Interface for authenticated user data (shared with server)
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
 * Get Supabase client for client-side operations
 */
function getSupabaseClientSide() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Get client-side Supabase instance for authentication
 */
export function getSupabaseAuth() {
  return getSupabaseClientSide();
}

/**
 * Get Supabase browser client for authentication callbacks
 * This is the same as getSupabaseAuth but with a more descriptive name
 */
export function getSupabaseBrowserClient() {
  return getSupabaseClientSide();
}

/**
 * Get current user from client-side session
 * This function can be used in client components to get user info
 * @returns Promise<AuthenticatedUser | null>
 */
export async function getClientUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = getSupabaseAuth();

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      // Get user from admin_users table
      const { data: adminUser, error } = await supabase
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
    }

    return null;
  } catch (error) {
    console.error("Error getting client user:", error);
    return null;
  }
}
