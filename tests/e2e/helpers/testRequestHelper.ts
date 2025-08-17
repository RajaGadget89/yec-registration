/**
 * Test Request Helper
 * Provides consistent headers and authentication for test API requests
 */

export interface TestRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Get standard test headers for API requests
 */
export function getTestHeaders(options: TestRequestOptions = {}): Record<string, string> {
  const baseHeaders = {
    'X-Test-Helpers-Enabled': '1',
    'Authorization': `Bearer ${process.env.CRON_SECRET}`,
    'Content-Type': 'application/json',
  };

  return {
    ...baseHeaders,
    ...options.headers,
  };
}

/**
 * Get test headers for admin endpoints
 */
export function getAdminTestHeaders(options: TestRequestOptions = {}): Record<string, string> {
  return getTestHeaders({
    ...options,
    headers: {
      ...options.headers,
      'X-Admin-Test': '1',
    },
  });
}

/**
 * Validate test environment
 */
export function validateTestEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.CRON_SECRET) {
    errors.push('CRON_SECRET is required for test API requests');
  }

  if (!process.env.SUPABASE_URL) {
    errors.push('SUPABASE_URL is required for test database access');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required for test database access');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Setup test environment
 */
export function setupTestEnvironment() {
  const validation = validateTestEnvironment();
  if (!validation.valid) {
    throw new Error(`Test environment validation failed:\n${validation.errors.join('\n')}`);
  }

  console.log('Test environment validated successfully');
  return true;
}
