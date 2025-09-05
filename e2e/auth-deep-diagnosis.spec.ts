/**
 * Deep Authentication Diagnosis E2E Test
 * 
 * This test will capture the real authentication flow and identify
 * the actual issues preventing proper authentication.
 */

import { test, expect } from '@playwright/test';

test.describe('Deep Authentication Diagnosis', () => {
  test('Capture complete authentication flow with detailed logging', async ({ page, context }) => {
    // Enable detailed logging
    await page.route('**/*', async (route) => {
      const request = route.request();
      const response = await route.fetch();
      
      console.log(`[NETWORK] ${request.method()} ${request.url()} - Status: ${response.status()}`);
      
      if (request.url().includes('/api/admin/')) {
        console.log(`[API] ${request.method()} ${request.url()}`);
        console.log(`[API] Headers:`, request.headers());
        console.log(`[API] Response Status: ${response.status()}`);
        
        try {
          const responseBody = await response.text();
          console.log(`[API] Response Body:`, responseBody);
        } catch (e) {
          console.log(`[API] Could not read response body:`, e);
        }
      }
      
      await route.fulfill({ response });
    });

    // Listen to console messages
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // Listen to page errors
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`[REQUEST] ${request.method()} ${request.url()}`);
        console.log(`[REQUEST] Headers:`, request.headers());
      }
    });

    // Listen to network responses
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
        console.log(`[RESPONSE] Headers:`, response.headers());
      }
    });

    console.log('\n🔍 STARTING DEEP AUTHENTICATION DIAGNOSIS');
    console.log('==========================================');

    // Step 1: Navigate to admin login page
    console.log('\n📝 Step 1: Navigate to admin login page');
    await page.goto('http://localhost:8080/admin/login');
    
    // Capture initial page state
    const initialTitle = await page.title();
    const initialUrl = page.url();
    console.log(`[PAGE] Initial title: ${initialTitle}`);
    console.log(`[PAGE] Initial URL: ${initialUrl}`);
    
    // Check if we're redirected
    if (initialUrl.includes('/admin/login')) {
      console.log(`[PAGE] ✅ On login page as expected`);
    } else {
      console.log(`[PAGE] ❌ Unexpected redirect to: ${initialUrl}`);
    }

    // Step 2: Check initial DOM state
    console.log('\n📝 Step 2: Check initial DOM state');
    
    // Check for authentication status indicators
    const authStatus = await page.locator('text=Not Authenticated').count();
    console.log(`[DOM] "Not Authenticated" indicators: ${authStatus}`);
    
    // Check for login form elements
    const emailField = await page.locator('input[type="email"]').count();
    const passwordField = await page.locator('input[type="password"]').count();
    const magicLinkButton = await page.locator('button:has-text("Send Magic Link")').count();
    
    console.log(`[DOM] Email field: ${emailField}`);
    console.log(`[DOM] Password field: ${passwordField}`);
    console.log(`[DOM] Magic link button: ${magicLinkButton}`);

    // Step 3: Check initial cookies
    console.log('\n📝 Step 3: Check initial cookies');
    const cookies = await context.cookies();
    console.log(`[COOKIES] Total cookies: ${cookies.length}`);
    
    cookies.forEach(cookie => {
      console.log(`[COOKIE] ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });

    // Step 4: Check initial network requests
    console.log('\n📝 Step 4: Check initial network requests');
    
    // Wait for any initial API calls
    await page.waitForTimeout(2000);
    
    // Check if /api/admin/me was called
    const adminMeCalls = await page.evaluate(() => {
      return window.performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('/api/admin/me'))
        .map((entry: any) => ({
          url: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize
        }));
    });
    
    console.log(`[NETWORK] /api/admin/me calls:`, adminMeCalls);

    // Step 5: Fill email and send magic link
    console.log('\n📝 Step 5: Send magic link');
    
    // Fill email field
    await page.fill('input[type="email"]', 'raja.gadgets89@gmail.com');
    console.log(`[ACTION] Filled email field`);
    
    // Click magic link button
    await page.click('button:has-text("Send Magic Link")');
    console.log(`[ACTION] Clicked magic link button`);
    
    // Wait for magic link response
    await page.waitForTimeout(3000);
    
    // Check for success message
    const successMessage = await page.locator('text=Magic link sent').count();
    console.log(`[DOM] Success message visible: ${successMessage > 0}`);

    // Step 6: Check cookies after magic link
    console.log('\n📝 Step 6: Check cookies after magic link');
    const cookiesAfterMagicLink = await context.cookies();
    console.log(`[COOKIES] Total cookies after magic link: ${cookiesAfterMagicLink.length}`);
    
    cookiesAfterMagicLink.forEach(cookie => {
      console.log(`[COOKIE] ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });

    // Step 7: Simulate magic link callback (if we can)
    console.log('\n📝 Step 7: Check if we can simulate callback');
    
    // Try to navigate to callback URL with mock tokens
    const callbackUrl = 'http://localhost:8080/auth/callback?next=%2Fadmin#access_token=mock_token&refresh_token=mock_refresh&token_type=bearer&expires_in=3600';
    
    console.log(`[ACTION] Navigating to callback URL: ${callbackUrl}`);
    await page.goto(callbackUrl);
    
    // Wait for callback processing
    await page.waitForTimeout(5000);
    
    // Check final URL
    const finalUrl = page.url();
    console.log(`[PAGE] Final URL after callback: ${finalUrl}`);

    // Step 8: Check final cookies
    console.log('\n📝 Step 8: Check final cookies');
    const finalCookies = await context.cookies();
    console.log(`[COOKIES] Total final cookies: ${finalCookies.length}`);
    
    finalCookies.forEach(cookie => {
      console.log(`[COOKIE] ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });

    // Step 9: Check final DOM state
    console.log('\n📝 Step 9: Check final DOM state');
    
    // Check if still on login page
    const stillOnLogin = finalUrl.includes('/admin/login');
    console.log(`[DOM] Still on login page: ${stillOnLogin}`);
    
    // Check for authentication status
    const finalAuthStatus = await page.locator('text=Not Authenticated').count();
    console.log(`[DOM] Final "Not Authenticated" indicators: ${finalAuthStatus}`);

    // Step 10: Try to access admin dashboard directly
    console.log('\n📝 Step 10: Try to access admin dashboard directly');
    
    await page.goto('http://localhost:8080/admin');
    await page.waitForTimeout(3000);
    
    const dashboardUrl = page.url();
    console.log(`[PAGE] Dashboard URL: ${dashboardUrl}`);
    
    // Check if redirected back to login
    const redirectedToLogin = dashboardUrl.includes('/admin/login');
    console.log(`[DOM] Redirected back to login: ${redirectedToLogin}`);

    // Step 11: Check all network requests made during test
    console.log('\n📝 Step 11: Summary of all network requests');
    
    const allRequests = await page.evaluate(() => {
      return window.performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('/api/'))
        .map((entry: any) => ({
          url: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize,
          responseStart: entry.responseStart,
          responseEnd: entry.responseEnd
        }));
    });
    
    console.log(`[NETWORK] All API requests:`, allRequests);

    // Step 12: Check for any error messages in console
    console.log('\n📝 Step 12: Check for error messages');
    
    const consoleMessages = await page.evaluate(() => {
      return (window as any).consoleMessages || [];
    });
    
    console.log(`[CONSOLE] Console messages:`, consoleMessages);

    // Step 13: Take screenshot for visual analysis
    console.log('\n📝 Step 13: Take final screenshot');
    await page.screenshot({ path: 'playwright-report/auth-diagnosis-final.png', fullPage: true });
    console.log(`[SCREENSHOT] Saved to playwright-report/auth-diagnosis-final.png`);

    console.log('\n🎯 AUTHENTICATION DIAGNOSIS COMPLETE');
    console.log('=====================================');
    
    // Summary
    console.log('\n📊 DIAGNOSIS SUMMARY:');
    console.log(`- Initial URL: ${initialUrl}`);
    console.log(`- Final URL: ${finalUrl}`);
    console.log(`- Still on login: ${stillOnLogin}`);
    console.log(`- Cookies count: ${cookies.length} → ${finalCookies.length}`);
    console.log(`- API requests: ${allRequests.length}`);
    console.log(`- Auth status indicators: ${authStatus} → ${finalAuthStatus}`);
    
    // This test is for diagnosis, so we don't assert anything
    // We just want to capture all the information
  });

  test('Test admin API endpoints directly', async ({ page, context }) => {
    console.log('\n🔍 TESTING ADMIN API ENDPOINTS DIRECTLY');
    console.log('========================================');

    // Test /api/admin/me endpoint
    console.log('\n📝 Testing /api/admin/me endpoint');
    
    const response = await page.request.get('http://localhost:8080/api/admin/me');
    console.log(`[API] /api/admin/me status: ${response.status()}`);
    console.log(`[API] /api/admin/me headers:`, response.headers());
    
    try {
      const body = await response.text();
      console.log(`[API] /api/admin/me body:`, body);
    } catch (e) {
      console.log(`[API] /api/admin/me body error:`, e);
    }

    // Test email outbox endpoints
    console.log('\n📝 Testing email outbox endpoints');
    
    const emailTrendsResponse = await page.request.get('http://localhost:8080/api/admin/email-outbox-trends');
    console.log(`[API] /api/admin/email-outbox-trends status: ${emailTrendsResponse.status()}`);
    
    try {
      const trendsBody = await emailTrendsResponse.text();
      console.log(`[API] /api/admin/email-outbox-trends body:`, trendsBody);
    } catch (e) {
      console.log(`[API] /api/admin/email-outbox-trends body error:`, e);
    }

    const emailStatsResponse = await page.request.get('http://localhost:8080/api/admin/email-outbox-stats');
    console.log(`[API] /api/admin/email-outbox-stats status: ${emailStatsResponse.status()}`);
    
    try {
      const statsBody = await emailStatsResponse.text();
      console.log(`[API] /api/admin/email-outbox-stats body:`, statsBody);
    } catch (e) {
      console.log(`[API] /api/admin/email-outbox-stats body error:`, e);
    }
  });
});
