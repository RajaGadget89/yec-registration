import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Test-only authentication probe endpoint for E2E testing
 * Only works when E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 * Validates HMAC signature and returns auth readiness status
 */
export async function GET(request: NextRequest) {
  // Check if both test flags are enabled
  const e2eTestMode = process.env.E2E_TEST_MODE === "true";
  const testHelpersEnabled = process.env.TEST_HELPERS_ENABLED === "1";

  if (!e2eTestMode || !testHelpersEnabled) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    // Validate HMAC signature
    const authHeader = request.headers.get("X-E2E-SIGN");
    const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
    const timestamp = request.headers.get("X-E2E-TIMESTAMP");

    if (!authHeader || !e2eAuthSecret || !timestamp) {
      return new NextResponse("Missing authentication headers", {
        status: 403,
      });
    }

    // Check timestamp skew (allow 60 seconds)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (Math.abs(now - requestTime) > 60) {
      return new NextResponse("Request timestamp too old", { status: 403 });
    }

    // Calculate expected HMAC: method:path:timestamp
    const method = "GET";
    const path = "/api/dev/route-auth-check";
    const payload = `${method}:${path}:${timestamp}`;
    const expectedHmac = crypto
      .createHmac("sha256", e2eAuthSecret)
      .update(payload)
      .digest("hex");

    if (authHeader !== expectedHmac) {
      return new NextResponse("Invalid authentication signature", {
        status: 403,
      });
    }

    // Return 204 with e2e header to indicate ready state
    return new NextResponse(null, {
      status: 204,
      headers: {
        "x-e2e": "true",
        "x-auth-ready": "true",
      },
    });
  } catch (error) {
    console.error("[dev/route-auth-check] error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
