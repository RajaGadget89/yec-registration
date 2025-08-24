import { test, expect } from '@playwright/test';

/**
 * Vercel Preview Authentication Test
 * 
 * This test simulates the Vercel preview environment by:
 * 1. Setting VERCEL_URL environment variable
 * 2. Testing magic link generation with Vercel preview URL
 * 3. Verifying the redirect URL is correctly constructed
 * 4. Testing the authentication flow end-to-end
 */

test.describe('Vercel Preview Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Set Vercel preview environment variables for testing
    await page.addInitScript(() => {
      // Mock Vercel environment variables
      Object.defineProperty(window, 'process', {
        value: {
          env: {
            VERCEL_URL: 'yec-registration-git-bugfix-email-d-51885b-rajagadgets-projects.vercel.app',
            VERCEL_ENV: 'preview',
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://yec-registration-git-bugfix-email-d-51885b-rajagadgets-projects.vercel.app'
          }
        },
        writable: true
      });
    });
  });

  test('should generate magic link with correct Vercel preview URL', async ({ page }) => {
    // Navigate to admin login page
    await page.goto('/admin/login');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Admin Login")');
    
    // Fill in admin email
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'raja.gadgets89@gmail.com';
    await page.fill('input[type="email"]', adminEmail);
    
    // Click send magic link button
    await page.click('button:has-text("Send Magic Link")');
    
    // Wait for success message
    await page.waitForSelector('text=Magic link sent! Check your email.');
    
    // Check browser console for debug logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[admin-login]')) {
        logs.push(msg.text());
      }
    });
    
    // Wait a moment for logs to appear
    await page.waitForTimeout(1000);
    
    // Verify the logs contain the correct Vercel preview URL
    const logText = logs.join('\n');
    console.log('Admin login logs:', logText);
    
    // Check that the redirect URL is correctly constructed
    expect(logText).toContain('yec-registration-git-bugfix-email-d-51885b-rajagadgets-projects.vercel.app');
    expect(logText).toContain('/auth/callback');
  });

  test('should handle magic link callback with Vercel preview URL', async ({ page }) => {
    // Test the callback page directly with Vercel preview URL
    const vercelPreviewUrl = 'https://yec-registration-git-bugfix-email-d-51885b-rajagadgets-projects.vercel.app';
    
    // Navigate to callback page with Vercel preview URL
    await page.goto(`${vercelPreviewUrl}/auth/callback`);
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Authentication")');
    
    // Check that the page doesn't show the wrong URL error
    const errorText = await page.locator('text=wrong redirect URL').count();
    expect(errorText).toBe(0);
    
    // Check browser console for debug logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[callback]')) {
        logs.push(msg.text());
      }
    });
    
    // Wait a moment for logs to appear
    await page.waitForTimeout(1000);
    
    // Verify the logs show correct URL handling
    const logText = logs.join('\n');
    console.log('Callback logs:', logText);
    
    // Check that the URL is correctly detected
    expect(logText).toContain('yec-registration-git-bugfix-email-d-51885b-rajagadgets-projects.vercel.app');
  });

  test('should detect and handle wrong redirect URLs', async ({ page }) => {
    // Test with the problematic URL that contains %2A (encoded *)
    const wrongUrl = 'https://%2A.vercel.app/auth/callback';
    
    // Navigate to the wrong URL
    await page.goto(wrongUrl);
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Authentication")');
    
    // Check that the page shows the wrong URL error
    await page.waitForSelector('text=Authentication redirect failed');
    
    // Check browser console for debug logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[callback]')) {
        logs.push(msg.text());
      }
    });
    
    // Wait a moment for logs to appear
    await page.waitForTimeout(1000);
    
    // Verify the logs show wrong URL detection
    const logText = logs.join('\n');
    console.log('Wrong URL logs:', logText);
    
    // Check that the wrong URL is detected
    expect(logText).toContain('Detected wrong redirect URL');
    expect(logText).toContain('%2A.vercel.app');
  });

  test('should test getAppUrl function in Vercel preview environment', async ({ page }) => {
    // Test the getAppUrl function by calling an API that uses it
    const response = await page.request.get('/api/test/magic-link');
    
    // Check that the response contains the correct Vercel preview URL
    const responseText = await response.text();
    console.log('Magic link API response:', responseText);
    
    // The response should contain the correct Vercel preview URL
    expect(responseText).toContain('yec-registration-git-bugfix-email-d-51885b-rajagadgets-projects.vercel.app');
  });
});
