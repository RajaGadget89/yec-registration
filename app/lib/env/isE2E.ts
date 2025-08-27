/**
 * Check if E2E test mode is enabled
 * @returns true if E2E_TEST_MODE environment variable is set to 'true'
 */
export function isE2E(): boolean {
  return process.env.E2E_TEST_MODE === "true";
}
