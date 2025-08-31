/**
 * Helper functions for test API routes
 * Provides database-first authentication approach with environment fallback
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if email is allowed for test operations
 * Database-first approach with environment fallback
 */
export async function checkTestEmailAllowed(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  if (!email) return false;

  try {
    // Step 1: Check if user exists in database
    const { data: existingUser } = await supabase
      .from("admin_users")
      .select("email, is_active")
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .single();

    if (existingUser) {
      return true;
    }

    // Step 2: Check environment variables for legacy support
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    return adminEmails.includes(email.toLowerCase());
  } catch {
    // Step 3: Environment fallback on database error
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    return adminEmails.includes(email.toLowerCase());
  }
}

/**
 * Get test email from request with fallbacks
 */
export function getTestEmail(request: Request): string | null {
  try {
    const url = new URL(request.url);
    const emailParam = url.searchParams.get("email");

    if (emailParam) return emailParam;

    // Fallback to environment variables
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
    return adminEmails[0] || null;
  } catch {
    return null;
  }
}
