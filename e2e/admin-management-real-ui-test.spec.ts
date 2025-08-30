/**
 * Real UI Test for Admin Management Authentication
 * 
 * This test will actually navigate through the UI to see what's happening
 * and identify the exact issue with the authentication flow
 */

import { test, expect } from '@playwright/test';

test.describe('Real UI Test - Admin Management Authentication', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Real UI Flow - From Login to Management', async ({ page }) => {
    console.log('\n🔧 Starting Real UI Test...');

    // Step 1: Set up authentication cookie
    console.log('\n📋 Step 1: Setting up authentication cookie...');
    const setupResponse = await page.request.post(`${baseUrl}/api/test/simple-auth-setup`, {
      data: { email: adminEmail }
    });
    
    expect(setupResponse.status()).toBe(200);
    const setupData = await setupResponse.json();
    console.log('✅ Authentication setup completed');
    console.log('   Instructions:', setupData.instructions);

    // Step 2: Navigate to admin login page
    console.log('\n📋 Step 2: Navigating to admin login page...');
    await page.goto(`${baseUrl}/admin/login`);
    
    let currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check if we're redirected to login with unauthorized
    if (currentUrl.includes('unauthorized=1')) {
      console.log('❌ Still showing unauthorized - authentication not working');
    } else {
      console.log('✅ Login page loaded normally');
    }

    // Step 3: Check what's displayed on the login page
    console.log('\n📋 Step 3: Checking login page content...');
    
    // Check if email field is pre-filled
    const emailField = page.locator('input[type="email"]');
    const emailValue = await emailField.inputValue();
    console.log(`   Email field value: ${emailValue}`);
    
    // Check if magic link button is available
    const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
    const isMagicLinkVisible = await magicLinkButton.isVisible();
    console.log(`   Magic Link button visible: ${isMagicLinkVisible}`);

    // Step 4: Try to send magic link
    console.log('\n📋 Step 4: Attempting to send magic link...');
    
    if (isMagicLinkVisible) {
      // Fill email if not already filled
      if (!emailValue) {
        await emailField.fill(adminEmail);
      }
      
      // Click send magic link
      await magicLinkButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check for success message
      const successMessage = page.locator('text=Magic link sent');
      const errorMessage = page.locator('text=Error');
      
      if (await successMessage.isVisible()) {
        console.log('✅ Magic link sent successfully');
      } else if (await errorMessage.isVisible()) {
        console.log('❌ Error sending magic link');
        const errorText = await errorMessage.textContent();
        console.log(`   Error: ${errorText}`);
      } else {
        console.log('⚠️  No clear success/error message found');
      }
    }

    // Step 5: Check cookies in browser
    console.log('\n📋 Step 5: Checking browser cookies...');
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

    // Step 6: Try to access management page directly
    console.log('\n📋 Step 6: Testing direct access to management page...');
    await page.goto(`${baseUrl}/admin/management`);
    
    currentUrl = page.url();
    console.log(`   Final URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/management')) {
      console.log('✅ Successfully accessed management page!');
      
      // Check page content
      const pageTitle = page.locator('h1');
      if (await pageTitle.isVisible()) {
        const titleText = await pageTitle.textContent();
        console.log(`   Page title: ${titleText}`);
      }
      
    } else if (currentUrl.includes('/admin/login')) {
      console.log('❌ Redirected back to login page');
      
      // Check if it's unauthorized
      if (currentUrl.includes('unauthorized=1')) {
        console.log('❌ Unauthorized access - authentication failed');
      } else {
        console.log('❌ Not authenticated - no session');
      }
      
    } else {
      console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
    }

    // Step 7: Check browser console for errors
    console.log('\n📋 Step 7: Checking browser console for errors...');
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(`ERROR: ${msg.text()}`);
      }
    });
    
    // Wait a moment for any console messages
    await page.waitForTimeout(1000);
    
    if (consoleMessages.length > 0) {
      console.log('   Console errors found:');
      consoleMessages.forEach(msg => console.log(`     ${msg}`));
    } else {
      console.log('   No console errors found');
    }
  });

  test('Check API Endpoints with Real Browser Context', async ({ page, request }) => {
    console.log('\n🔧 Testing API endpoints with real browser context...');

    // Set up authentication in browser context
    const setupResponse = await page.request.post(`${baseUrl}/api/test/simple-auth-setup`, {
      data: { email: adminEmail }
    });
    expect(setupResponse.status()).toBe(200);

    // Test admin/me endpoint
    console.log('\n📋 Testing /api/admin/me endpoint...');
    const meResponse = await page.request.get(`${baseUrl}/api/admin/me`);
    
    console.log(`   Status: ${meResponse.status()}`);
    if (meResponse.status() === 200) {
      const meData = await meResponse.json();
      console.log('   Response data:');
      console.log(`     Email: ${meData.email}`);
      console.log(`     Roles: ${meData.roles?.join(', ')}`);
      console.log(`     Build ID: ${meData.envBuildId}`);
      
      // Check what's missing for getCurrentUser()
      console.log('\n   Analysis for getCurrentUser():');
      console.log(`     ❌ Missing: id`);
      console.log(`     ❌ Missing: role (single string)`);
      console.log(`     ❌ Missing: is_active`);
      console.log(`     ❌ Missing: created_at`);
      console.log(`     ❌ Missing: last_login_at`);
    } else {
      console.log('   Failed to get user data');
    }

    // Test what getCurrentUser() would return
    console.log('\n📋 Testing what getCurrentUser() would return...');
    
    // Navigate to a page that uses getCurrentUser()
    await page.goto(`${baseUrl}/admin/management`);
    
    // Check if we get redirected
    const currentUrl = page.url();
    console.log(`   Management page URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ getCurrentUser() returned null - user not authenticated');
    } else if (currentUrl.includes('/admin/management')) {
      console.log('✅ getCurrentUser() returned valid user - authentication working');
    }
  });

  test('Debug Authentication Flow Step by Step', async ({ page }) => {
    console.log('\n🔧 Debugging authentication flow step by step...');

    // Step 1: Check initial state
    console.log('\n📋 Step 1: Initial state check...');
    await page.goto(`${baseUrl}/admin/login`);
    console.log(`   Login page URL: ${page.url()}`);

    // Step 2: Set up authentication
    console.log('\n📋 Step 2: Setting up authentication...');
    const setupResponse = await page.request.post(`${baseUrl}/api/test/simple-auth-setup`, {
      data: { email: adminEmail }
    });
    expect(setupResponse.status()).toBe(200);

    // Step 3: Check cookies after setup
    console.log('\n📋 Step 3: Checking cookies after setup...');
    const cookies = await page.context().cookies();
    const adminEmailCookie = cookies.find(c => c.name === 'admin-email');
    console.log(`   admin-email cookie: ${adminEmailCookie ? 'SET' : 'NOT SET'}`);
    if (adminEmailCookie) {
      console.log(`   admin-email value: ${adminEmailCookie.value}`);
    }

    // Step 4: Refresh page and check state
    console.log('\n📋 Step 4: Refreshing page to check state...');
    await page.reload();
    console.log(`   URL after refresh: ${page.url()}`);

    // Step 5: Try to access management page
    console.log('\n📋 Step 5: Trying to access management page...');
    await page.goto(`${baseUrl}/admin/management`);
    console.log(`   Management page URL: ${page.url()}`);

    // Step 6: Check page content if we got there
    if (page.url().includes('/admin/management')) {
      console.log('✅ Successfully accessed management page');
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Check for specific content
      const hasContent = await page.locator('body').textContent();
      console.log(`   Page has content: ${hasContent ? 'YES' : 'NO'}`);
      
      if (hasContent) {
        const contentPreview = hasContent.substring(0, 200);
        console.log(`   Content preview: ${contentPreview}...`);
      }
    } else {
      console.log('❌ Failed to access management page');
      console.log(`   Redirected to: ${page.url()}`);
    }
  });
});
