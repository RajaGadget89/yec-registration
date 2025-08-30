/**
 * E2E Test Environment Configuration
 * Loads environment variables for E2E tests with proper fallbacks
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .e2e-env file if it exists, otherwise use process.env
const e2eEnvPath = resolve(process.cwd(), '.e2e-env');
try {
  config({ path: e2eEnvPath });
  console.log(`[E2E] Loaded environment from ${e2eEnvPath}`);
} catch (error) {
  console.log('[E2E] No .e2e-env file found, using process.env');
}

/**
 * E2E Test Environment Configuration
 */
export const E2E_CONFIG = {
  // Required feature flags
  features: {
    adminManagement: process.env.FEATURES_ADMIN_MANAGEMENT === 'true',
    e2eTests: process.env.E2E_TESTS === 'true'
  },

  // Supabase configuration (test/local DB only)
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env: process.env.SUPABASE_ENV || 'test'
  },

  // Application configuration
  app: {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080',
    timeout: parseInt(process.env.TEST_TIMEOUT_MS || '30000')
  },

  // Admin configuration
  admin: {
    emails: process.env.ADMIN_EMAILS?.split(',') || ['raja.gadgets89@gmail.com'],
    seedSecret: process.env.ADMIN_SEED_SECRET || 'test-seed-secret'
  },

  // Email configuration (stubbed for tests)
  email: {
    mode: process.env.EMAIL_MODE || 'DRY_RUN',
    resendApiKey: process.env.RESEND_API_KEY || 'dummy-e2e',
    allowlist: process.env.EMAIL_ALLOWLIST?.split(',') || [],
    dispatchDryRun: process.env.DISPATCH_DRY_RUN === 'true',
    enableEmailMock: process.env.ENABLE_EMAIL_MOCK === 'true'
  },

  // Rate limiting configuration
  rateLimit: {
    invitePerMinute: parseInt(process.env.INVITE_RATE_LIMIT_PER_MIN || '5'),
    invitePerDay: parseInt(process.env.INVITE_RATE_LIMIT_PER_DAY || '50')
  },

  // Test data configuration
  testData: {
    prefix: process.env.TEST_DATA_PREFIX || 'e2e-test',
    cleanupAfterTests: true
  }
};

/**
 * Validate E2E test configuration
 */
export function validateE2EConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required feature flags
  if (!E2E_CONFIG.features.e2eTests) {
    errors.push('E2E_TESTS must be set to "true" for E2E tests');
  }

  if (!E2E_CONFIG.features.adminManagement) {
    errors.push('FEATURES_ADMIN_MANAGEMENT must be set to "true" for admin management tests');
  }

  // Check required Supabase configuration
  if (!E2E_CONFIG.supabase.url) {
    errors.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!E2E_CONFIG.supabase.serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required for E2E tests');
  }

  if (!E2E_CONFIG.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Check admin configuration
  if (!E2E_CONFIG.admin.emails.length) {
    errors.push('ADMIN_EMAILS must include at least one email address');
  }

  // Check application configuration
  if (!E2E_CONFIG.app.baseUrl) {
    errors.push('NEXT_PUBLIC_APP_URL is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get E2E configuration with validation
 */
export function getE2EConfig() {
  const validation = validateE2EConfig();
  if (!validation.valid) {
    throw new Error(`E2E configuration validation failed:\n${validation.errors.join('\n')}`);
  }
  return E2E_CONFIG;
}

/**
 * Setup E2E test environment
 */
export function setupE2EEnvironment() {
  console.log('[E2E] Setting up E2E test environment...');
  
  const config = getE2EConfig();
  
  console.log('[E2E] Configuration loaded:', {
    features: config.features,
    supabaseUrl: config.supabase.url,
    supabaseEnv: config.supabase.env,
    appBaseUrl: config.app.baseUrl,
    adminEmails: config.admin.emails,
    emailMode: config.email.mode,
    testDataPrefix: config.testData.prefix
  });

  return config;
}

/**
 * Ensure E2E environment is properly configured
 */
export function ensureE2EEnvironment() {
  if (!E2E_CONFIG.features.e2eTests) {
    throw new Error('E2E_TESTS environment variable must be set to "true" for E2E tests');
  }
  
  if (!E2E_CONFIG.features.adminManagement) {
    throw new Error('FEATURES_ADMIN_MANAGEMENT environment variable must be set to "true" for admin management tests');
  }
}
