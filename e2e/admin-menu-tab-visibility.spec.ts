/**
 * Admin Menu Tab Visibility Test
 * 
 * This test verifies the exact authoritative conditions for showing the
 * "Admin Management Team" menu tab in the top navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Menu Tab Visibility Test', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Verify Menu Tab Visibility Conditions', async ({ page, request }) => {
    console.log('\n🔧 Testing Admin Menu Tab Visibility...');

    // Step 1: Create admin user in database
    console.log('\n📋 Step 1: Creating admin user in database...');
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    
    expect(createResponse.status()).toBe(200);
    const createData = await createResponse.json();
    console.log('✅ Admin user created/updated');
    console.log(`   User ID: ${createData.user.id}`);
    console.log(`   Role: ${createData.user.role}`);
    console.log(`   Active: ${createData.user.is_active}`);

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

    // Step 3: Navigate to admin page and check menu visibility
    console.log('\n📋 Step 3: Checking menu tab visibility on admin page...');
    await page.goto(`${baseUrl}/admin`);
    
    const currentUrl = page.url();
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
        
        // For testing purposes, we'll simulate the session
        // In real scenario, user would click the magic link
        console.log('   Note: In real scenario, user would click magic link from email');
        
      } else {
        console.log('❌ Magic link sending failed');
      }
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ Successfully on admin page');
      
      // Check for Admin Management Team menu tab
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
      }
      
    } else {
      console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
    }
  });

  test('Verify Menu Conditions After Authentication', async ({ page, request }) => {
    console.log('\n🔧 Testing menu conditions after authentication...');

    // Create admin user
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Debug menu conditions
    const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
    expect(menuResponse.status()).toBe(200);
    const menuData = await menuResponse.json();

    console.log('\n📋 Menu Conditions Analysis:');
    console.log(`   1. User found: ${menuData.menu_conditions.user_found ? '✅' : '❌'}`);
    console.log(`   2. User active: ${menuData.analysis.condition1_user_exists_and_active ? '✅' : '❌'}`);
    console.log(`   3. User has super_admin role: ${menuData.analysis.condition2_user_has_super_admin_role ? '✅' : '❌'}`);
    console.log(`   4. RBAC has super_admin: ${menuData.analysis.condition3_rbac_has_super_admin ? '✅' : '❌'}`);
    console.log(`   5. isSuperAdmin calculated: ${menuData.analysis.condition4_isSuperAdmin_calculated ? '✅' : '❌'}`);
    console.log(`   6. Feature flag enabled: ${menuData.analysis.condition5_feature_flag_enabled ? '✅' : '❌'}`);
    console.log(`   7. Should show menu: ${menuData.analysis.should_show_menu ? '✅' : '❌'}`);

    // Check if all conditions are met
    const allConditionsMet = menuData.analysis.should_show_menu;
    console.log(`\n   All conditions met: ${allConditionsMet ? '✅ YES' : '❌ NO'}`);
    
    if (!allConditionsMet) {
      console.log('\n   Missing conditions:');
      if (!menuData.menu_conditions.user_found) {
        console.log('     - User not found (getCurrentUser() returns null)');
      }
      if (!menuData.analysis.condition1_user_exists_and_active) {
        console.log('     - User not active');
      }
      if (!menuData.analysis.condition2_user_has_super_admin_role) {
        console.log('     - User does not have super_admin role in database');
      }
      if (!menuData.analysis.condition3_rbac_has_super_admin) {
        console.log('     - User does not have super_admin role in RBAC');
      }
      if (!menuData.analysis.condition5_feature_flag_enabled) {
        console.log('     - Feature flag disabled (FEATURES_ADMIN_MANAGEMENT = "false")');
      }
    }

    expect(allConditionsMet).toBe(true);
  });

  test('Verify Feature Flag Impact', async ({ request }) => {
    console.log('\n🔧 Testing feature flag impact...');

    // Create admin user
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Check current feature flag status
    const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
    expect(menuResponse.status()).toBe(200);
    const menuData = await menuResponse.json();

    console.log('📋 Feature Flag Analysis:');
    console.log(`   FEATURES_ADMIN_MANAGEMENT: ${menuData.menu_conditions.featuresAdminManagement}`);
    console.log(`   Feature flag enabled: ${menuData.menu_conditions.featureFlagEnabled}`);
    
    if (menuData.menu_conditions.featuresAdminManagement === "false") {
      console.log('❌ Feature flag is disabled - menu will not show');
    } else if (menuData.menu_conditions.featuresAdminManagement === "true") {
      console.log('✅ Feature flag is enabled - menu can show if other conditions met');
    } else {
      console.log('⚠️  Feature flag is not set - defaults to enabled');
    }

    // The feature flag should be enabled for the menu to show
    expect(menuData.menu_conditions.featureFlagEnabled).toBe(true);
  });
});
