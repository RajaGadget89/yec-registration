/**
 * Environment utilities for E2E tests
 * Reads and validates test configuration variables
 */

export interface TestEnv {
  // Base configuration
  PLAYWRIGHT_BASE_URL: string;
  CRON_SECRET: string;
  DISPATCH_DRY_RUN: boolean;
  
  // Email configuration (for capped specs)
  EMAIL_MODE: string;
  EMAIL_CAP_MAX_PER_RUN: number;
  EMAIL_THROTTLE_MS: number;
  EMAIL_RETRY_ON_429: number;
  BLOCK_NON_ALLOWLIST: boolean;
  EMAIL_ALLOWLIST: string;
}

/**
 * Read and validate environment variables for E2E tests
 */
export function getTestEnv(): TestEnv {
  const env: TestEnv = {
    // Base configuration
    PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    CRON_SECRET: process.env.CRON_SECRET || 'local-secret',
    DISPATCH_DRY_RUN: process.env.DISPATCH_DRY_RUN === 'true',
    
    // Email configuration (for capped specs)
    EMAIL_MODE: process.env.EMAIL_MODE || 'DRY_RUN',
    EMAIL_CAP_MAX_PER_RUN: parseInt(process.env.EMAIL_CAP_MAX_PER_RUN || '1'),
    EMAIL_THROTTLE_MS: parseInt(process.env.EMAIL_THROTTLE_MS || '500'),
    EMAIL_RETRY_ON_429: parseInt(process.env.EMAIL_RETRY_ON_429 || '1'),
    BLOCK_NON_ALLOWLIST: process.env.BLOCK_NON_ALLOWLIST === 'true',
    EMAIL_ALLOWLIST: process.env.EMAIL_ALLOWLIST || 'raja.gadgets89@gmail.com',
  };

  // Validate required environment variables
  if (!env.CRON_SECRET) {
    throw new Error('CRON_SECRET environment variable is required');
  }

  if (!env.PLAYWRIGHT_BASE_URL) {
    throw new Error('PLAYWRIGHT_BASE_URL environment variable is required');
  }

  return env;
}

/**
 * Check if we're in capped real-send mode
 */
export function isCappedMode(): boolean {
  const env = getTestEnv();
  return env.EMAIL_MODE === 'CAPPED' && !env.DISPATCH_DRY_RUN;
}

/**
 * Check if we're in dry-run mode
 */
export function isDryRunMode(): boolean {
  const env = getTestEnv();
  return env.DISPATCH_DRY_RUN || env.EMAIL_MODE === 'DRY_RUN';
}

/**
 * Print current environment configuration (masked for security)
 */
export function printTestEnv(): void {
  const env = getTestEnv();
  
  console.log('=== E2E Test Environment Configuration ===');
  console.log(`PLAYWRIGHT_BASE_URL: ${env.PLAYWRIGHT_BASE_URL}`);
  console.log(`CRON_SECRET: ${env.CRON_SECRET.substring(0, 6)}...`);
  console.log(`DISPATCH_DRY_RUN: ${env.DISPATCH_DRY_RUN}`);
  console.log(`EMAIL_MODE: ${env.EMAIL_MODE}`);
  console.log(`EMAIL_CAP_MAX_PER_RUN: ${env.EMAIL_CAP_MAX_PER_RUN}`);
  console.log(`EMAIL_THROTTLE_MS: ${env.EMAIL_THROTTLE_MS}`);
  console.log(`EMAIL_RETRY_ON_429: ${env.EMAIL_RETRY_ON_429}`);
  console.log(`BLOCK_NON_ALLOWLIST: ${env.BLOCK_NON_ALLOWLIST}`);
  console.log(`EMAIL_ALLOWLIST: ${env.EMAIL_ALLOWLIST}`);
  console.log('==========================================');
}
