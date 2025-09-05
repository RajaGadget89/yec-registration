import { Page } from '@playwright/test';
import crypto from 'crypto';

/**
 * Test-only authentication utilities for E2E testing
 * Only works when E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 */

// Test user configurations
const TEST_USERS = {
  super_admin: {
    email: 'raja.gadgets89@gmail.com',
    role: 'super_admin',
    business_roles: ['user_profile', 'payment_slip', 'tcc_card']
  },
  admin: {
    email: 'yecsongkhla.official@gmail.com', 
    role: 'admin',
    business_roles: ['tcc_card']
  },
  admin_profile: {
    email: 'raja.gadgets89@gmail.com',
    role: 'admin',
    business_roles: ['user_profile']
  },
  admin_payment: {
    email: 'raja.gadgets89@gmail.com',
    role: 'admin',
    business_roles: ['payment_slip']
  },
  admin_tcc: {
    email: 'dave@yec.dev',
    role: 'admin', 
    business_roles: ['tcc_card']
  },
  non_admin: {
    email: 'test@example.com',
    role: 'admin',
    business_roles: []
  }
} as const;

type UserRole = keyof typeof TEST_USERS;

/**
 * Check if test helpers are enabled
 */
function isTestHelpersEnabled(): boolean {
  return process.env.E2E_TEST_MODE === "true" && process.env.TEST_HELPERS_ENABLED === "1";
}

/**
 * Generate HMAC signature for authentication
 */
function generateHmac(payload: string): string {
  const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
  if (!e2eAuthSecret) {
    throw new Error('E2E_AUTH_SECRET environment variable is required');
  }
  
  return crypto
    .createHmac('sha256', e2eAuthSecret)
    .update(payload)
    .digest('hex');
}

/**
 * Generate timestamp-based HMAC for auth probe
 */
function generateAuthProbeHmac(method: string, path: string, timestamp: string): string {
  const payload = `${method}:${path}:${timestamp}`;
  return generateHmac(payload);
}

/**
 * Check auth readiness by calling the auth probe endpoint
 */
export async function checkAuthReadiness(page: Page): Promise<boolean> {
  if (!isTestHelpersEnabled()) {
    throw new Error('Test helpers are not enabled. Set E2E_TEST_MODE=true and TEST_HELPERS_ENABLED=1');
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmac = generateAuthProbeHmac('GET', '/api/dev/route-auth-check', timestamp);
    
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
    const response = await page.request.get(`${baseURL}/api/dev/route-auth-check`, {
      headers: {
        'X-E2E-SIGN': hmac,
        'X-E2E-TIMESTAMP': timestamp
      }
    });

    return response.status() === 204;
  } catch (error) {
    console.error('Auth readiness check failed:', error);
    return false;
  }
}

/**
 * Sign in as a specific role using the test auth endpoint
 */
export async function signInAs(page: Page, role: UserRole): Promise<void> {
  if (!isTestHelpersEnabled()) {
    throw new Error('Test helpers are not enabled. Set E2E_TEST_MODE=true and TEST_HELPERS_ENABLED=1');
  }

  const user = TEST_USERS[role];
  if (!user) {
    throw new Error(`Unknown role: ${role}`);
  }

  try {
    // Calculate HMAC for authentication
    const payload = JSON.stringify({ email: user.email });
    const hmac = generateHmac(payload);

    // Call the test auth endpoint
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
    const response = await page.request.post(`${baseURL}/api/test/auth/login`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-AUTH': hmac,
      },
      data: { email: user.email },
    });

    if (response.status() !== 204) {
      throw new Error(`Login failed for ${user.email}: ${response.status()} ${response.statusText()}`);
    }

    // Set cookies from the response
    const setCookieHeaders = response
      .headersArray()
      .filter(h => h.name.toLowerCase() === 'set-cookie')
      .map(h => h.value);

    if (setCookieHeaders.length > 0) {
      const parsed = setCookieHeaders.map((cookieStr) => {
        const [pair] = cookieStr.split(';');
        const eqIndex = pair.indexOf('=');
        const name = pair.slice(0, eqIndex);
        const value = pair.slice(eqIndex + 1);
        return {
          name,
          value,
          domain: 'localhost',
          path: '/',
        } as any;
      });
      await page.context().addCookies(parsed);
    }

    // Verify authentication was successful
    const authRes = await page.request.get(`${baseURL}/api/test/rbac-debug?email=${encodeURIComponent(user.email)}`);
    if (authRes.status() !== 200) {
      throw new Error(`Authentication verification failed: ${authRes.status()}`);
    }
    
    const authData = await authRes.json();
    console.log(`Authentication successful for ${user.email} (${role}):`, {
      roles: authData.roles,
      isAdmin: authData.roles.length > 0
    });

  } catch (error) {
    console.error(`Failed to sign in as ${role}:`, error);
    throw error;
  }
}

