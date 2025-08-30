/**
 * Real UI Test for Admin Menu Tab Visibility
 * 
 * This test will actually navigate through the UI to see what's happening
 * with the missing "Admin Management Team" menu tab
 */

import { test, expect } from '@playwright/test';

test.describe('Real UI Test - Admin Menu Tab Visibility', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Real UI Flow - Check Menu Tab Visibility', async ({ page, request }) => {
    console.log('\n🔧 Starting Real UI Test for Menu Tab Visibility...');

    // Step 1: Set up authentication
    console.log('\n📋 Step 1: Setting up authentication...');
    const setupResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    
    expect(setupResponse.status()).toBe(200);
    const setupData = await setupResponse.json();
    console.log('✅ Admin user created/updated');
    console.log(`   User ID: ${setupData.user.id}`);
    console.log(`   Role: ${setupData.user.role}`);
    console.log(`   Active: ${setupData.user.is_active}`);

    // Step 2: Debug menu conditions
    console.log('\n📋 Step 2: Debugging menu conditions...');
    const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
    
    expect(menuResponse.status()).toBe(200);
    const menuData = await menuResponse.json();
    console.log('✅ Menu conditions analysis:');
    console.log(`   User found: ${menuData.menu_conditions.user_found}`);
    console.log(`   isSuperAdmin: ${menuData.menu_conditions.isSuperAdmin}`);
    console.log(`   Feature flag enabled: ${menuData.menu_conditions.featureFlagEnabled}`);
    console.log(`   Should show menu: ${menuData.analysis.should_show_menu}`);

    // Step 3: Navigate to admin page
    console.log('\n📋 Step 3: Navigating to admin page...');
    await page.goto(`${baseUrl}/admin`);
    
    let currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Redirected to login - need to complete authentication');
      
      // Complete magic link authentication
      console.log('\n📋 Step 3a: Completing magic link authentication...');
      
      // Navigate to login page
      await page.goto(`${baseUrl}/admin/login`);
      
      // Fill email
      const emailField = page.locator('input[type="email"]');
      await emailField.fill(adminEmail);
      
      // Click send magic link
      const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
      await magicLinkButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check for success message
      const successMessage = page.locator('text=Magic link sent');
      if (await successMessage.isVisible()) {
        console.log('✅ Magic link sent successfully');
        console.log('   Please check email and click magic link to continue...');
        
        // For testing purposes, we'll wait and then check again
        console.log('   Waiting for magic link to be processed...');
        await page.waitForTimeout(5000);
        
      } else {
        console.log('❌ Magic link sending failed');
      }
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ Successfully on admin page');
      
      // Step 4: Check for Admin Management Team menu tab
      console.log('\n📋 Step 4: Checking for Admin Management Team menu tab...');
      
      // Wait for page to load completely
      await page.waitForTimeout(2000);
      
      // Look for the menu tab in the navigation
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible: ${isMenuTabVisible}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible!');
        
        // Verify the tab links to the correct page
        const href = await menuTab.getAttribute('href');
        console.log(`   Menu tab href: ${href}`);
        expect(href).toBe('/admin/management');
        
      } else {
        console.log('❌ FAILED: Menu tab is not visible');
        
        // Check what menu items are visible
        console.log('\n📋 Step 4a: Analyzing visible menu items...');
        const visibleMenuItems = await page.locator('nav a').allTextContents();
        console.log('   Visible menu items:');
        visibleMenuItems.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.trim()}`);
        });
        
        // Check if user info shows Super Admin
        const superAdminBadge = page.locator('text=Super Admin');
        const hasSuperAdminBadge = await superAdminBadge.isVisible();
        console.log(`   Super Admin badge visible: ${hasSuperAdminBadge}`);
        
        // Check user email
        const userEmail = page.locator(`text=${adminEmail}`);
        const hasUserEmail = await userEmail.isVisible();
        console.log(`   User email visible: ${hasUserEmail}`);
        
        // Check if we're on the right page
        const pageTitle = page.locator('h1');
        if (await pageTitle.isVisible()) {
          const titleText = await pageTitle.textContent();
          console.log(`   Page title: ${titleText}`);
        }
        
        // Take a screenshot for debugging
        console.log('\n📋 Step 4b: Taking screenshot for debugging...');
        await page.screenshot({ path: 'test-results/admin-menu-tab-debug.png', fullPage: true });
        console.log('   Screenshot saved to: test-results/admin-menu-tab-debug.png');
      }
      
    } else {
      console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
    }
  });

  test('Verify Menu Tab After Magic Link Authentication', async ({ page, request }) => {
    console.log('\n🔧 Testing menu tab after magic link authentication...');

    // Set up authentication
    const setupResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(setupResponse.status()).toBe(200);

    // Navigate to admin page
    await page.goto(`${baseUrl}/admin`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Still on login page - need to complete authentication');
      
      // Navigate to login page
      await page.goto(`${baseUrl}/admin/login`);
      
      // Fill email
      const emailField = page.locator('input[type="email"]');
      await emailField.fill(adminEmail);
      
      // Click send magic link
      const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
      await magicLinkButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      console.log('✅ Magic link sent');
      console.log('   Please check email and click magic link');
      console.log('   Then navigate to: http://localhost:8080/admin');
      console.log('   And check if "Admin Management Team" tab is visible');
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ On admin page - checking menu tab...');
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Check for Admin Management Team menu tab
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible: ${isMenuTabVisible}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible!');
      } else {
        console.log('❌ FAILED: Menu tab is not visible');
        
        // Debug what's visible
        const visibleMenuItems = await page.locator('nav a').allTextContents();
        console.log('   Visible menu items:');
        visibleMenuItems.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.trim()}`);
        });
        
        // Check user info
        const superAdminBadge = page.locator('text=Super Admin');
        const hasSuperAdminBadge = await superAdminBadge.isVisible();
        console.log(`   Super Admin badge visible: ${hasSuperAdminBadge}`);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/admin-menu-tab-after-auth.png', fullPage: true });
        console.log('   Screenshot saved to: test-results/admin-menu-tab-after-auth.png');
      }
    }
  });

  test('Debug Menu Tab Conditions Step by Step', async ({ page, request }) => {
    console.log('\n🔧 Debugging menu tab conditions step by step...');

    // Step 1: Create admin user
    console.log('\n📋 Step 1: Creating admin user...');
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Step 2: Debug menu conditions
    console.log('\n📋 Step 2: Debugging menu conditions...');
    const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
    expect(menuResponse.status()).toBe(200);
    const menuData = await menuResponse.json();

    console.log('📋 Menu Conditions Analysis:');
    console.log(`   1. User found: ${menuData.menu_conditions.user_found ? '✅' : '❌'}`);
    console.log(`   2. User active: ${menuData.analysis.condition1_user_exists_and_active ? '✅' : '❌'}`);
    console.log(`   3. User has super_admin role: ${menuData.analysis.condition2_user_has_super_admin_role ? '✅' : '❌'}`);
    console.log(`   4. RBAC has super_admin: ${menuData.analysis.condition3_rbac_has_super_admin ? '✅' : '❌'}`);
    console.log(`   5. isSuperAdmin calculated: ${menuData.analysis.condition4_isSuperAdmin_calculated ? '✅' : '❌'}`);
    console.log(`   6. Feature flag enabled: ${menuData.analysis.condition5_feature_flag_enabled ? '✅' : '❌'}`);
    console.log(`   7. Should show menu: ${menuData.analysis.should_show_menu ? '✅' : '❌'}`);

    // Step 3: Navigate to admin page
    console.log('\n📋 Step 3: Navigating to admin page...');
    await page.goto(`${baseUrl}/admin`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Redirected to login - authentication needed');
      
      // Step 4: Complete authentication
      console.log('\n📋 Step 4: Completing authentication...');
      await page.goto(`${baseUrl}/admin/login`);
      
      // Fill email
      const emailField = page.locator('input[type="email"]');
      await emailField.fill(adminEmail);
      
      // Click send magic link
      const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
      await magicLinkButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      console.log('✅ Magic link sent');
      console.log('   Please check email and click magic link');
      console.log('   Then run this test again to check menu tab visibility');
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ On admin page - checking menu tab...');
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Check for Admin Management Team menu tab
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible: ${isMenuTabVisible}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible!');
      } else {
        console.log('❌ FAILED: Menu tab is not visible');
        
        // Debug what's visible
        const visibleMenuItems = await page.locator('nav a').allTextContents();
        console.log('   Visible menu items:');
        visibleMenuItems.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.trim()}`);
        });
        
        // Check user info
        const superAdminBadge = page.locator('text=Super Admin');
        const hasSuperAdminBadge = await superAdminBadge.isVisible();
        console.log(`   Super Admin badge visible: ${hasSuperAdminBadge}`);
        
        // Check user email
        const userEmail = page.locator(`text=${adminEmail}`);
        const hasUserEmail = await userEmail.isVisible();
        console.log(`   User email visible: ${hasUserEmail}`);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/admin-menu-tab-debug-step.png', fullPage: true });
        console.log('   Screenshot saved to: test-results/admin-menu-tab-debug-step.png');
      }
    }
  });
});
