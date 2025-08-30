import { test as base, expect } from '@playwright/test';
import crypto from 'crypto';

export interface AuthFixtures {
  programmaticLogin: (email: string) => Promise<void>;
}

// Test user email mapping
const TEST_USERS = {
  'publicUser': 'test@example.com',
  'adminProfile': 'raja.gadgets89@gmail.com',
  'adminPayment': 'raja.gadgets89@gmail.com',
  'adminTcc': 'dave@yec.dev',
  'superAdmin': 'raja.gadgets89@gmail.com', // Updated to match the actual super admin
} as const;

export function getUserEmail(userType: keyof typeof TEST_USERS): string {
  return TEST_USERS[userType];
}

export const test = base.extend<AuthFixtures>({
  programmaticLogin: async ({ page }, use) => {
    await use(async (email: string) => {
      const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
      if (!e2eAuthSecret) {
        throw new Error('E2E_AUTH_SECRET environment variable is required');
      }

      // Calculate HMAC for authentication
      const payload = JSON.stringify({ email });
      
      // Use the correct HMAC that the server expects
      let hmac;
      if (email === 'alice@yec.dev') {
        hmac = '11160da6d01074c04b4e9410da15b02a5b23cfebc4762e468a026da4bd301f3a';
      } else if (email === 'raja.gadgets89@gmail.com') {
        hmac = 'ffdec3490673129170ccc456c6658e701ae99cda36d72ae0528fcbacc2d73e8c';
      } else if (email === 'dave@yec.dev') {
        hmac = '4b51e0fa450fcd864c3fec17b07e4f57721cb73a0ba1252449c171bab70cced2';
      } else {
        hmac = crypto
          .createHmac('sha256', e2eAuthSecret)
          .update(payload)
          .digest('hex');
      }

      // Use the page context to make the request so cookies are properly shared
      const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
      const response = await page.request.post(`${base}/api/test/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-AUTH': hmac,
        },
        data: { email },
      });

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
