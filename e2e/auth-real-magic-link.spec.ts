/**
 * Real Magic Link Authentication Test
 * 
 * This test will use a real magic link to test the actual authentication flow
 */

import { test, expect } from '@playwright/test';

test.describe('Real Magic Link Authentication', () => {
  test('Test with real magic link authentication', async ({ page, context }) => {
    console.log('\n🔍 TESTING WITH REAL MAGIC LINK');
    console.log('================================');

    // Enable detailed logging
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Step 1: Navigate to admin login page
    console.log('\n📝 Step 1: Navigate to admin login page');
    await page.goto('http://localhost:8080/admin/login');
    
    const initialUrl = page.url();
    console.log(`[PAGE] Initial URL: ${initialUrl}`);

    // Step 2: Fill email and send magic link
    console.log('\n📝 Step 2: Send real magic link');
    
    await page.fill('input[type="email"]', 'raja.gadgets89@gmail.com');
    console.log(`[ACTION] Filled email field`);
    
    await page.click('button:has-text("Send Magic Link")');
    console.log(`[ACTION] Clicked magic link button`);
    
    // Wait for magic link response
    await page.waitForTimeout(3000);
    
    // Check for success message
    const successMessage = await page.locator('text=Magic link sent').count();
    console.log(`[DOM] Success message visible: ${successMessage > 0}`);

    // Step 3: Check if we can find the magic link in the email
    console.log('\n📝 Step 3: Check for magic link in email');
    
    // For now, let's check what happens when we navigate to a callback URL
    // In a real scenario, the user would click the magic link from their email
    
    // Let's try to simulate what happens when a real magic link is clicked
    // First, let's check if there are any real tokens in the current session
    
    // Step 4: Check current cookies
    console.log('\n📝 Step 4: Check current cookies');
    const cookies = await context.cookies();
    console.log(`[COOKIES] Total cookies: ${cookies.length}`);
    
    cookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        console.log(`[COOKIE] ${cookie.name}: ${cookie.value.substring(0, 100)}...`);
      }
    });

    // Step 5: Try to access admin dashboard to see current state
    console.log('\n📝 Step 5: Try to access admin dashboard');
    
    await page.goto('http://localhost:8080/admin');
    await page.waitForTimeout(2000);
    
    const dashboardUrl = page.url();
    console.log(`[PAGE] Dashboard URL: ${dashboardUrl}`);
    
    // Check if redirected back to login
    const redirectedToLogin = dashboardUrl.includes('/admin/login');
    console.log(`[DOM] Redirected back to login: ${redirectedToLogin}`);

    // Step 6: Check for authentication status indicators
    console.log('\n📝 Step 6: Check authentication status');
    
    const notAuthenticated = await page.locator('text=Not Authenticated').count();
    console.log(`[DOM] "Not Authenticated" indicators: ${notAuthenticated}`);
    
    const loginForm = await page.locator('input[type="email"]').count();
    console.log(`[DOM] Login form visible: ${loginForm > 0}`);

    // Step 7: Check API calls
    console.log('\n📝 Step 7: Check API calls');
    
    // Listen for API calls
    const apiCalls: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/admin/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // Wait for any API calls
    await page.waitForTimeout(3000);
    
    console.log(`[API] API calls made:`, apiCalls);

    // Step 8: Take screenshot
    console.log('\n📝 Step 8: Take screenshot');
    await page.screenshot({ path: 'playwright-report/real-magic-link-test.png', fullPage: true });
    console.log(`[SCREENSHOT] Saved to playwright-report/real-magic-link-test.png`);

    console.log('\n🎯 REAL MAGIC LINK TEST COMPLETE');
    console.log('=================================');
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`- Initial URL: ${initialUrl}`);
    console.log(`- Dashboard URL: ${dashboardUrl}`);
    console.log(`- Redirected to login: ${redirectedToLogin}`);
    console.log(`- Not authenticated indicators: ${notAuthenticated}`);
    console.log(`- Login form visible: ${loginForm > 0}`);
    console.log(`- API calls: ${apiCalls.length}`);
    
    // This test is for diagnosis, so we don't assert anything
  });

  test('Test admin API endpoints with current session', async ({ page }) => {
    console.log('\n🔍 TESTING ADMIN API ENDPOINTS WITH CURRENT SESSION');
    console.log('==================================================');

    // Navigate to admin page first to establish any session
    await page.goto('http://localhost:8080/admin');
    await page.waitForTimeout(2000);

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
