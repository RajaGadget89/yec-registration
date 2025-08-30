import { NextResponse } from "next/server";

/**
 * Environment Debug Endpoint
 * Returns environment variable status for debugging authentication issues
 * Only available in development and E2E test environments
 */
export async function GET() {
  // Only allow in development or E2E test mode
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TEST_MODE) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const envData = {
    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "SET"
      : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "SET"
      : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "SET"
      : "MISSING",

    // Application Configuration
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,

    // Admin Configuration
    ADMIN_EMAILS: process.env.ADMIN_EMAILS ? "SET" : "MISSING",
    SUPER_ADMIN_EMAILS: process.env.SUPER_ADMIN_EMAILS ? "SET" : "MISSING",
    ADMIN_PAYMENT_EMAILS: process.env.ADMIN_PAYMENT_EMAILS ? "SET" : "MISSING",
    ADMIN_PROFILE_EMAILS: process.env.ADMIN_PROFILE_EMAILS ? "SET" : "MISSING",
    ADMIN_TCC_EMAILS: process.env.ADMIN_TCC_EMAILS ? "SET" : "MISSING",

    // Email Configuration
    EMAIL_MODE: process.env.EMAIL_MODE,
    RESEND_API_KEY: process.env.RESEND_API_KEY ? "SET" : "MISSING",

    // Test Configuration
    E2E_TEST_MODE: process.env.E2E_TEST_MODE,
    CRON_SECRET: process.env.CRON_SECRET ? "SET" : "MISSING",

    // Vercel Configuration (if applicable)
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  return NextResponse.json(envData);
}
