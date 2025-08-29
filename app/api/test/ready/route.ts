import { NextRequest, NextResponse } from "next/server";
import { guardTestEndpoint } from "@/app/lib/test-guard";

/**
 * Test-only readiness endpoint to verify E2E environment configuration
 * Returns environment status when TEST_HELPERS_ENABLED is active
 */
export async function GET(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  return NextResponse.json({
    e2e: process.env.E2E_TESTS === "true",
    helpers: process.env.TEST_HELPERS_ENABLED === "1",
    dbTarget: process.env.E2E_DB_TARGET || "unknown",
    baseUrl:
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      null,
    auth: true, // If we get here, auth is valid
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_ENV: process.env.SUPABASE_ENV,
      EMAIL_MODE: process.env.EMAIL_MODE,
      DISPATCH_DRY_RUN: process.env.DISPATCH_DRY_RUN,
      FEATURES_ADMIN_MANAGEMENT: process.env.FEATURES_ADMIN_MANAGEMENT,
    },
    timestamp: new Date().toISOString(),
  });
}
