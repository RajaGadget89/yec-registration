/**
 * Check if E2E test mode is enabled
 * @returns true if E2E_TEST_MODE environment variable is set to 'true'
 */
export function isE2E(): boolean {
  return process.env.E2E_TEST_MODE === "true";
}

/**
 * Check if E2E test helpers are enabled
 * @returns true if both E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 */
export function isE2EWithHelpers(): boolean {
  return (
    process.env.E2E_TEST_MODE === "true" &&
    process.env.TEST_HELPERS_ENABLED === "1"
  );
}
