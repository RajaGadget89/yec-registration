/**
 * Environment configuration helper for API tests
 * Reads and validates required environment variables
 */

export interface TestEnvironment {
  BASE_URL: string;
  ADMIN_BEARER: string;
  E2E_TESTS?: string;
  INVITE_RATE_LIMIT_PER_MIN?: string;
  INVITE_RATE_LIMIT_PER_DAY?: string;
}

/**
 * Get test environment configuration
 * @returns TestEnvironment object with validated values
 */
export function getTestEnvironment(): TestEnvironment {
  const env: TestEnvironment = {
    BASE_URL: process.env.BASE_URL || 'http://localhost:8080',
    ADMIN_BEARER: process.env.ADMIN_BEARER || 'test-admin-token',
    E2E_TESTS: process.env.E2E_TESTS,
    INVITE_RATE_LIMIT_PER_MIN: process.env.INVITE_RATE_LIMIT_PER_MIN,
    INVITE_RATE_LIMIT_PER_DAY: process.env.INVITE_RATE_LIMIT_PER_DAY,
  };

  // Validate required environment variables
  if (!env.BASE_URL) {
    throw new Error('BASE_URL environment variable is required');
  }

  if (!env.ADMIN_BEARER) {
    throw new Error('ADMIN_BEARER environment variable is required');
  }

  // Validate BASE_URL format
  try {
    new URL(env.BASE_URL);
  } catch (error) {
    throw new Error(`Invalid BASE_URL format: ${env.BASE_URL}`);
  }

  return env;
}

/**
 * Get test environment as a string for command line usage
 * @returns Space-separated key=value pairs
 */
export function getTestEnvString(): string {
  const env = getTestEnvironment();
  return Object.entries(env)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

/**
 * Check if running in E2E test mode
 * @returns true if E2E_TESTS is set to 'true'
 */
export function isE2ETestMode(): boolean {
  return process.env.E2E_TESTS === 'true';
}

/**
 * Get rate limit configuration for testing
 * @returns Rate limit configuration object
 */
export function getRateLimitConfig() {
  const env = getTestEnvironment();
  
  return {
    perMinute: env.INVITE_RATE_LIMIT_PER_MIN ? parseInt(env.INVITE_RATE_LIMIT_PER_MIN, 10) : 5,
    perDay: env.INVITE_RATE_LIMIT_PER_DAY ? parseInt(env.INVITE_RATE_LIMIT_PER_DAY, 10) : 20,
    isE2E: isE2ETestMode(),
  };
}

/**
 * Log environment configuration for debugging
 */
export function logEnvironmentConfig(): void {
  const env = getTestEnvironment();
  const rateLimit = getRateLimitConfig();
  
  console.log('[TEST_ENV] Configuration:');
  console.log(`  BASE_URL: ${env.BASE_URL}`);
  console.log(`  ADMIN_BEARER: ${env.ADMIN_BEARER ? '[SET]' : '[NOT SET]'}`);
  console.log(`  E2E_TESTS: ${env.E2E_TESTS || 'false'}`);
  console.log(`  Rate Limit (per minute): ${rateLimit.perMinute}`);
  console.log(`  Rate Limit (per day): ${rateLimit.perDay}`);
}

