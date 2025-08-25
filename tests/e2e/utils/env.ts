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

  // Auth testing configuration
  APP_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_EMAIL: string;
  RUN_LOCAL_TESTS: boolean;
  RUN_PREVIEW_TESTS: boolean;
  RUN_PROD_TESTS: boolean;
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

    // Auth testing configuration
    APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080',
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL || 'raja.gadgets89@gmail.com',
    RUN_LOCAL_TESTS: process.env.RUN_LOCAL_TESTS === 'true',
    RUN_PREVIEW_TESTS: process.env.RUN_PREVIEW_TESTS === 'true',
    RUN_PROD_TESTS: process.env.RUN_PROD_TESTS === 'true',
  };

  // Validate required environment variables
  if (!env.CRON_SECRET) {
    throw new Error('CRON_SECRET environment variable is required');
  }

  if (!env.PLAYWRIGHT_BASE_URL) {
    throw new Error('PLAYWRIGHT_BASE_URL environment variable is required');
  }

  // Validate auth testing environment variables
  if (!env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required');
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  if (!env.ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL or TEST_ADMIN_EMAIL environment variable is required');
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
  console.log(`APP_URL: ${env.APP_URL}`);
  console.log(`SUPABASE_URL: ${env.SUPABASE_URL}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 6)}...`);
  console.log(`ADMIN_EMAIL: ${env.ADMIN_EMAIL}`);
  console.log(`RUN_LOCAL_TESTS: ${env.RUN_LOCAL_TESTS}`);
  console.log(`RUN_PREVIEW_TESTS: ${env.RUN_PREVIEW_TESTS}`);
  console.log(`RUN_PROD_TESTS: ${env.RUN_PROD_TESTS}`);
  console.log('==========================================');
}
