import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "../types/database";
import { assertDbRouting, logDbRouting } from "./env-guards";

// Validate database routing on module load (development only)
if (process.env.NODE_ENV === 'development') {
  try {
    assertDbRouting();
    logDbRouting();
  } catch (error) {
    console.error('Database routing validation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Get Supabase server client with cookie-based session management
 * This function creates a Supabase client that can read/write cookies
 * for server-visible session management
 */
export function getServerSupabase(req: NextRequest, res: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        res.cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        res.cookies.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });

  return { supabase, response: res };
}

/**
 * Get Supabase server client for middleware
 * This function creates a Supabase client that can read cookies
 * but doesn't have access to response object for setting cookies
 */
export function getMiddlewareSupabase(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set() {
        // No-op for middleware - we can't set cookies here
      },
      remove() {
        // No-op for middleware - we can't remove cookies here
      },
    },
  });

  return supabase;
}

/**
 * Get Supabase service client for server-side operations
 * This function creates a Supabase client with service role key
 * for operations that require elevated privileges
 */
export function getSupabaseServiceClient() {
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
 * Get Supabase service role client for server-only operations
 * This function creates a Supabase client with service role key
 * for server-side authorization checks
 */
export function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}
