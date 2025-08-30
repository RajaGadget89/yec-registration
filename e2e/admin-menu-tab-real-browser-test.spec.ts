/**
 * Real Browser UI Test for Admin Menu Tab Visibility
 * 
 * This test will actually navigate through the real browser UI
 * to see what's happening with the missing "Admin Management Team" menu tab
 */

import { test, expect } from '@playwright/test';

test.describe('Real Browser UI Test - Admin Menu Tab Visibility', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Real Browser Navigation - Check Menu Tab in Actual UI', async ({ page, request }) => {
    console.log('\n🔧 Starting Real Browser UI Test...');

    // Step 1: Set up authentication via API
    console.log('\n📋 Step 1: Setting up authentication via API...');
    const setupResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    
    expect(setupResponse.status()).toBe(200);
    const setupData = await setupResponse.json();
    console.log('✅ Admin user created/updated');
    console.log(`   User ID: ${setupData.user.id}`);
    console.log(`   Role: ${setupData.user.role}`);
    console.log(`   Active: ${setupData.user.is_active}`);

    // Step 2: Navigate to admin page in real browser
    console.log('\n📋 Step 2: Navigating to admin page in real browser...');
    await page.goto(`${baseUrl}/admin`);
    
    let currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Redirected to login - need to complete authentication in browser');
      
      // Step 3: Complete authentication in real browser
      console.log('\n📋 Step 3: Completing authentication in real browser...');
      
      // Navigate to login page
      await page.goto(`${baseUrl}/admin/login`);
      
      // Fill email in real browser
      const emailField = page.locator('input[type="email"]');
      await emailField.fill(adminEmail);
      
      // Click send magic link in real browser
      const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
      await magicLinkButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Check for success message in real browser
      const successMessage = page.locator('text=Magic link sent');
      if (await successMessage.isVisible()) {
        console.log('✅ Magic link sent successfully in browser');
        console.log('   Please check email and click magic link to continue...');
        
        // Wait for user to complete magic link
        console.log('   Waiting for magic link to be processed...');
        console.log('   After clicking magic link, navigate to: http://localhost:8080/admin');
        
        // For now, we'll wait and then check again
        await page.waitForTimeout(5000);
        
      } else {
        console.log('❌ Magic link sending failed in browser');
      }
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ Successfully on admin page in browser');
      
      // Step 4: Check for Admin Management Team menu tab in real browser
      console.log('\n📋 Step 4: Checking for Admin Management Team menu tab in real browser...');
      
      // Wait for page to load completely
      await page.waitForTimeout(3000);
      
      // Look for the menu tab in the navigation in real browser
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible in browser: ${isMenuTabVisible}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible in browser!');
        
        // Verify the tab links to the correct page
        const href = await menuTab.getAttribute('href');
        console.log(`   Menu tab href: ${href}`);
        expect(href).toBe('/admin/management');
        
        // Test clicking the menu tab in real browser
        console.log('\n📋 Step 5: Testing menu tab functionality in real browser...');
        await menuTab.click();
        
        await page.waitForTimeout(2000);
        const newUrl = page.url();
        console.log(`   URL after clicking menu tab: ${newUrl}`);
        
        if (newUrl.includes('/admin/management')) {
          console.log('✅ SUCCESS: Menu tab navigation works in browser!');
        } else {
          console.log('❌ Menu tab navigation failed in browser');
        }
        
      } else {
        console.log('❌ FAILED: Menu tab is not visible in browser');
        
        // Debug what's visible in real browser
        console.log('\n📋 Step 4a: Analyzing visible menu items in real browser...');
        const visibleMenuItems = await page.locator('nav a').allTextContents();
        console.log('   Visible menu items in browser:');
        visibleMenuItems.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.trim()}`);
        });
        
        // Check if user info shows Super Admin in real browser
        const superAdminBadge = page.locator('text=Super Admin');
        const hasSuperAdminBadge = await superAdminBadge.isVisible();
        console.log(`   Super Admin badge visible in browser: ${hasSuperAdminBadge}`);
        
        // Check user email in real browser
        const userEmail = page.locator(`text=${adminEmail}`);
        const hasUserEmail = await userEmail.isVisible();
        console.log(`   User email visible in browser: ${hasUserEmail}`);
        
        // Check if we're on the right page in real browser
        const pageTitle = page.locator('h1');
        if (await pageTitle.isVisible()) {
          const titleText = await pageTitle.textContent();
          console.log(`   Page title in browser: ${titleText}`);
        }
        
        // Take a screenshot for debugging
        console.log('\n📋 Step 4b: Taking screenshot for debugging...');
        await page.screenshot({ path: 'test-results/admin-menu-tab-real-browser-debug.png', fullPage: true });
        console.log('   Screenshot saved to: test-results/admin-menu-tab-real-browser-debug.png');
        
        // Check browser console for errors
        console.log('\n📋 Step 4c: Checking browser console for errors...');
        const consoleMessages = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleMessages.push(`ERROR: ${msg.text()}`);
          }
        });
        
        // Wait a moment for any console messages
        await page.waitForTimeout(1000);
        
        if (consoleMessages.length > 0) {
          console.log('   Browser console errors found:');
          consoleMessages.forEach(msg => console.log(`     ${msg}`));
        } else {
          console.log('   No browser console errors found');
        }
      }
      
    } else {
      console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
    }
  });

  test('Real Browser - Check Current State After Authentication', async ({ page, request }) => {
    console.log('\n🔧 Real Browser Test - Checking current state after authentication...');

    // Set up authentication
    const setupResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(setupResponse.status()).toBe(200);

    // Navigate to admin page in real browser
    console.log('\n📋 Navigating to admin page in real browser...');
    await page.goto(`${baseUrl}/admin`);
    
    const currentUrl = page.url();
    console.log(`   Current URL in browser: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Still on login page in browser - authentication needed');
      console.log('\n📋 Instructions for manual authentication in browser:');
      console.log('   1. Navigate to: http://localhost:8080/admin/login');
      console.log('   2. Enter email: raja.gadgets89@gmail.com');
      console.log('   3. Click "Send Magic Link"');
      console.log('   4. Check email for magic link');
      console.log('   5. Click the magic link');
      console.log('   6. Navigate to: http://localhost:8080/admin');
      console.log('   7. Check if "Admin Management Team" tab is visible in browser');
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ On admin page in browser - checking menu tab...');
      
      // Wait for page to load in real browser
      await page.waitForTimeout(3000);
      
      // Check for Admin Management Team menu tab in real browser
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible in browser: ${isMenuTabVisible}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible in browser!');
        
        // Test clicking the menu tab in real browser
        await menuTab.click();
        await page.waitForTimeout(2000);
        
        const newUrl = page.url();
        console.log(`   URL after clicking menu tab: ${newUrl}`);
        
        if (newUrl.includes('/admin/management')) {
          console.log('✅ SUCCESS: Menu tab navigation works in browser!');
        } else {
          console.log('❌ Menu tab navigation failed in browser');
        }
        
      } else {
        console.log('❌ FAILED: Menu tab is not visible in browser');
        
        // Debug what's visible in real browser
        const visibleMenuItems = await page.locator('nav a').allTextContents();
        console.log('   Visible menu items in browser:');
        visibleMenuItems.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.trim()}`);
        });
        
        // Check user info in real browser
        const superAdminBadge = page.locator('text=Super Admin');
        const hasSuperAdminBadge = await superAdminBadge.isVisible();
        console.log(`   Super Admin badge visible in browser: ${hasSuperAdminBadge}`);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/admin-menu-tab-real-browser-current.png', fullPage: true });
        console.log('   Screenshot saved to: test-results/admin-menu-tab-real-browser-current.png');
      }
    }
  });

  test('Real Browser - Debug Menu Tab Step by Step', async ({ page, request }) => {
    console.log('\n🔧 Real Browser Test - Debugging menu tab step by step...');

    // Create admin user
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Navigate to admin page in real browser
    console.log('\n📋 Navigating to admin page in real browser...');
    await page.goto(`${baseUrl}/admin`);
    
    const currentUrl = page.url();
    console.log(`   Current URL in browser: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Redirected to login in browser - authentication needed');
      
      // Complete authentication in real browser
      console.log('\n📋 Completing authentication in real browser...');
      await page.goto(`${baseUrl}/admin/login`);
      
      // Fill email in real browser
      const emailField = page.locator('input[type="email"]');
      await emailField.fill(adminEmail);
      
      // Click send magic link in real browser
      const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
      await magicLinkButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      console.log('✅ Magic link sent in browser');
      console.log('   Please check email and click magic link');
      console.log('   Then run this test again to check menu tab visibility in browser');
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ On admin page in browser - checking menu tab...');
      
      // Wait for page to load in real browser
      await page.waitForTimeout(3000);
      
      // Check for Admin Management Team menu tab in real browser
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible in browser: ${isMenuTabVisible}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible in browser!');
      } else {
        console.log('❌ FAILED: Menu tab is not visible in browser');
        
        // Debug what's visible in real browser
        const visibleMenuItems = await page.locator('nav a').allTextContents();
        console.log('   Visible menu items in browser:');
        visibleMenuItems.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.trim()}`);
        });
        
        // Check user info in real browser
        const superAdminBadge = page.locator('text=Super Admin');
        const hasSuperAdminBadge = await superAdminBadge.isVisible();
        console.log(`   Super Admin badge visible in browser: ${hasSuperAdminBadge}`);
        
        // Check user email in real browser
        const userEmail = page.locator(`text=${adminEmail}`);
        const hasUserEmail = await userEmail.isVisible();
        console.log(`   User email visible in browser: ${hasUserEmail}`);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/admin-menu-tab-real-browser-debug-step.png', fullPage: true });
        console.log('   Screenshot saved to: test-results/admin-menu-tab-real-browser-debug-step.png');
      }
    }
  });
});
