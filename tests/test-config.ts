/**
 * Test configuration for email system tests
 * Defines environment variables and test settings
 */

export const TEST_CONFIG = {
  // Email transport configuration
  EMAIL_MODE: 'CAPPED',
  EMAIL_CAP_MAX_PER_RUN: 1,
  EMAIL_THROTTLE_MS: 500,
  EMAIL_RETRY_ON_429: 2,
  EMAIL_BASE_BACKOFF_MS: 500,
  EMAIL_ALLOWLIST: 'you@example.com',
  BLOCK_NON_ALLOWLIST: true,
  EMAIL_SUBJECT_PREFIX: '[E2E]',
  
  // Provider configuration
  RESEND_API_KEY: 'test-api-key',
  EMAIL_FROM: 'test@example.com',
  
  // Test configuration
  CRON_SECRET: 'local-secret',
  DISPATCH_DRY_RUN: false,
  
  // Server configuration
  PLAYWRIGHT_BASE_URL: 'http://localhost:8080'
};

/**
 * Set up test environment variables
 */
export function setupTestEnvironment(): void {
  Object.entries(TEST_CONFIG).forEach(([key, value]) => {
    process.env[key] = String(value);
  });
}

/**
 * Clean up test environment variables
 */
export function cleanupTestEnvironment(): void {
  Object.keys(TEST_CONFIG).forEach(key => {
    delete process.env[key];
  });
}

/**
 * Get test environment variables as a string for command line
 */
export function getTestEnvString(): string {
  return Object.entries(TEST_CONFIG)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}