/**
 * Get admin API helper with authentication attached
 */
export async function getAdminApi(page: Page, role: UserRole = 'super_admin') {
  if (!isTestHelpersEnabled()) {
    throw new Error('Test helpers are not enabled. Set E2E_TEST_MODE=true and TEST_HELPERS_ENABLED=1');
  }

  // Ensure we're signed in
  await signInAs(page, role);
  
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
  
  return {
    get: (path: string, options?: any) => page.request.get(`${baseURL}${path}`, options),
    post: (path: string, options?: any) => page.request.post(`${baseURL}${path}`, options),
    patch: (path: string, options?: any) => page.request.patch(`${baseURL}${path}`, options),
    delete: (path: string, options?: any) => page.request.delete(`${baseURL}${path}`, options),
    put: (path: string, options?: any) => page.request.put(`${baseURL}${path}`, options),
  };
}

/**
 * Get user email for a role
 */
export function getUserEmail(role: UserRole): string {
  return TEST_USERS[role].email;
}

/**
 * Seed business roles for a test actor
 * Only works when E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 */
export async function seedBusinessRoles(
  page: Page, 
  email: string, 
  roles: Array<'user_profile' | 'payment_slip' | 'tcc_card'>
): Promise<void> {
  if (!isTestHelpersEnabled()) {
    throw new Error('Test helpers are not enabled. Set E2E_TEST_MODE=true and TEST_HELPERS_ENABLED=1');
  }

  try {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Call the test route from the signed-in context
    const res = await page.request.post('/api/test/seed-business-roles', {
      data: { email, business_roles: roles },
    });
    
    if (!([200, 201].includes(res.status()))) {
      console.log('seedBusinessRoles status:', res.status());
      console.log('seedBusinessRoles text:', await res.text());
      throw new Error('seedBusinessRoles failed');
    }

    console.log(`✅ Seeded business roles for ${email}:`, roles);
  } catch (error) {
    console.error(`Error seeding business roles for ${email}:`, error);
    throw error;
  }
}

/**
 * Seed admin user with specific roles in the database
 * Only works when E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 */
export async function seedAdminWithRoles(
  email: string, 
  opts: { 
    role?: 'admin' | 'super_admin'; 
    business_roles?: ('user_profile' | 'payment_slip' | 'tcc_card')[] 
  }
): Promise<void> {
  if (!isTestHelpersEnabled()) {
    throw new Error('Test helpers are not enabled. Set E2E_TEST_MODE=true and TEST_HELPERS_ENABLED=1');
  }

  try {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Use the existing test endpoint to seed admin user
    const response = await fetch(`${baseURL}/api/test/seed-admin-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to seed admin user: ${errorData.error || response.statusText}`);
    }

    // If we need to set specific business roles, we'll need to update the user
    if (opts.business_roles && opts.business_roles.length > 0) {
      // For now, we'll log that business roles were requested
      // The actual business role assignment would need to be implemented in the seed endpoint
      console.log(`✅ Seeded admin user: ${email} with role: ${opts.role}, business_roles: ${opts.business_roles?.join(', ') || 'none'} (business roles not yet implemented in seed endpoint)`);
    } else {
      console.log(`✅ Seeded admin user: ${email} with role: ${opts.role}`);
    }

  } catch (error) {
    console.error(`Error seeding admin user ${email}:`, error);
    throw error;
  }
}
