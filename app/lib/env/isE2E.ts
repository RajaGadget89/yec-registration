/**
 * Check if E2E test mode is enabled
 * @returns true if E2E_TEST_MODE environment variable is set to 'true'
 *
 * SECURITY: This function is disabled in production builds for security
 */
export function isE2E(): boolean {
  // SECURITY: Disable E2E mode in production
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.E2E_TEST_MODE === "true";
}

/**
 * Check if E2E test helpers are enabled
 * @returns true if both E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 *
 * SECURITY: This function is disabled in production builds for security
 */
export function isE2EWithHelpers(): boolean {
  // SECURITY: Disable E2E helpers in production
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    process.env.E2E_TEST_MODE === "true" &&
    process.env.TEST_HELPERS_ENABLED === "1"
  );
}
