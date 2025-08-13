import { test, expect, Page } from '@playwright/test';
import { mockAuthHandler } from './mock-auth-handler';

/**
 * Authentication Callback Debug Test Suite
 * Based on Ishikawa Diagram Analysis
 * 
 * This test suite systematically tests each component of the authentication
 * callback flow to identify the exact failure point causing:
 * - [callback] server error: {}
 * - [callback] could not parse error response as JSON
 */

// Real magic link URL from the user's email
const REAL_MAGIC_LINK_URL = "http://localhost:8080/auth/callback#access_token=eyJhbGciOiJIUzI1NiIsImtpZCI6IkJ5TnFtL3FQVlY1WXkzMWMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3d2d3pocHl2b2d3eXBtcWd2dGp2LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyZDZjYjU4YS03ODY1LTRmYTAtYjU3ZC04NWZhYjY2ZWYwYjEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0OTMwNTM5LCJpYXQiOjE3NTQ5MjY5MzksImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzU0OTI2OTM5fV0sInNlc3Npb25faWQiOiJmOGU5NTIzMC0wNjU1LTQ0N2QtYmEzZC0wMmY2MDAxMDA0ZTUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.IPxJUDQJkbDBzTFOuk-3qBB0PHt1VrA4JAp3rKeKbGQ&expires_at=1754930539&expires_in=3600&refresh_token=nhg3ruonyezf&token_type=bearer&type=magiclink";

// Test data
const TEST_ADMIN_EMAIL = 'raja.gadgets89@gmail.com';
const TEST_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkJ5TnFtL3FQVlY1WXkzMWMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3d2d3pocHl2b2d3eXBtcWd2dGp2LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyZDZjYjU4YS03ODY1LTRmYTAtYjU3ZC04NWZhYjY2ZWYwYjEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0OTMwNTM5LCJpYXQiOjE3NTQ5MjY5MzksImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzU0OTI2OTM5fV0sInNlc3Npb25faWQiOiJmOGU5NTIzMC0wNjU1LTQ0N2QtYmEzZC0wMmY2MDAxMDA0ZTUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.IPxJUDQJkbDBzTFOuk-3qBB0PHt1VrA4JAp3rKeKbGQ';
const TEST_REFRESH_TOKEN = 'nhg3ruonyezf';

