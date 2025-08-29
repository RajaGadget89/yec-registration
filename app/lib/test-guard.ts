import { NextRequest } from "next/server";

/**
 * Standardized guard for test-only endpoints
 * Ensures endpoints are only accessible when TEST_HELPERS_ENABLED is set and CRON_SECRET is provided
 */
export function guardTestEndpoint(req: NextRequest): {
  allowed: boolean;
  status: number;
  message: string;
} {
  // Check if test helpers are enabled
  if (process.env.TEST_HELPERS_ENABLED !== "1") {
    return { allowed: false, status: 404, message: "Not Found" };
  }

  // Check for CRON_SECRET authentication
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : req.headers.get("x-cron-secret") || "";

  if (!token || token !== process.env.CRON_SECRET) {
    return { allowed: false, status: 401, message: "INVALID_CRON_SECRET" };
  }

  return { allowed: true, status: 200, message: "OK" };
}
