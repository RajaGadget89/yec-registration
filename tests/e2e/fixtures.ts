import { test as base } from '@playwright/test';
import { getTestEnv } from './utils/env';
import { getProjectRef, generateMagicLink, validateAuthCookie } from './utils/supabase';

// Extend the base test with our custom fixtures
export const test = base.extend<{
  appUrl: string;
  projectRef: string;
  magicLinkFor: (email: string) => Promise<string>;
  expectNoVercelRequests: (page: any) => void;
  expectAuthCookie: (context: any, projectRef: string, domainExpectation?: 'prod') => Promise<void>;
  expectSetCookieOn: (response: any) => void;
}>({
  appUrl: async ({}, use) => {
    const env = getTestEnv();
    await use(env.APP_URL);
  },

  projectRef: async ({}, use) => {
    const env = getTestEnv();
    const ref = getProjectRef(env.SUPABASE_URL);
    if (!ref) {
      throw new Error(`Could not extract project ref from SUPABASE_URL: ${env.SUPABASE_URL}`);
    }
    await use(ref);
  },

  magicLinkFor: async ({ appUrl }, use) => {
    const env = getTestEnv();
    const projectRef = getProjectRef(env.SUPABASE_URL);
    if (!projectRef) {
      throw new Error(`Could not extract project ref from SUPABASE_URL: ${env.SUPABASE_URL}`);
    }

    const magicLinkGenerator = async (email: string): Promise<string> => {
      const redirectTo = `${appUrl}/auth/callback`;
      return generateMagicLink(email, redirectTo, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    };

    await use(magicLinkGenerator);
  },

  expectNoVercelRequests: async ({}, use) => {
    const vercelRequestChecker = (page: any) => {
      const vercelRequests: string[] = [];
      
      page.on('request', (request: any) => {
        const url = request.url();
        if (url.includes('.vercel.app')) {
          vercelRequests.push(url);
        }
      });

      // Return a function that can be called to check for vercel requests
      return () => {
        if (vercelRequests.length > 0) {
          throw new Error(`Found requests to *.vercel.app: ${vercelRequests.join(', ')}`);
        }
      };
    };

    await use(vercelRequestChecker);
  },

  expectAuthCookie: async ({}, use) => {
    const authCookieValidator = async (context: any, projectRef: string, domainExpectation?: 'prod') => {
      const cookies = await context.cookies();
      const validation = validateAuthCookie(cookies, projectRef, domainExpectation);
      
      if (!validation.valid) {
        throw new Error(`Auth cookie validation failed: ${validation.error}`);
      }
    };

    await use(authCookieValidator);
  },

  expectSetCookieOn: async ({}, use) => {
    const setCookieValidator = (response: any) => {
      const setCookieHeader = response.headers()['set-cookie'];
      if (!setCookieHeader) {
        throw new Error('Response does not include Set-Cookie header');
      }
    };

    await use(setCookieValidator);
  },
});

export { expect } from '@playwright/test';