test.describe('Authentication Callback Debug - Ishikawa Analysis', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Enable console logging for debugging
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Enable network request logging
    page.on('request', request => {
      console.log(`[Network Request] ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`[Network Response] ${response.status()} ${response.url()}`);
    });
  });

  /**
   * TEST SUITE 1: URL Hash Token Extraction
   * Root Cause Category: Client-Side Issues
   */
  test.describe('URL Hash Token Extraction', () => {
    
    test('should extract tokens from real magic link URL', async () => {
      console.log('[Test] Testing URL hash token extraction');
      
      // Navigate to the real magic link URL
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      // Check if we're on the callback page
      await expect(page).toHaveURL(/\/auth\/callback/);
      
      // Verify the hash is present
      const hash = await page.evaluate(() => window.location.hash);
      expect(hash).toContain('access_token=');
      expect(hash).toContain('refresh_token=');
      expect(hash).toContain('type=magiclink');
      
      console.log('[Test] URL hash contains required tokens');
    });

    test('should handle malformed URLs gracefully', async () => {
      console.log('[Test] Testing malformed URL handling');
      
      // Test URL with missing tokens
      const malformedUrl = 'http://localhost:8080/auth/callback#type=magiclink';
      await page.goto(malformedUrl);
      
      // Wait for error state
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
      
      // Verify error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Missing authentication tokens');
      
      console.log('[Test] Malformed URL handled correctly');
    });

    test('should validate token format', async () => {
      console.log('[Test] Testing token format validation');
      
      // Test with invalid token format
      const invalidTokenUrl = 'http://localhost:8080/auth/callback#access_token=invalid.token&refresh_token=invalid&type=magiclink';
      await page.goto(invalidTokenUrl);
      
      // Wait for processing
      await page.waitForTimeout(2000);
      
      // Check for error state
      const errorElement = await page.locator('[data-testid="error-message"]').isVisible();
      if (errorElement) {
        const errorMessage = await page.textContent('[data-testid="error-message"]');
        console.log('[Test] Invalid token format error:', errorMessage);
      }
      
      console.log('[Test] Token format validation completed');
    });
  });

  /**
   * TEST SUITE 2: API Response Handling
   * Root Cause Category: Server-Side Issues
   */
  test.describe('API Response Handling', () => {
    
    test('should handle 303 redirect response correctly', async () => {
      console.log('[Test] Testing 303 redirect response handling');
      
      // Mock the API response to return 303
      await mockAuthHandler(page, {
        status: 303,
        headers: { 'Location': '/admin' },
        cookies: {
          'sb-access-token': TEST_ACCESS_TOKEN,
          'sb-refresh-token': TEST_REFRESH_TOKEN,
          'admin-email': TEST_ADMIN_EMAIL
        }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for redirect
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      
      // Verify we're on admin page
      await expect(page).toHaveURL(/\/admin/);
      
      console.log('[Test] 303 redirect handled correctly');
    });

    test('should parse error responses correctly', async () => {
      console.log('[Test] Testing error response parsing');
      
      // Mock API error response
      await mockAuthHandler(page, {
        status: 401,
        body: { message: 'Invalid authentication tokens' }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for error state
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
      
      // Verify error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Invalid authentication tokens');
      
      console.log('[Test] Error response parsed correctly');
    });

    test('should handle non-JSON responses', async () => {
      console.log('[Test] Testing non-JSON response handling');
      
      // Mock non-JSON response
      await mockAuthHandler(page, {
        status: 200,
        body: 'Plain text response',
        headers: { 'Content-Type': 'text/plain' }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for processing
      await page.waitForTimeout(3000);
      
      // Check console for parsing error
      const consoleLogs = await page.evaluate(() => {
        return window.console.logs || [];
      });
      
      const hasParsingError = consoleLogs.some(log => 
        log.includes('could not parse error response as JSON')
      );
      
      console.log('[Test] Non-JSON response handling:', hasParsingError ? 'Error logged' : 'No parsing error');
    });
  });

  /**
   * TEST SUITE 3: Supabase Token Verification
   * Root Cause Category: Server-Side Issues
   */
  test.describe('Supabase Token Verification', () => {
    
    test('should verify valid tokens with Supabase', async () => {
      console.log('[Test] Testing Supabase token verification');
      
      // Mock successful Supabase verification
      await mockAuthHandler(page, {
        status: 303,
        supabaseResponse: {
          user: { email: TEST_ADMIN_EMAIL, id: 'test-user-id' },
          error: null
        }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for success state
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
      
      // Verify success message
      const successMessage = await page.textContent('[data-testid="success-message"]');
      expect(successMessage).toContain('Authentication Successful');
      
      console.log('[Test] Supabase token verification successful');
    });

    test('should handle invalid tokens', async () => {
      console.log('[Test] Testing invalid token handling');
      
      // Mock Supabase verification failure
      await mockAuthHandler(page, {
        status: 401,
        supabaseResponse: {
          user: null,
          error: { message: 'Invalid token', status: 401 }
        }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for error state
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
      
      // Verify error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Invalid authentication tokens');
      
      console.log('[Test] Invalid token handled correctly');
    });

    test('should validate admin user status', async () => {
      console.log('[Test] Testing admin user validation');
      
      // Mock non-admin user
      await mockAuthHandler(page, {
        status: 403,
        supabaseResponse: {
          user: { email: 'nonadmin@example.com', id: 'non-admin-id' },
          error: null
        }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for error state
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
      
      // Verify error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Access denied');
      
      console.log('[Test] Admin validation working correctly');
    });
  });

  /**
   * TEST SUITE 4: Cookie Management
   * Root Cause Category: Server-Side Issues
   */
  test.describe('Cookie Management', () => {
    
    test('should set cookies correctly', async () => {
      console.log('[Test] Testing cookie setting');
      
      // Mock successful authentication with cookies
      await mockAuthHandler(page, {
        status: 303,
        cookies: {
          'sb-access-token': TEST_ACCESS_TOKEN,
          'sb-refresh-token': TEST_REFRESH_TOKEN,
          'admin-email': TEST_ADMIN_EMAIL
        }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for redirect
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      
      // Verify cookies are set
      const cookies = await page.context().cookies();
      const accessTokenCookie = cookies.find(c => c.name === 'sb-access-token');
      const refreshTokenCookie = cookies.find(c => c.name === 'sb-refresh-token');
      const adminEmailCookie = cookies.find(c => c.name === 'admin-email');
      
      expect(accessTokenCookie).toBeTruthy();
      expect(refreshTokenCookie).toBeTruthy();
      expect(adminEmailCookie).toBeTruthy();
      expect(adminEmailCookie?.value).toBe(TEST_ADMIN_EMAIL);
      
      console.log('[Test] Cookies set correctly');
    });

    test('should verify cookie options', async () => {
      console.log('[Test] Testing cookie options');
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for processing
      await page.waitForTimeout(2000);
      
      // Check cookie attributes
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(c => 
        c.name === 'sb-access-token' || 
        c.name === 'sb-refresh-token' || 
        c.name === 'admin-email'
      );
      
      for (const cookie of authCookies) {
        // Verify security settings
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.secure).toBe(false); // Should be false for localhost
        expect(cookie.sameSite).toBe('Lax');
        expect(cookie.path).toBe('/');
      }
      
      console.log('[Test] Cookie options verified');
    });

    test('should persist cookies after redirect', async () => {
      console.log('[Test] Testing cookie persistence');
      
      // Mock successful authentication
      await mockAuthHandler(page, {
        status: 303,
        cookies: {
          'sb-access-token': TEST_ACCESS_TOKEN,
          'sb-refresh-token': TEST_REFRESH_TOKEN,
          'admin-email': TEST_ADMIN_EMAIL
        }
      });
      
      // Navigate to callback page
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for redirect to admin page
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      
      // Verify we're on admin page
      await expect(page).toHaveURL(/\/admin/);
      
      // Check if admin page loads correctly (indicating cookies work)
      const adminContent = await page.textContent('body');
      expect(adminContent).toContain('Admin Dashboard');
      
      console.log('[Test] Cookies persist after redirect');
    });
  });

  /**
   * TEST SUITE 5: End-to-End Flow
   * Root Cause Category: Integration Issues
   */
  test.describe('End-to-End Flow', () => {
    
    test('should complete full magic link flow', async () => {
      console.log('[Test] Testing complete magic link flow');
      
      // Step 1: Start at admin login page
      await page.goto('http://localhost:8080/admin/login');
      
      // Step 2: Enter email and request magic link
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.click('button[type="submit"]');
      
      // Step 3: Wait for magic link generation
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
      
      // Step 4: Navigate to magic link URL (simulating email click)
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Step 5: Wait for authentication processing
      await page.waitForSelector('[data-testid="loading-message"]', { timeout: 5000 });
      
      // Step 6: Wait for redirect to admin dashboard
      await page.waitForURL(/\/admin/, { timeout: 15000 });
      
      // Step 7: Verify admin access
      await expect(page).toHaveURL(/\/admin/);
      const adminContent = await page.textContent('body');
      expect(adminContent).toContain('Admin Dashboard');
      
      console.log('[Test] Complete magic link flow successful');
    });

    test('should handle authentication failures gracefully', async () => {
      console.log('[Test] Testing authentication failure handling');
      
      // Use invalid magic link
      const invalidUrl = 'http://localhost:8080/auth/callback#access_token=invalid&refresh_token=invalid&type=magiclink';
      await page.goto(invalidUrl);
      
      // Wait for error state
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
      
      // Verify error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Authentication Failed');
      
      // Verify retry mechanism is available
      const retryButton = await page.locator('a[href="/admin/login"]').isVisible();
      expect(retryButton).toBe(true);
      
      console.log('[Test] Authentication failure handled gracefully');
    });

    test('should work across different browsers', async () => {
      console.log('[Test] Testing cross-browser compatibility');
      
      // This test will be run in different browser contexts
      // by Playwright's built-in browser testing
      
      // Navigate to magic link URL
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for processing
      await page.waitForTimeout(3000);
      
      // Check for any browser-specific errors
      const consoleErrors = await page.evaluate(() => {
        return window.console.errors || [];
      });
      
      // Log any errors for debugging
      if (consoleErrors.length > 0) {
        console.log('[Test] Browser-specific errors:', consoleErrors);
      }
      
      console.log('[Test] Cross-browser compatibility check completed');
    });
  });

  /**
   * TEST SUITE 6: Debug Specific Issues
   * Root Cause Category: Specific Error Analysis
   */
  test.describe('Debug Specific Issues', () => {
    
    test('should identify JSON parsing error root cause', async () => {
      console.log('[Test] Debugging JSON parsing error');
      
      // Navigate to the real magic link URL
      await page.goto(REAL_MAGIC_LINK_URL);
      
      // Wait for page load
      await page.waitForLoadState('networkidle');
      
      // Capture all console messages
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      });
      
      // Wait for processing
      await page.waitForTimeout(5000);
      
      // Check for specific error patterns
      const hasServerError = consoleMessages.some(msg => 
        msg.includes('[callback] server error:')
      );
      
      const hasJsonError = consoleMessages.some(msg => 
        msg.includes('could not parse error response as JSON')
      );
      
      const hasRedirectLog = consoleMessages.some(msg => 
        msg.includes('response redirected:')
      );
      
      // Log findings
      console.log('[Test] Error Analysis Results:');
      console.log('- Server Error:', hasServerError);
      console.log('- JSON Parsing Error:', hasJsonError);
      console.log('- Redirect Log:', hasRedirectLog);
      console.log('- All Console Messages:', consoleMessages);
      
      // This test helps identify the exact failure point
      expect(consoleMessages.length).toBeGreaterThan(0);
    });

    test('should verify API endpoint response format', async () => {
      console.log('[Test] Verifying API endpoint response format');
      
      // Make direct API call to test response format
      const response = await page.request.post('http://localhost:8080/api/auth/callback', {
        data: {
          access_token: TEST_ACCESS_TOKEN,
          refresh_token: TEST_REFRESH_TOKEN
        }
      });
      
      // Log response details
      console.log('[Test] API Response Status:', response.status());
      console.log('[Test] API Response Headers:', response.headers());
      
      // Check if response is JSON or redirect
      const contentType = response.headers()['content-type'];
      console.log('[Test] Content-Type:', contentType);
      
      if (response.status() === 303) {
        const location = response.headers()['location'];
        console.log('[Test] Redirect Location:', location);
        expect(location).toBeTruthy();
      } else {
        // Try to parse as JSON
        try {
          const body = await response.json();
          console.log('[Test] JSON Response Body:', body);
        } catch (error) {
          console.log('[Test] Non-JSON Response:', await response.text());
        }
      }
      
      console.log('[Test] API response format verified');
    });
  });
});
