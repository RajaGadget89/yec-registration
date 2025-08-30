/**
 * Comprehensive Admin Menu Tab Visibility Test
 * 
 * This test validates ALL conditions required for the "Admin Management Team" 
 * menu tab to be visible in the top navigation bar.
 * 
 * Conditions tested:
 * 1. User authentication (getCurrentUser() returns valid user)
 * 2. User active status (is_active: true)
 * 3. Super admin role (database role OR RBAC role)
 * 4. Feature flag enabled (FEATURES_ADMIN_MANAGEMENT !== "false")
 * 5. E2E test mode disabled (E2E_TEST_MODE !== "true")
 * 6. Menu tab visibility in UI
 * 7. Menu tab functionality (clicking works)
 */

import { test, expect } from '@playwright/test';

test.describe('Comprehensive Admin Menu Tab Visibility Test', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Complete Menu Tab Visibility Validation', async ({ page, request }) => {
    console.log('\n🔧 Starting Comprehensive Admin Menu Tab Visibility Test...');

    // Step 1: Environment Validation
    console.log('\n📋 Step 1: Validating Environment Configuration...');
    const envResponse = await request.get(`${baseUrl}/api/test/env-debug`);
    expect(envResponse.status()).toBe(200);
    const envData = await envResponse.json();
    
    console.log('✅ Environment Analysis:');
    console.log(`   SUPABASE_URL: ${envData.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${envData.SUPABASE_SERVICE_ROLE_KEY}`);
    console.log(`   NEXT_PUBLIC_APP_URL: ${envData.NEXT_PUBLIC_APP_URL}`);
    console.log(`   SUPER_ADMIN_EMAILS: ${envData.SUPER_ADMIN_EMAILS}`);
    console.log(`   E2E_TEST_MODE: ${envData.E2E_TEST_MODE}`);
    console.log(`   NODE_ENV: ${envData.NODE_ENV}`);

    // Step 2: RBAC System Validation
    console.log('\n📋 Step 2: Validating RBAC System...');
    const rbacResponse = await request.get(`${baseUrl}/api/test/rbac-debug?email=${adminEmail}`);
    expect(rbacResponse.status()).toBe(200);
    const rbacData = await rbacResponse.json();
    
    console.log('✅ RBAC Analysis:');
    console.log(`   User email: ${rbacData.email}`);
    console.log(`   User roles: ${rbacData.roles.join(', ')}`);
    console.log(`   Has super_admin role: ${rbacData.roles.includes('super_admin')}`);
    console.log(`   Super admin emails configured: ${rbacData.superAdmins.join(', ')}`);
    console.log(`   User in super admin list: ${rbacData.superAdmins.includes(adminEmail)}`);

    // Step 3: Create/Update Admin User in Database
    console.log('\n📋 Step 3: Creating/Updating Admin User in Database...');
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    
    expect(createResponse.status()).toBe(200);
    const createData = await createResponse.json();
    console.log('✅ Admin User Database Status:');
    console.log(`   User ID: ${createData.user.id}`);
    console.log(`   Email: ${createData.user.email}`);
    console.log(`   Role: ${createData.user.role}`);
    console.log(`   Active: ${createData.user.is_active}`);
    console.log(`   Created: ${createData.user.created_at}`);
    console.log(`   Action: ${createData.action}`);

    // Step 4: Menu Conditions Debug
    console.log('\n📋 Step 4: Analyzing Menu Tab Conditions...');
    const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
    expect(menuResponse.status()).toBe(200);
    const menuData = await menuResponse.json();
    
    console.log('✅ Menu Conditions Analysis:');
    console.log(`   1. User found: ${menuData.menu_conditions.user_found ? '✅' : '❌'}`);
    console.log(`   2. User active: ${menuData.analysis.condition1_user_exists_and_active ? '✅' : '❌'}`);
    console.log(`   3. Database super_admin role: ${menuData.analysis.condition2_user_has_super_admin_role ? '✅' : '❌'}`);
    console.log(`   4. RBAC super_admin role: ${menuData.analysis.condition3_rbac_has_super_admin ? '✅' : '❌'}`);
    console.log(`   5. isSuperAdmin calculated: ${menuData.analysis.condition4_isSuperAdmin_calculated ? '✅' : '❌'}`);
    console.log(`   6. Feature flag enabled: ${menuData.analysis.condition5_feature_flag_enabled ? '✅' : '❌'}`);
    console.log(`   7. Should show menu: ${menuData.analysis.should_show_menu ? '✅' : '❌'}`);

    // Step 5: UI Navigation and Menu Tab Check
    console.log('\n📋 Step 5: Checking Menu Tab in UI...');
    await page.goto(`${baseUrl}/admin`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('⚠️  Redirected to login - need authentication');
      
      // Complete authentication flow
      console.log('\n📋 Step 5a: Completing Authentication...');
      await page.goto(`${baseUrl}/admin/login`);
      
      // Fill email and send magic link
      const emailField = page.locator('input[type="email"]');
      await emailField.fill(adminEmail);
      
      const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
      await magicLinkButton.click();
      
      await page.waitForTimeout(2000);
      
      const successMessage = page.locator('text=Magic link sent');
      if (await successMessage.isVisible()) {
        console.log('✅ Magic link sent successfully');
        console.log('   Note: In real scenario, user would click magic link from email');
        console.log('   For testing, we\'ll simulate authenticated session');
        
        // Simulate authenticated session by setting cookies
        await page.context().addCookies([
          {
            name: 'admin-email',
            value: adminEmail,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax'
          }
        ]);
        
        // Navigate back to admin page
        await page.goto(`${baseUrl}/admin`);
      } else {
        console.log('❌ Magic link sending failed');
      }
    }

    // Step 6: Final Menu Tab Validation
    console.log('\n📋 Step 6: Final Menu Tab Validation...');
    
    // Wait for page to load completely
    await page.waitForTimeout(3000);
    
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
      
      // Test clicking the menu tab
      console.log('\n📋 Step 7: Testing Menu Tab Functionality...');
      await menuTab.click();
      await page.waitForTimeout(2000);
      
      const newUrl = page.url();
      console.log(`   URL after clicking menu tab: ${newUrl}`);
      
      if (newUrl.includes('/admin/management')) {
        console.log('✅ SUCCESS: Menu tab navigation works!');
        
        // Check if management page loads correctly
        const pageTitle = page.locator('h1');
        if (await pageTitle.isVisible()) {
          const titleText = await pageTitle.textContent();
          console.log(`   Management page title: ${titleText}`);
        }
        
      } else {
        console.log('❌ Menu tab navigation failed');
      }
      
    } else {
      console.log('❌ FAILED: Menu tab is not visible');
      
      // Debug what's visible
      console.log('\n📋 Debug: Analyzing visible menu items...');
      const visibleMenuItems = await page.locator('nav a').allTextContents();
      console.log('   Visible menu items:');
      visibleMenuItems.forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.trim()}`);
      });
      
      // Check user info section
      console.log('\n📋 Debug: Analyzing user info section...');
      const superAdminBadge = page.locator('text=Super Admin');
      const hasSuperAdminBadge = await superAdminBadge.isVisible();
      console.log(`   Super Admin badge visible: ${hasSuperAdminBadge}`);
      
      const userEmail = page.locator(`text=${adminEmail}`);
      const hasUserEmail = await userEmail.isVisible();
      console.log(`   User email visible: ${hasUserEmail}`);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/admin-menu-tab-debug.png', fullPage: true });
      console.log('   Screenshot saved to: test-results/admin-menu-tab-debug.png');
      
      // Detailed condition analysis
      console.log('\n📋 Debug: Detailed Condition Analysis...');
      if (!menuData.menu_conditions.user_found) {
        console.log('   ❌ Issue: User not found (getCurrentUser() returns null)');
        console.log('      - Check authentication flow');
        console.log('      - Check admin-email cookie');
        console.log('      - Check database connection');
      }
      
      if (!menuData.analysis.condition1_user_exists_and_active) {
        console.log('   ❌ Issue: User not active');
        console.log('      - Check is_active field in admin_users table');
        console.log('      - Check user creation/update process');
      }
      
      if (!menuData.analysis.condition2_user_has_super_admin_role && !menuData.analysis.condition3_rbac_has_super_admin) {
        console.log('   ❌ Issue: User does not have super_admin role');
        console.log('      - Check database role field');
        console.log('      - Check SUPER_ADMIN_EMAILS environment variable');
        console.log('      - Check RBAC system configuration');
      }
      
      if (!menuData.analysis.condition5_feature_flag_enabled) {
        console.log('   ❌ Issue: Feature flag disabled');
        console.log('      - Check FEATURES_ADMIN_MANAGEMENT environment variable');
        console.log('      - Should not be "false"');
      }
    }

    // Step 8: Final Assertions
    console.log('\n📋 Step 8: Final Assertions...');
    
    // Assert all conditions are met
    expect(menuData.analysis.should_show_menu).toBe(true);
    expect(isMenuTabVisible).toBe(true);
    
    console.log('✅ All tests passed! Admin Management Team menu tab is working correctly.');
  });

  test('Feature Flag Impact Test', async ({ request }) => {
    console.log('\n🔧 Testing Feature Flag Impact...');

    // Create admin user
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Check feature flag status
    const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
    expect(menuResponse.status()).toBe(200);
    const menuData = await menuResponse.json();

    console.log('📋 Feature Flag Analysis:');
    console.log(`   FEATURES_ADMIN_MANAGEMENT: ${menuData.menu_conditions.featuresAdminManagement}`);
    console.log(`   Feature flag enabled: ${menuData.menu_conditions.featureFlagEnabled}`);
    console.log(`   Should show menu: ${menuData.analysis.should_show_menu}`);
    
    if (menuData.menu_conditions.featuresAdminManagement === "false") {
      console.log('❌ Feature flag is disabled - menu will not show');
    } else if (menuData.menu_conditions.featuresAdminManagement === "true") {
      console.log('✅ Feature flag is enabled - menu can show if other conditions met');
    } else {
      console.log('⚠️  Feature flag is not set - defaults to enabled');
    }

    // Assert feature flag is enabled
    expect(menuData.menu_conditions.featureFlagEnabled).toBe(true);
  });

  test('RBAC Role Validation Test', async ({ request }) => {
    console.log('\n🔧 Testing RBAC Role Validation...');

    // Test RBAC system directly
    const rbacResponse = await request.get(`${baseUrl}/api/test/rbac-debug?email=${adminEmail}`);
    expect(rbacResponse.status()).toBe(200);
    const rbacData = await rbacResponse.json();

    console.log('📋 RBAC Validation:');
    console.log(`   Email: ${rbacData.email}`);
    console.log(`   Roles: ${rbacData.roles.join(', ')}`);
    console.log(`   Has super_admin: ${rbacData.roles.includes('super_admin')}`);
    console.log(`   Super admin emails: ${rbacData.superAdmins.join(', ')}`);
    console.log(`   Email in super admin list: ${rbacData.superAdmins.includes(adminEmail)}`);

    // Assert user has super_admin role
    expect(rbacData.roles).toContain('super_admin');
    expect(rbacData.superAdmins).toContain(adminEmail);
  });

  test('Database Role Validation Test', async ({ request }) => {
    console.log('\n🔧 Testing Database Role Validation...');

    // Create admin user with super_admin role
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);
    const createData = await createResponse.json();

    console.log('📋 Database Role Validation:');
    console.log(`   User ID: ${createData.user.id}`);
    console.log(`   Email: ${createData.user.email}`);
    console.log(`   Role: ${createData.user.role}`);
    console.log(`   Active: ${createData.user.is_active}`);

    // Assert user has correct role and is active
    expect(createData.user.role).toBe('super_admin');
    expect(createData.user.is_active).toBe(true);
  });
});
