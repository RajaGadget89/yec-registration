/**
 * Simplified Admin Management Authentication Test
 * Focuses on the specific issue: accessing /admin/management with Super Admin role
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Management Authentication - Simplified Analysis', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Ishikawa Analysis: Environment Configuration', async ({ request }) => {
    console.log('\n🔧 Testing Environment Configuration...');

    // Test 1: Environment variables
    const envResponse = await request.get(`${baseUrl}/api/test/env-debug`);
    const envData = await envResponse.json();
    
    expect(envResponse.status()).toBe(200);
    expect(envData.NEXT_PUBLIC_SUPABASE_URL).toBe('SET');
    expect(envData.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('SET');
    expect(envData.SUPABASE_SERVICE_ROLE_KEY).toBe('SET');
    expect(envData.NEXT_PUBLIC_APP_URL).toBe('SET');
    
    console.log('✅ Environment variables are properly configured');
  });

  test('Ishikawa Analysis: RBAC System', async ({ request }) => {
    console.log('\n👥 Testing RBAC System...');

    const rbacResponse = await request.get(`${baseUrl}/api/test/rbac-debug?email=${adminEmail}`);
    const rbacData = await rbacResponse.json();
    
    expect(rbacResponse.status()).toBe(200);
    expect(rbacData.roles).toContain('super_admin');
    expect(rbacData.superAdmins).toContain(adminEmail);
    
    console.log('✅ User has super_admin role in RBAC system');
    console.log(`   Roles: ${rbacData.roles.join(', ')}`);
  });

  test('Ishikawa Analysis: Authentication Flow', async ({ request }) => {
    console.log('\n🔐 Testing Authentication Flow...');

    // Test magic link generation
    const magicLinkResponse = await request.get(`${baseUrl}/api/test/magic-link?email=${adminEmail}`);
    const magicLinkData = await magicLinkResponse.json();
    
    expect(magicLinkResponse.status()).toBe(200);
    expect(magicLinkData.ok).toBe(true);
    expect(magicLinkData.actionLink).toBeDefined();
    
    console.log('✅ Magic link can be generated');
    console.log(`   Magic link: ${magicLinkData.actionLink}`);
  });

  test('Ishikawa Analysis: Middleware Protection', async ({ request }) => {
    console.log('\n🛡️ Testing Middleware Protection...');

    // Test without authentication
    const noAuthResponse = await request.get(`${baseUrl}/admin/management`);
    
    expect(noAuthResponse.status()).toBe(307);
    const location = noAuthResponse.headers()['location'];
    expect(location).toContain('/admin/login');
    
    console.log('✅ Middleware correctly redirects unauthenticated users');
    console.log(`   Redirect location: ${location}`);
  });

  test('Ishikawa Analysis: Session Management', async ({ request }) => {
    console.log('\n🍪 Testing Session Management...');

    // Test admin/me endpoint without authentication
    const meResponse = await request.get(`${baseUrl}/api/admin/me`);
    
    expect(meResponse.status()).toBe(401);
    
    console.log('✅ Admin/me endpoint correctly rejects unauthenticated requests');
  });

  test('Ishikawa Analysis: Database Connectivity', async ({ request }) => {
    console.log('\n🗄️ Testing Database Connectivity...');

    const healthResponse = await request.get(`${baseUrl}/api/test/supabase-health`);
    const healthData = await healthResponse.json();
    
    expect(healthResponse.status()).toBe(200);
    expect(healthData.status).toBe('healthy');
    
    console.log('✅ Supabase connection is healthy');
    console.log(`   Status: ${healthData.status}`);
  });

  test('Ishikawa Analysis: Application Health', async ({ request }) => {
    console.log('\n🌐 Testing Application Health...');

    const healthResponse = await request.get(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    
    expect(healthResponse.status()).toBe(200);
    expect(healthData.status).toBe('healthy');
    
    console.log('✅ Application is responding to health checks');
  });

  test('Root Cause Analysis: Complete Authentication Flow', async ({ page }) => {
    console.log('\n🔍 Root Cause Analysis: Complete Authentication Flow...');

    // Step 1: Navigate to admin management (should redirect to login)
    await page.goto(`${baseUrl}/admin/management`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Should be redirected to login
    expect(currentUrl).toContain('/admin/login');
    
    // Step 2: Check if we can see the login form
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();
    
    console.log('✅ Login page is accessible');
    
    // Step 3: Check if magic link option is available
    const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
    await expect(magicLinkButton).toBeVisible();
    
    console.log('✅ Magic link authentication is available');
    
    // Step 4: Check if email field is pre-filled (if user was previously logged in)
    const emailField = page.locator('input[type="email"]');
    const emailValue = await emailField.inputValue();
    
    if (emailValue) {
      console.log(`   Pre-filled email: ${emailValue}`);
    } else {
      console.log('   No pre-filled email found');
    }
  });

  test('Root Cause Analysis: Cookie and Session State', async ({ page }) => {
    console.log('\n🍪 Root Cause Analysis: Cookie and Session State...');

    // Navigate to admin page first
    await page.goto(`${baseUrl}/admin`);
    
    // Check current cookies
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name.includes('admin-email') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('supabase')
    );
    
    console.log(`   Found ${authCookies.length} authentication cookies:`);
    authCookies.forEach(cookie => {
      console.log(`     - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });
    
    if (authCookies.length === 0) {
      console.log('❌ No authentication cookies found - this is the root cause!');
    } else {
      console.log('✅ Authentication cookies are present');
    }
    
    // Now try to access management page
    await page.goto(`${baseUrl}/admin/management`);
    
    const finalUrl = page.url();
    console.log(`   Final URL after navigation: ${finalUrl}`);
    
    if (finalUrl.includes('/admin/login')) {
      console.log('❌ Still redirected to login - session not maintained');
    } else {
      console.log('✅ Successfully accessed management page');
    }
  });
});
