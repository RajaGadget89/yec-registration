/**
 * Test configuration for Audit E2E Tests
 * Handles environment variables and test setup
 */

/**
 * Test environment configuration
 */
export const TEST_CONFIG = {
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  },

  // Application configuration
  app: {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080',
    timeout: parseInt(process.env.TEST_TIMEOUT_MS || '30000')
  },

  // Test admin configuration
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com',
    password: 'test-password-123'
  },

  // Test data configuration
  testData: {
    prefix: process.env.TEST_DATA_PREFIX || 'audit-test',
    cleanupAfterTests: true
  }
};

/**
 * Validate test configuration
 */
export function validateTestConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required Supabase configuration
  if (!TEST_CONFIG.supabase.url) {
    errors.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!TEST_CONFIG.supabase.serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required for audit tests');
  }

  if (!TEST_CONFIG.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Check application configuration
  if (!TEST_CONFIG.app.baseUrl) {
    errors.push('NEXT_PUBLIC_APP_URL is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get test configuration with validation
 */
export function getTestConfig() {
  const validation = validateTestConfig();
  if (!validation.valid) {
    throw new Error(`Test configuration validation failed:\n${validation.errors.join('\n')}`);
  }
  return TEST_CONFIG;
}

/**
 * Test environment setup
 */
export function setupTestEnvironment() {
  console.log('Setting up test environment...');
  
  const config = getTestConfig();
  
  console.log('Test configuration loaded:', {
    supabaseUrl: config.supabase.url,
    appBaseUrl: config.app.baseUrl,
    adminEmail: config.admin.email,
    testDataPrefix: config.testData.prefix
  });

  return config;
}
