import { test, expect } from '@playwright/test';

test.describe('Magic Link Callback Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should handle magic link callback successfully', async ({ page }) => {
    // Navigate to the magic link callback URL with mock tokens
    const magicLinkUrl = 'http://localhost:8080/auth/callback#access_token=mock_access_token&expires_at=1754921394&expires_in=3600&refresh_token=mock_refresh_token&token_type=bearer&type=magiclink';

    // Listen for network requests
    const requestPromise = page.waitForRequest(request => 
      request.url().includes('/api/auth/callback') && request.method() === 'POST'
    );

    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/callback') && response.request().method() === 'POST'
    );

    // Navigate to the callback page
    await page.goto(magicLinkUrl);

    // Wait for the page to load and show processing state
    await expect(page.locator('text=Processing Authentication')).toBeVisible();

    // Wait for the POST request to be made
    const request = await requestPromise;
    const response = await responsePromise;

    // Log request details
    console.log('Request URL:', request.url());
    console.log('Request method:', request.method());
    console.log('Request headers:', request.headers());
    
    const requestBody = JSON.parse(request.postData() || '{}');
    console.log('Request body:', {
      hasAccessToken: !!requestBody.access_token,
      hasRefreshToken: !!requestBody.refresh_token,
      accessTokenLength: requestBody.access_token?.length || 0,
      refreshTokenLength: requestBody.refresh_token?.length || 0
    });

    // Log response details
    console.log('Response status:', response.status());
    console.log('Response headers:', response.headers());
    console.log('Response URL:', response.url());

    // Check if response is 303
    expect(response.status()).toBe(303);

    // Check for Location header
    const locationHeader = response.headers()['location'];
    console.log('Location header:', locationHeader);
    expect(locationHeader).toBe('http://localhost:8080/admin');

    // Check for Set-Cookie headers
    const setCookieHeaders = response.headers()['set-cookie'];
    console.log('Set-Cookie headers:', setCookieHeaders);
    expect(setCookieHeaders).toBeDefined();

    // Wait for redirect to admin page
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Verify we're on the admin page
    await expect(page).toHaveURL(/.*\/admin/);

    // Check that authentication cookies are set
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name === 'admin-email' || 
      cookie.name === 'sb-access-token' || 
      cookie.name === 'sb-refresh-token'
    );

    console.log('Authentication cookies:', authCookies.map(c => ({
      name: c.name,
      value: c.value?.substring(0, 20) + '...',
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure
    })));

    expect(authCookies).toHaveLength(3);
    expect(authCookies.find(c => c.name === 'admin-email')).toBeDefined();
    expect(authCookies.find(c => c.name === 'sb-access-token')).toBeDefined();
    expect(authCookies.find(c => c.name === 'sb-refresh-token')).toBeDefined();
  });

  test('should handle invalid tokens gracefully', async ({ page }) => {
    // Test with invalid tokens
    const invalidMagicLinkUrl = 'http://localhost:8080/auth/callback#access_token=invalid&refresh_token=invalid&token_type=bearer&type=magiclink';

    // Listen for network requests
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/callback') && response.request().method() === 'POST'
    );

    // Navigate to the callback page
    await page.goto(invalidMagicLinkUrl);

    // Wait for the POST request to be made
    const response = await responsePromise;

    // Check if response is 401 (unauthorized)
    expect(response.status()).toBe(401);

    // Should show error message
    await expect(page.locator('text=Authentication Failed')).toBeVisible();
    await expect(page.locator('text=Invalid or expired magic link')).toBeVisible();
  });

  test('should handle missing tokens gracefully', async ({ page }) => {
    // Test with no tokens in URL
    const emptyMagicLinkUrl = 'http://localhost:8080/auth/callback';

    // Navigate to the callback page
    await page.goto(emptyMagicLinkUrl);

    // Should show error message immediately
    await expect(page.locator('text=Authentication Failed')).toBeVisible();
    await expect(page.locator('text=No access token or refresh token found')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/auth/callback', route => {
      route.abort('failed');
    });

    const magicLinkUrl = 'http://localhost:8080/auth/callback#access_token=test&refresh_token=test&token_type=bearer&type=magiclink';

    // Navigate to the callback page
    await page.goto(magicLinkUrl);

    // Should show error message
    await expect(page.locator('text=Authentication Failed')).toBeVisible();
    await expect(page.locator('text=An unexpected error occurred')).toBeVisible();
  });

  test('should preserve query parameters in redirect', async ({ page }) => {
    // Test with next parameter
    const magicLinkUrl = 'http://localhost:8080/auth/callback?next=%2Fadmin%2Fdashboard#access_token=mock_access_token&expires_at=1754921394&expires_in=3600&refresh_token=mock_refresh_token&token_type=bearer&type=magiclink';

    // Listen for network requests
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/callback') && response.request().method() === 'POST'
    );

    // Navigate to the callback page
    await page.goto(magicLinkUrl);

    // Wait for the POST request to be made
    const response = await responsePromise;

    // Check if response is 303
    expect(response.status()).toBe(303);

    // Check for Location header with next parameter
    const locationHeader = response.headers()['location'];
    console.log('Location header with next parameter:', locationHeader);
    expect(locationHeader).toBe('http://localhost:8080/admin/dashboard');
  });

  test('should handle browser console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const magicLinkUrl = 'http://localhost:8080/auth/callback#access_token=mock_access_token&expires_at=1754921394&expires_in=3600&refresh_token=mock_refresh_token&token_type=bearer&type=magiclink';

    // Navigate to the callback page
    await page.goto(magicLinkUrl);

    // Wait for redirect or error
    try {
      await page.waitForURL('**/admin', { timeout: 10000 });
    } catch {
      // If redirect doesn't happen, check for error state
      await expect(page.locator('text=Authentication Failed')).toBeVisible();
    }

    // Log any console errors
    console.log('Console errors:', consoleErrors);

    // Should not have the specific error we're seeing
    const hasServerError = consoleErrors.some(error => 
      error.includes('[callback] server error: {}')
    );
    expect(hasServerError).toBe(false);
  });
});
