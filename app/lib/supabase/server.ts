import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";
import { isE2E } from "../env/isE2E";

/**
 * Get Supabase server client with cookie-based session management
 * This function creates a Supabase client that can read/write cookies
 * for server-visible session management
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    },
  );
}

/**
 * Get Supabase service client for server-side operations
 * This function creates a Supabase client with service role key
 * for operations that require elevated privileges (bypasses RLS)
 */
export function getSupabaseServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );
}

/**
 * Get appropriate Supabase client based on E2E test mode and bypass header
 * @param request - The incoming request object
 * @returns Supabase client (service client if E2E bypass enabled, otherwise server client)
 */
export async function maybeServiceClient(request: Request) {
  // Check if E2E test mode is enabled and bypass header is present
  if (isE2E() && request.headers.get("X-E2E-RLS-BYPASS") === "1") {
    return getSupabaseServiceClient();
  }

  // Otherwise use the regular server client
  return await getSupabaseServerClient();
}
