import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure tmp directory exists
try {
  mkdirSync('tmp', { recursive: true });
} catch (e) {
  // Directory already exists
}

test.describe('Authentication Flow E2E', () => {
  const baseUrls = [
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ];

  for (const baseUrl of baseUrls) {
    test.describe(`Testing on ${baseUrl}`, () => {
      test('should complete auth flow and set cookies correctly', async ({ page, context }) => {
        // Enable network tracking
        await page.route('**/*', async (route) => {
          await route.continue();
        });

        // Track all network requests
        const requests: any[] = [];
        page.on('request', request => {
          requests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers()
          });
        });

        const responses: any[] = [];
        page.on('response', response => {
          responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            statusText: response.statusText()
          });
        });

        console.log(`[E2E] Starting test on ${baseUrl}`);

        // Navigate to admin login
        await page.goto(`${baseUrl}/admin/login`);
        console.log(`[E2E] Navigated to login page`);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check if we need to generate a magic link
        const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
        if (await magicLinkButton.isVisible()) {
          console.log(`[E2E] Magic link button found, generating test link`);
          
          // Fill email (use first admin email from env or default)
          const emailInput = page.locator('input[type="email"]');
          await emailInput.fill('admin@test.com'); // This should be a valid admin email
          
          // Click magic link button
          await magicLinkButton.click();
          
          // Wait for success message
          await page.waitForSelector('text=Magic link sent!', { timeout: 10000 });
          console.log(`[E2E] Magic link sent successfully`);
          
          // Generate magic link via API for testing
          const magicLinkResponse = await page.request.get(`${baseUrl}/api/test/magic-link?email=admin@test.com`);
          const magicLinkData = await magicLinkResponse.json();
          
          if (magicLinkData.ok && magicLinkData.actionLink) {
            console.log(`[E2E] Generated magic link via API`);
            
            // Navigate to the magic link
            await page.goto(magicLinkData.actionLink);
            console.log(`[E2E] Navigated to magic link: ${magicLinkData.actionLink}`);
            
            // Wait for redirect to callback
            await page.waitForURL('**/auth/callback**', { timeout: 30000 });
            console.log(`[E2E] Redirected to callback page`);
            
            // Wait for the POST request to /auth/callback
            await page.waitForResponse(response => 
              response.url().includes('/auth/callback') && response.request().method() === 'POST',
              { timeout: 30000 }
            );
            
            console.log(`[E2E] POST request to callback completed`);
            
            // Find the callback response
            const callbackResponse = responses.find(r => 
              r.url.includes('/auth/callback') && r.method === 'POST'
            );
            
            if (callbackResponse) {
              console.log(`[E2E] Callback response status: ${callbackResponse.status}`);
              console.log(`[E2E] Callback response headers:`, callbackResponse.headers);
              
              // Check for Set-Cookie headers
              const setCookieHeaders = callbackResponse.headers['set-cookie'];
              if (setCookieHeaders) {
                console.log(`[E2E] Found ${setCookieHeaders.length} Set-Cookie headers:`, setCookieHeaders);
                
                // Verify we have the expected cookies
                const cookieNames = setCookieHeaders.map((cookie: string) => 
                  cookie.split('=')[0]
                );
                
                expect(cookieNames).toContain('sb-access-token');
                expect(cookieNames).toContain('sb-refresh-token');
                expect(cookieNames).toContain('admin-email');
                
                console.log(`[E2E] All expected cookies found in Set-Cookie headers`);
              } else {
                console.error(`[E2E] No Set-Cookie headers found in callback response`);
                throw new Error('No Set-Cookie headers found');
              }
            }
            
            // Wait for redirect to admin dashboard
            await page.waitForURL('**/admin**', { timeout: 30000 });
            console.log(`[E2E] Redirected to admin dashboard`);
            
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
            
            // Verify required cookies exist with correct properties
            const adminEmailCookie = cookies.find(c => c.name === 'admin-email');
            const accessTokenCookie = cookies.find(c => c.name === 'sb-access-token');
            const refreshTokenCookie = cookies.find(c => c.name === 'sb-refresh-token');
            
            expect(adminEmailCookie).toBeTruthy();
            expect(accessTokenCookie).toBeTruthy();
            expect(refreshTokenCookie).toBeTruthy();
            
            // Verify cookie properties
            [adminEmailCookie, accessTokenCookie, refreshTokenCookie].forEach(cookie => {
              if (cookie) {
                expect(cookie.httpOnly).toBe(true);
                expect(cookie.sameSite).toBe('Lax');
                expect(cookie.path).toBe('/');
                expect(cookie.secure).toBe(false); // Should be false in dev
              }
            });
            
            console.log(`[E2E] All cookies verified with correct properties`);
            
            // Verify we're on admin dashboard
            await expect(page).toHaveURL(/.*\/admin/);
            console.log(`[E2E] Successfully reached admin dashboard`);
            
          } else {
            console.error(`[E2E] Failed to generate magic link:`, magicLinkData);
            throw new Error(`Magic link generation failed: ${magicLinkData.message}`);
          }
        } else {
          console.log(`[E2E] Magic link button not found, checking for password login`);
          
          // Try password login if available
          const passwordInput = page.locator('input[type="password"]');
          if (await passwordInput.isVisible()) {
            console.log(`[E2E] Password login available`);
            
            const emailInput = page.locator('input[type="email"]');
            await emailInput.fill('admin@test.com');
            await passwordInput.fill('testpassword');
            
            const loginButton = page.locator('button[type="submit"]');
            await loginButton.click();
            
            // Wait for redirect
            await page.waitForURL('**/admin**', { timeout: 30000 });
            console.log(`[E2E] Password login successful`);
          } else {
            throw new Error('No login method available');
          }
        }
        
        // Save test artifacts
        const testOutput = {
          baseUrl,
          timestamp: new Date().toISOString(),
          requests: requests.map(r => ({
            url: r.url,
            method: r.method
          })),
          responses: responses.map(r => ({
            url: r.url,
            status: r.status,
            statusText: r.statusText,
            hasSetCookie: !!r.headers['set-cookie'],
            setCookieCount: r.headers['set-cookie']?.length || 0
          })),
          cookies: await context.cookies()
        };
        
        writeFileSync(
          join('tmp', `auth-test-output-${baseUrl.replace(/[^a-zA-Z0-9]/g, '-')}.json`),
          JSON.stringify(testOutput, null, 2)
        );
        
        // Save HAR file
        await context.close();
        console.log(`[E2E] Test completed successfully for ${baseUrl}`);
      });
    });
  }
});
