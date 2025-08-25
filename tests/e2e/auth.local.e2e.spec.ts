import { test, expect } from './fixtures';
import { getTestEnv } from './utils/env';

// Guard with environment check
test.beforeAll(() => {
  const env = getTestEnv();
  if (!env.RUN_LOCAL_TESTS) {
    test.skip();
  }
});

test.describe('Supabase Magic Link Auth - Local Environment', () => {
  test('complete magic link authentication flow', async ({ 
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
    console.log('[LOCAL] Generating magic link for:', env.ADMIN_EMAIL);
    const magicLink = await magicLinkFor(env.ADMIN_EMAIL);
    console.log('[LOCAL] Magic link generated:', magicLink.substring(0, 100) + '...');

    // Step 2: Navigate to magic link
    console.log('[LOCAL] Navigating to magic link');
    await page.goto(magicLink, { waitUntil: 'domcontentloaded' });

    // Step 3: Wait for auth callback API call and validate response
    console.log('[LOCAL] Waiting for auth callback API call');
    const [callbackResponse] = await Promise.all([
      page.waitForResponse(/\/api\/auth\/callback/, { timeout: 30000 }),
      page.waitForLoadState('networkidle', { timeout: 30000 })
    ]);

    // Step 4: Validate callback response
    console.log('[LOCAL] Validating callback response');
    expect(callbackResponse.status()).toBe(303); // 303 is correct for redirect after successful auth
    // Note: Cookies are set by Supabase client, not in response headers

    // Step 5: Wait for admin dashboard to load
    console.log('[LOCAL] Waiting for admin dashboard');
    await page.waitForURL('**/admin', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Step 6: Verify admin dashboard content
    console.log('[LOCAL] Verifying admin dashboard content');
    await expect(page.locator('text=Registration Management')).toBeVisible();
    await expect(page.locator('text=Total Registrations')).toBeVisible();

    // Step 7: Validate auth cookie exists
    console.log('[LOCAL] Validating auth cookie');
    await expectAuthCookie(context, projectRef);

    // Step 8: Verify whoami endpoint returns correct status
    console.log('[LOCAL] Verifying whoami endpoint');
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
    console.log('[LOCAL] Testing sign-out');
    await page.goto('/admin/logout', { waitUntil: 'domcontentloaded' });

    // Step 10: Verify cookies are cleared and UI shows not authenticated
    console.log('[LOCAL] Verifying sign-out clears cookies');
    const cookiesAfterLogout = await context.cookies();
    const authCookieAfterLogout = cookiesAfterLogout.find(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
    );
    
    expect(authCookieAfterLogout).toBeUndefined();

    // Step 11: Verify whoami shows not authenticated
    console.log('[LOCAL] Verifying whoami shows not authenticated');
    const whoamiAfterLogout = await page.request.get('/api/whoami');
    expect(whoamiAfterLogout.status()).toBe(200);
    
    const whoamiDataAfterLogout = await whoamiAfterLogout.json();
    expect(whoamiDataAfterLogout).toMatchObject({
      isAuthenticated: false
    });

    console.log('[LOCAL] Auth flow test completed successfully');
  });

  test('magic link with invalid tokens should fail gracefully', async ({ 
    page, 
    appUrl 
  }) => {
    // Test with invalid tokens
    const invalidCallbackUrl = `${appUrl}/auth/callback#access_token=invalid&refresh_token=invalid`;
    
    console.log('[LOCAL] Testing invalid magic link');
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
    
    console.log('[LOCAL] Testing magic link with missing tokens');
    await page.goto(emptyCallbackUrl, { waitUntil: 'domcontentloaded' });

    // Should show error message
    await expect(page.locator('text=Authentication Failed')).toBeVisible();
    await expect(page.locator('text=No access token or refresh token found')).toBeVisible();
  });
});
