import { test as base, expect } from '@playwright/test';
import crypto from 'crypto';
import { signInAs, getAdminApi, getUserEmail, type UserRole } from '../utils/auth';

export interface AuthFixtures {
  programmaticLogin: (email: string) => Promise<void>;
  signInAs: (role: UserRole) => Promise<void>;
  getAdminApi: (role?: UserRole) => Promise<any>;
  getUserEmail: (role: UserRole) => string;
}

// Check if test helpers are enabled
const E2E_ON = process.env.E2E_TEST_MODE === 'true' && process.env.TEST_HELPERS_ENABLED === '1';

// Centralize test actors (adjust to AC2 expectations)
export const TEST_ACTORS = E2E_ON ? {
  super: 'raja.gadgets89@gmail.com',
  admin_payment: 'raja.gadgets89@gmail.com',
  admin_tcc: 'dave@yec.dev',
  admin_profile: 'raja.gadgets89@gmail.com',
  dave: 'dave@yec.dev',
} : {} as const;

// Test user email mapping (legacy - use utils/auth.ts instead)
const TEST_USERS = {
  'publicUser': 'test@example.com',
  'adminProfile': 'raja.gadgets89@gmail.com',
  'adminPayment': 'raja.gadgets89@gmail.com',
  'adminTcc': 'dave@yec.dev',
  'superAdmin': 'raja.gadgets89@gmail.com', // Updated to match the actual super admin
} as const;

/**
 * Generate HMAC signature for E2E authentication
 */
function signE2E({ method, path, ts, secret }: { method: string; path: string; ts: string; secret: string }) {
  const msg = `${method}:${path}:${ts}`;
  return crypto.createHmac('sha256', secret).update(msg).digest('hex');
}

export const test = base.extend<AuthFixtures>({
  signInAs: async ({ page }, use) => {
    await use(async (role: UserRole) => {
      await signInAs(page, role);
    });
  },
  
  getAdminApi: async ({ page }, use) => {
    await use(async (role: UserRole = 'super_admin') => {
      return await getAdminApi(page, role);
    });
  },
  
  getUserEmail: async ({}, use) => {
    await use((role: UserRole) => {
      return getUserEmail(role);
    });
  },

  programmaticLogin: async ({ page }, use) => {
    await use(async (email: string) => {
      if (!E2E_ON) {
        throw new Error('E2E helpers disabled');
      }

      const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
      if (!e2eAuthSecret) {
        throw new Error('E2E_AUTH_SECRET environment variable is required');
      }

      // Calculate HMAC for authentication dynamically
      const payload = JSON.stringify({ email });
      const hmac = crypto
        .createHmac('sha256', e2eAuthSecret)
        .update(payload)
        .digest('hex');

      // Use the page context to make the request so cookies are properly shared
      const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
      
      // Debug logging
      console.log(`[DEBUG] programmaticLogin calling test auth endpoint for ${email}`);
      console.log(`[DEBUG] E2E_TEST_MODE: ${process.env.E2E_TEST_MODE}`);
      console.log(`[DEBUG] TEST_HELPERS_ENABLED: ${process.env.TEST_HELPERS_ENABLED}`);
      console.log(`[DEBUG] HMAC: ${hmac}`);
      
      const response = await page.request.post(`${base}/api/test/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-AUTH': hmac,
        },
        data: { email },
      });

      console.log(`[DEBUG] Test auth login response status: ${response.status()}`);
      console.log(`[DEBUG] Test auth login response text: ${await response.text()}`);
      
      if (response.status() !== 204) {
        throw new Error(`Login failed: ${response.status()} ${response.statusText()}`);
      }

      // Set cookies from the response (support multiple Set-Cookie headers)
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
      const authRes = await page.request.get(`${base}/api/test/rbac-debug?email=${encodeURIComponent(email)}`);
      if (authRes.status() !== 200) {
        throw new Error(`Authentication verification failed: ${authRes.status()}`);
      }
      
      const authData = await authRes.json();
      console.log(`Authentication successful for ${email}:`, {
        roles: authData.roles,
        isAdmin: authData.roles.length > 0
      });
    });
  },
});

export { expect } from '@playwright/test';
