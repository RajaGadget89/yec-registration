import { test, expect, Page } from '@playwright/test';
import { createMockAuthHandler, MockAuthTokens } from './mock-auth-handler';

test.describe('Comprehensive Authentication Tests', () => {
  let page: Page;
  let mockAuth: ReturnType<typeof createMockAuthHandler>;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    mockAuth = createMockAuthHandler(page);
    await mockAuth.setupMockAuthAPI();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Magic Link Authentication Flow', () => {
    test('should complete full magic link authentication flow', async () => {
      // Step 1: Navigate to admin login
      await page.goto('/admin/login');
      await expect(page).toHaveTitle(/Admin Login/);

      // Step 2: Enter admin email
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('raja.gadgets89@gmail.com');
      
      // Step 3: Submit magic link request
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Step 4: Verify magic link sent message
      await expect(page.locator('text=Magic link sent')).toBeVisible();
      
      // Step 5: Generate mock tokens and simulate callback
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      
      // Step 6: Verify authentication processing
      await expect(page.locator('text=Processing Authentication')).toBeVisible();
      
      // Step 7: Wait for redirect to admin dashboard
      await expect(page).toHaveURL(/\/admin/);
      
      // Step 8: Verify authentication state
      expect(await mockAuth.isAuthenticated()).toBe(true);
      expect(await mockAuth.getCurrentUserEmail()).toBe('raja.gadgets89@gmail.com');
    });

    test('should handle invalid magic link tokens', async () => {
      // Navigate directly to callback with invalid tokens
      await page.goto('/auth/callback#access_token=invalid&refresh_token=invalid');
      
      // Should show error message
      await expect(page.locator('text=Authentication Failed')).toBeVisible();
      await expect(page.locator('text=Invalid or expired magic link')).toBeVisible();
    });

    test('should handle missing tokens in callback', async () => {
      // Navigate to callback without tokens
      await page.goto('/auth/callback');
      
      // Should show error message
      await expect(page.locator('text=Authentication Failed')).toBeVisible();
    });
  });

  test.describe('Cookie Management', () => {
    test('should set authentication cookies correctly', async () => {
      // Generate valid mock tokens
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      
      // Wait for redirect
      await expect(page).toHaveURL(/\/admin/);

      // Check that cookies are set
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        ['sb-access-token', 'sb-refresh-token', 'admin-email'].includes(cookie.name)
      );

      expect(authCookies).toHaveLength(3);
      
      // Verify cookie properties
      const accessTokenCookie = authCookies.find(c => c.name === 'sb-access-token');
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie?.httpOnly).toBe(true);
      expect(accessTokenCookie?.path).toBe('/');
    });

    test('should clear cookies on logout', async () => {
      // First authenticate
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      await expect(page).toHaveURL(/\/admin/);

      // Verify cookies are set
      expect(await mockAuth.isAuthenticated()).toBe(true);

      // Navigate to logout
      await page.goto('/admin/logout');
      
      // Verify cookies are cleared
      expect(await mockAuth.isAuthenticated()).toBe(false);
    });
  });

  test.describe('Admin Dashboard Access Control', () => {
    test('should redirect to login when not authenticated', async () => {
      // Navigate to admin dashboard without authentication
      await page.goto('/admin');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('should allow access to admin dashboard when authenticated', async () => {
      // Authenticate with mock tokens
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      
      // Should be on admin dashboard
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });

    test('should show 403 for non-admin users', async () => {
      // Add mock non-admin user
      await mockAuth.addMockUser('non_admin_token', {
        success: true,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: 'user'
        }
      });

      // Try to authenticate with non-admin user
      await page.goto('/auth/callback#access_token=non_admin_token&refresh_token=refresh_token');
      
      // Should show access denied
      await expect(page.locator('text=Access denied')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network failure
      await page.route('**/api/auth/callback', route => {
        route.abort('failed');
      });

      await page.goto('/auth/callback#access_token=test&refresh_token=test');
      
      // Should show error message
      await expect(page.locator('text=Authentication Failed')).toBeVisible();
    });

    test('should handle server errors gracefully', async () => {
      // Mock server error
      await page.route('**/api/auth/callback', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' })
        });
      });

      await page.goto('/auth/callback#access_token=test&refresh_token=test');
      
      // Should show error message
      await expect(page.locator('text=Authentication Failed')).toBeVisible();
    });

    test('should handle malformed response gracefully', async () => {
      // Mock malformed response
      await page.route('**/api/auth/callback', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        });
      });

      await page.goto('/auth/callback#access_token=test&refresh_token=test');
      
      // Should show error message
      await expect(page.locator('text=Authentication Failed')).toBeVisible();
    });

    test('should handle missing tokens in request body', async () => {
      // Mock missing tokens
      await page.route('**/api/auth/callback', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Missing authentication tokens' })
        });
      });

      await page.goto('/auth/callback#access_token=test&refresh_token=test');
      
      // Should show error message
      await expect(page.locator('text=Authentication Failed')).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in Chrome', async ({ browserName }) => {
      test.skip(browserName !== 'chromium');
      
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      await expect(page).toHaveURL(/\/admin/);
      expect(await mockAuth.isAuthenticated()).toBe(true);
    });

    test('should work in Firefox', async ({ browserName }) => {
      test.skip(browserName !== 'firefox');
      
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      await expect(page).toHaveURL(/\/admin/);
      await expect(page).toHaveURL(/\/admin/);
      expect(await mockAuth.isAuthenticated()).toBe(true);
    });

    test('should work in Safari', async ({ browserName }) => {
      test.skip(browserName !== 'webkit');
      
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      await expect(page).toHaveURL(/\/admin/);
      expect(await mockAuth.isAuthenticated()).toBe(true);
    });
  });

  test.describe('Performance and Loading States', () => {
    test('should show loading state during authentication', async () => {
      // Mock slow response
      await page.route('**/api/auth/callback', route => {
        setTimeout(() => {
          route.fulfill({
            status: 303,
            headers: { 'Location': '/admin' }
          });
        }, 1000);
      });

      await page.goto('/auth/callback#access_token=test&refresh_token=test');
      
      // Should show loading state
      await expect(page.locator('text=Processing Authentication')).toBeVisible();
      await expect(page.locator('.animate-spin')).toBeVisible();
    });

    test('should handle timeout gracefully', async () => {
      // Mock timeout
      await page.route('**/api/auth/callback', route => {
        // Don't fulfill the route, let it timeout
      });

      await page.goto('/auth/callback#access_token=test&refresh_token=test');
      
      // Should eventually show error
      await expect(page.locator('text=Authentication Failed')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Security Tests', () => {
    test('should not expose tokens in client-side code', async () => {
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      
      // Check that tokens are not accessible via JavaScript
      const tokenExposure = await page.evaluate(() => {
        // Try to access tokens from various places
        const accessToken = document.cookie.match(/sb-access-token=([^;]+)/)?.[1];
        const refreshToken = document.cookie.match(/sb-refresh-token=([^;]+)/)?.[1];
        
        return {
          accessTokenExposed: !!accessToken,
          refreshTokenExposed: !!refreshToken,
          windowTokens: !!(window as any).sbAccessToken || !!(window as any).sbRefreshToken
        };
      });

      // Tokens should not be exposed in client-side code
      expect(tokenExposure.accessTokenExposed).toBe(false);
      expect(tokenExposure.refreshTokenExposed).toBe(false);
      expect(tokenExposure.windowTokens).toBe(false);
    });

    test('should use secure cookie settings in production', async () => {
      // This test would need to be run in a production-like environment
      // For now, we'll just verify the cookie options are correct
      const mockTokens = mockAuth.generateMockTokens('raja.gadgets89@gmail.com');
      await mockAuth.simulateMagicLinkCallback(mockTokens);
      
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        ['sb-access-token', 'sb-refresh-token', 'admin-email'].includes(cookie.name)
      );

      // Verify security properties
      authCookies.forEach(cookie => {
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.path).toBe('/');
        expect(cookie.sameSite).toBe('Lax');
      });
    });
  });
});
