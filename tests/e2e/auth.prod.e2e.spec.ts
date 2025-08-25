import { test, expect } from './fixtures';
import { getTestEnv } from './utils/env';

// Guard with environment check
test.beforeAll(() => {
  const env = getTestEnv();
  if (!env.RUN_PROD_TESTS) {
    test.skip();
  }
});

test.describe('Supabase Magic Link Auth - Production Environment', () => {
  test('complete magic link authentication flow with strict security validation', async ({ 
    page, 
    context, 
    appUrl, 
    projectRef, 
    magicLinkFor, 
    expectAuthCookie, 
    expectSetCookieOn 
  }) => {
    const env = getTestEnv();
    
    // Step 1: Generate magic link
    console.log('[PROD] Generating magic link for:', env.ADMIN_EMAIL);
    const magicLink = await magicLinkFor(env.ADMIN_EMAIL);
    console.log('[PROD] Magic link generated:', magicLink.substring(0, 100) + '...');

    // Step 2: Navigate to magic link
    console.log('[PROD] Navigating to magic link');
    await page.goto(magicLink, { waitUntil: 'domcontentloaded' });

    // Step 3: Wait for auth callback API call and validate response
    console.log('[PROD] Waiting for auth callback API call');
    const [callbackResponse] = await Promise.all([
      page.waitForResponse(/\/api\/auth\/callback/, { timeout: 30000 }),
      page.waitForLoadState('networkidle', { timeout: 30000 })
    ]);

    // Step 4: Validate callback response with strict checks
    console.log('[PROD] Validating callback response');
    expect(callbackResponse.status()).toBe(303); // 303 is correct for redirect after successful auth
    // Note: Cookies are set by Supabase client, not in response headers
    
    // Verify same-origin: callback URL should start with APP_URL
    const callbackUrl = callbackResponse.url();
    expect(callbackUrl).toMatch(new RegExp(`^${appUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    // Step 5: Wait for admin dashboard to load
    console.log('[PROD] Waiting for admin dashboard');
    await page.waitForURL('**/admin', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Step 6: Verify admin dashboard content
    console.log('[PROD] Verifying admin dashboard content');
    await expect(page.locator('text=Registration Management')).toBeVisible();
    await expect(page.locator('text=Total Registrations')).toBeVisible();

    // Step 7: Validate auth cookie exists with production domain
    console.log('[PROD] Validating auth cookie with production domain');
    await expectAuthCookie(context, projectRef, 'prod');

    // Step 8: Verify whoami endpoint returns correct status
    console.log('[PROD] Verifying whoami endpoint');
    const whoamiResponse = await page.request.get('/api/whoami');
    expect(whoamiResponse.status()).toBe(200);
    
    const whoamiData = await whoamiResponse.json();
    expect(whoamiData).toMatchObject({
      user: {
        email: env.ADMIN_EMAIL,
        role: 'admin'
      }
    });

    // Step 9: Test sign-out functionality
    console.log('[PROD] Testing sign-out');
    await page.goto('/admin/logout', { waitUntil: 'domcontentloaded' });

    // Step 10: Verify cookies are cleared and UI shows not authenticated
    console.log('[PROD] Verifying sign-out clears cookies');
    const cookiesAfterLogout = await context.cookies();
    const authCookieAfterLogout = cookiesAfterLogout.find(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
    );
    
    expect(authCookieAfterLogout).toBeUndefined();

    // Step 11: Verify whoami shows not authenticated
    console.log('[PROD] Verifying whoami shows not authenticated');
    const whoamiAfterLogout = await page.request.get('/api/whoami');
    expect(whoamiAfterLogout.status()).toBe(200);
    
    const whoamiDataAfterLogout = await whoamiAfterLogout.json();
    expect(whoamiDataAfterLogout).toMatchObject({
      isAuthenticated: false
    });

    console.log('[PROD] Auth flow test completed successfully');
  });

  test('should not make any requests to vercel.app domains', async ({ 
    page, 
    magicLinkFor 
  }) => {
    const env = getTestEnv();
    
    // Track all requests to detect any vercel.app usage
    const vercelRequests: string[] = [];
    page.on('request', (request: any) => {
      const url = request.url();
      if (url.includes('.vercel.app')) {
        vercelRequests.push(url);
      }
    });

    // Generate and navigate to magic link
    console.log('[PROD] Testing no vercel.app requests');
    const magicLink = await magicLinkFor(env.ADMIN_EMAIL);
    await page.goto(magicLink, { waitUntil: 'domcontentloaded' });

    // Wait for auth flow to complete
    await page.waitForURL('**/admin', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // In production, NO requests to vercel.app should be made
    if (vercelRequests.length > 0) {
      throw new Error(`Production environment should not make requests to *.vercel.app. Found: ${vercelRequests.join(', ')}`);
    }

    console.log('[PROD] No vercel.app requests detected - production security validated');
  });

  test('auth cookie should have correct production domain', async ({ 
    page, 
    context, 
    projectRef, 
    magicLinkFor 
  }) => {
    const env = getTestEnv();
    
    // Generate and navigate to magic link
    console.log('[PROD] Testing auth cookie domain');
    const magicLink = await magicLinkFor(env.ADMIN_EMAIL);
    await page.goto(magicLink, { waitUntil: 'domcontentloaded' });

    // Wait for auth flow to complete
    await page.waitForURL('**/admin', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Get cookies and validate auth cookie domain
    const cookies = await context.cookies();
    const authCookie = cookies.find(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
    );

    expect(authCookie).toBeDefined();
    expect(authCookie?.domain).toBe('.rajagadget.live');

    console.log('[PROD] Auth cookie domain validation passed');
  });

  test('magic link with invalid tokens should fail gracefully', async ({ 
    page, 
    appUrl 
  }) => {
    // Test with invalid tokens
    const invalidCallbackUrl = `${appUrl}/auth/callback#access_token=invalid&refresh_token=invalid`;
    
    console.log('[PROD] Testing invalid magic link');
    await page.goto(invalidCallbackUrl, { waitUntil: 'domcontentloaded' });

    // Should show error message
    await expect(page.locator('text=Authentication Failed')).toBeVisible();
    await expect(page.locator('text=Invalid magic link format')).toBeVisible();
  });

  test('magic link with missing tokens should fail gracefully', async ({ 
    page, 
    appUrl 
  }) => {
    // Test with missing tokens
    const emptyCallbackUrl = `${appUrl}/auth/callback`;
    
    console.log('[PROD] Testing magic link with missing tokens');
    await page.goto(emptyCallbackUrl, { waitUntil: 'domcontentloaded' });

    // Should show error message
    await expect(page.locator('text=Authentication Failed')).toBeVisible();
    await expect(page.locator('text=No access token or refresh token found')).toBeVisible();
  });
});
