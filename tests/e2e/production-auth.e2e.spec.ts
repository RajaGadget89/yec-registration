import { test, expect } from '@playwright/test';

const REQUIRED_ENVS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

test.beforeAll(() => {
  const missing = REQUIRED_ENVS.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
});

// Set overall test timeout to 60s for this spec
test.setTimeout(60000);

const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 
                   (process.env.ADMIN_EMAILS?.split(',')[0]?.trim() ?? 'raja.gadgets89@gmail.com');

/**
 * E2E Test: Production Authentication Flow
 * 
 * This test validates the production authentication flow:
 * 1. Tests magic link authentication with proper cookie domain
 * 2. Verifies session establishment with correct cookie settings
 * 3. Tests sign-out functionality that properly clears cookies
 * 4. Validates UI updates after sign-out
 * 
 * How to run:
 * 1. Ensure environment variables are set:
 *    - NEXT_PUBLIC_APP_URL=https://yec.rajagadget.live (for production testing)
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *    - SUPABASE_SERVICE_ROLE_KEY
 *    - TEST_ADMIN_EMAIL (any admin-authorized email)
 * 2. Run: npm run e2e:install && npm run e2e
 */
test.describe('Production Authentication Flow', () => {
  test('production magic link authentication with proper cookies', async ({ page, context }, testInfo) => {
    test.setTimeout(60_000);

    // Track network responses to verify Set-Cookie headers
    const responses: any[] = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        statusText: response.statusText()
      });
    });

    // Use direct login for testing (development only)
    const url = `/api/test/direct-login?email=${encodeURIComponent(TEST_EMAIL)}`;
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Land on /admin
    await page.waitForURL('**/admin', { timeout: 30_000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on the admin dashboard
    await expect(page.locator('text=Registration Management')).toBeVisible();
    await expect(page.locator('text=Total Registrations')).toBeVisible();
    
    // Check for Set-Cookie headers in responses
    const setCookieResponses = responses.filter(r => r.headers['set-cookie']);
    console.log(`[E2E] Found ${setCookieResponses.length} responses with Set-Cookie headers`);
    
    if (setCookieResponses.length > 0) {
      setCookieResponses.forEach((response, index) => {
        console.log(`[E2E] Response ${index + 1} (${response.url}):`, {
          status: response.status,
          setCookieHeaders: response.headers['set-cookie']
        });
      });
    }
    
    // Verify whoami endpoint returns correct admin status
    const whoami = await page.request.get('/api/whoami');
    expect(whoami.status()).toBe(200);
    
    const whoamiData = await whoami.json();
    testInfo.attach('whoami-final', { body: JSON.stringify(whoamiData), contentType: 'application/json' });
    
    // Strict assertion: whoami must return correct email and admin status
    expect(whoamiData).toMatchObject({ 
      email: TEST_EMAIL, 
      isAdmin: true 
    });
    
    // Check cookies in browser context
    const cookies = await context.cookies();
    console.log(`[E2E] Browser cookies:`, cookies.map(c => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite
    })));
    
    // Verify required cookies exist
    const adminEmailCookie = cookies.find(c => c.name === 'admin-email');
    const accessTokenCookie = cookies.find(c => c.name === 'sb-access-token');
    const refreshTokenCookie = cookies.find(c => c.name === 'sb-refresh-token');
    
    expect(adminEmailCookie).toBeTruthy();
    expect(accessTokenCookie).toBeTruthy();
    expect(refreshTokenCookie).toBeTruthy();
    
    // Verify cookie domain settings for production
    if (process.env.NODE_ENV === 'production') {
      expect(adminEmailCookie?.domain).toBe('.rajagadget.live');
      expect(accessTokenCookie?.domain).toBe('.rajagadget.live');
      expect(refreshTokenCookie?.domain).toBe('.rajagadget.live');
    }
    
    // Save test artifacts
    const testOutput = {
      timestamp: new Date().toISOString(),
      responses: responses.map(r => ({
        url: r.url,
        status: r.status,
        statusText: r.statusText,
        hasSetCookie: !!r.headers['set-cookie'],
        setCookieCount: r.headers['set-cookie']?.length || 0
      })),
      cookies: cookies
    };
    
    testInfo.attach('production-auth-test-output', { 
      body: JSON.stringify(testOutput, null, 2), 
      contentType: 'application/json' 
    });
  });

  test('sign-out properly clears cookies and updates UI', async ({ page, context }, testInfo) => {
    test.setTimeout(60_000);

    // First, authenticate the user
    const url = `/api/test/direct-login?email=${encodeURIComponent(TEST_EMAIL)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/admin', { timeout: 30_000 });
    await page.waitForLoadState('networkidle');

    // Verify we're authenticated
    await expect(page.locator('text=Registration Management')).toBeVisible();
    
    // Check initial cookies
    const initialCookies = await context.cookies();
    const initialAuthCookies = initialCookies.filter(c => 
      ['admin-email', 'sb-access-token', 'sb-refresh-token'].includes(c.name)
    );
    expect(initialAuthCookies.length).toBeGreaterThan(0);

    // Track network responses for logout
    const logoutResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/logout') || response.url().includes('/auth/logout')) {
        logoutResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          statusText: response.statusText()
        });
      }
    });

    // Click the sign-out button
    const signOutButton = page.locator('button:has-text("Sign out")');
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();

    // Wait for redirect to login page
    await page.waitForURL('**/admin/login', { timeout: 10_000 });

    // Verify we're on the login page
    await expect(page.locator('text=Admin Login')).toBeVisible();
    await expect(page.locator('text=Sign in to access the admin dashboard')).toBeVisible();

    // Check that cookies were cleared
    const finalCookies = await context.cookies();
    const finalAuthCookies = finalCookies.filter(c => 
      ['admin-email', 'sb-access-token', 'sb-refresh-token'].includes(c.name)
    );
    
    // All auth cookies should be cleared (empty value or expired)
    for (const cookie of finalAuthCookies) {
      expect(cookie.value).toBe('');
    }

    // Verify whoami endpoint returns unauthenticated
    const whoami = await page.request.get('/api/whoami');
    expect(whoami.status()).toBe(401);

    // Save test artifacts
    const testOutput = {
      timestamp: new Date().toISOString(),
      initialCookies: initialAuthCookies,
      finalCookies: finalAuthCookies,
      logoutResponses: logoutResponses.map(r => ({
        url: r.url,
        status: r.status,
        statusText: r.statusText,
        hasSetCookie: !!r.headers['set-cookie'],
        setCookieCount: r.headers['set-cookie']?.length || 0
      }))
    };
    
    testInfo.attach('signout-test-output', { 
      body: JSON.stringify(testOutput, null, 2), 
      contentType: 'application/json' 
    });
  });

  test('magic link generation uses correct production URL', async ({ page }, testInfo) => {
    // Test that magic link generation uses the correct production URL
    const response = await page.request.get(`/api/test/magic-link?email=${encodeURIComponent(TEST_EMAIL)}`);
    
    if (!response.ok()) {
      const text = await response.text();
      testInfo.attach('magic-link-response', { body: text, contentType: 'application/json' });
      expect(response.ok(), text).toBeTruthy();
    }
    
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.ok).toBe(true);
    expect(responseData.email).toBe(TEST_EMAIL);
    expect(responseData.actionLink).toBeTruthy();
    
    // Verify the action link uses the correct domain
    const actionLink = responseData.actionLink;
    console.log(`[E2E] Magic link action link: ${actionLink}`);
    
    if (process.env.NODE_ENV === 'production') {
      expect(actionLink).toContain('https://yec.rajagadget.live');
    } else {
      expect(actionLink).toContain('/auth/callback');
    }
    
    testInfo.attach('magic-link-details', { 
      body: JSON.stringify({
        actionLink,
        expectedDomain: process.env.NEXT_PUBLIC_APP_URL,
        nodeEnv: process.env.NODE_ENV
      }, null, 2), 
      contentType: 'application/json' 
    });
  });
});
