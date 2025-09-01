/**
 * Test helper utilities for E2E tests
 * Centralizes authentication and common test operations
 */

/**
 * Generate headers required for test helper endpoints
 * Uses CRON_SECRET from environment for authentication
 */
export function cronHeaders(): Record<string, string> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET is not set in test environment");
  }
  return { 'x-cron-secret': secret };
}

/**
 * Generate headers for admin authentication
 * Uses admin-email cookie for test authentication
 */
export function adminHeaders(email: string = 'raja.gadgets89@gmail.com'): Record<string, string> {
  return {
    'Cookie': `admin-email=${email}`,
    ...cronHeaders()
  };
}

/**
 * Generate headers for both cron secret and admin authentication
 * Combines both authentication methods for comprehensive test access
 */
export function fullTestHeaders(email: string = 'raja.gadgets89@gmail.com'): Record<string, string> {
  return {
    'Cookie': `admin-email=${email}`,
    ...cronHeaders()
  };
}
