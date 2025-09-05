/**
 * Authentication Bypass Test
 * 
 * This test bypasses the magic link flow and directly tests
 * the authentication system with proper session setup
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Bypass Test', () => {
  test('Test authentication with direct session setup', async ({ page, context }) => {
    console.log('\n🔍 TESTING AUTHENTICATION WITH DIRECT SESSION SETUP');
    console.log('==================================================');

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

    // Step 2: Check if we can bypass authentication using environment variables
    console.log('\n📝 Step 2: Check environment-based authentication');
    
    // Try to access admin dashboard directly
    await page.goto('http://localhost:8080/admin');
    await page.waitForTimeout(2000);
    
    const dashboardUrl = page.url();
    console.log(`[PAGE] Dashboard URL: ${dashboardUrl}`);
    
    // Check if redirected back to login
    const redirectedToLogin = dashboardUrl.includes('/admin/login');
    console.log(`[DOM] Redirected back to login: ${redirectedToLogin}`);

    // Step 3: Check middleware behavior
    console.log('\n📝 Step 3: Check middleware behavior');
    
    // Check for middleware headers
    const response = await page.request.get('http://localhost:8080/admin');
    console.log(`[MIDDLEWARE] Response status: ${response.status()}`);
    console.log(`[MIDDLEWARE] Response headers:`, response.headers());
    
    // Check for x-admin-guard header
    const adminGuardHeader = response.headers()['x-admin-guard'];
    console.log(`[MIDDLEWARE] x-admin-guard header: ${adminGuardHeader}`);

    // Step 4: Test API endpoints directly
    console.log('\n📝 Step 4: Test API endpoints directly');
    
    const adminMeResponse = await page.request.get('http://localhost:8080/api/admin/me');
    console.log(`[API] /api/admin/me status: ${adminMeResponse.status()}`);
    console.log(`[API] /api/admin/me headers:`, adminMeResponse.headers());
    
    try {
      const adminMeBody = await adminMeResponse.text();
      console.log(`[API] /api/admin/me body:`, adminMeBody);
    } catch (e) {
      console.log(`[API] /api/admin/me body error:`, e);
    }

    // Step 5: Check if DEV_ADMIN_BYPASS is working
    console.log('\n📝 Step 5: Check DEV_ADMIN_BYPASS functionality');
    
    // Try to access with admin email in headers
    const bypassResponse = await page.request.get('http://localhost:8080/api/admin/me', {
      headers: {
        'x-admin-email': 'raja.gadgets89@gmail.com'
      }
    });
    console.log(`[BYPASS] /api/admin/me with x-admin-email status: ${bypassResponse.status()}`);
    
    try {
      const bypassBody = await bypassResponse.text();
      console.log(`[BYPASS] /api/admin/me with x-admin-email body:`, bypassBody);
    } catch (e) {
      console.log(`[BYPASS] /api/admin/me with x-admin-email body error:`, e);
    }

    // Step 6: Check environment variables
    console.log('\n📝 Step 6: Check environment configuration');
    
    // Try to access a test endpoint that shows environment info
    try {
      const envResponse = await page.request.get('http://localhost:8080/api/test/env-vars');
      console.log(`[ENV] /api/test/env-vars status: ${envResponse.status()}`);
      
      if (envResponse.status() === 200) {
        const envBody = await envResponse.text();
        console.log(`[ENV] /api/test/env-vars body:`, envBody);
      }
    } catch (e) {
      console.log(`[ENV] /api/test/env-vars error:`, e);
    }

    // Step 7: Check cookies and session state
    console.log('\n📝 Step 7: Check cookies and session state');
    
    const cookies = await context.cookies();
    console.log(`[COOKIES] Total cookies: ${cookies.length}`);
    
    cookies.forEach(cookie => {
      console.log(`[COOKIE] ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });

    // Step 8: Take screenshot
    console.log('\n📝 Step 8: Take screenshot');
    await page.screenshot({ path: 'playwright-report/auth-bypass-test.png', fullPage: true });
    console.log(`[SCREENSHOT] Saved to playwright-report/auth-bypass-test.png`);

    console.log('\n🎯 AUTHENTICATION BYPASS TEST COMPLETE');
    console.log('======================================');
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`- Initial URL: ${initialUrl}`);
    console.log(`- Dashboard URL: ${dashboardUrl}`);
    console.log(`- Redirected to login: ${redirectedToLogin}`);
    console.log(`- Middleware guard: ${adminGuardHeader}`);
    console.log(`- Admin/me status: ${adminMeResponse.status()}`);
    console.log(`- Bypass status: ${bypassResponse.status()}`);
    console.log(`- Cookies count: ${cookies.length}`);
    
    // This test is for diagnosis, so we don't assert anything
  });
});
