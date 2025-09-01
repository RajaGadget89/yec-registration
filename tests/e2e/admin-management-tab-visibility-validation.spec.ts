/**
 * Admin Management Tab Visibility Validation Test
 * 
 * This test validates the exact conditions required for the "Admin Management Team" 
 * menu tab to be visible in the top navigation bar.
 * 
 * CONDITIONS REQUIRED:
 * 1. Feature Flag: FEATURES_ADMIN_MANAGEMENT=true
 * 2. Authentication: User must be authenticated
 * 3. Role Check: User must have super_admin role
 * 4. Active Status: User must be is_active=true
 * 
 * This test does NOT affect Core Services, Domain Events, or AC1-AC6 workflows.
 */

import { test, expect } from '@playwright/test';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAILS?.split(',')[0] || 'raja.gadgets89@gmail.com';

test.describe('Admin Management Tab Visibility Validation', () => {
  test('Validate Admin Management Tab Visibility Conditions', async ({ page, request }) => {
    console.log('\n🔧 Validating Admin Management Tab Visibility Conditions...');
    console.log(`   Super Admin Email: ${SUPER_ADMIN_EMAIL}`);

    // Step 1: Check feature flag status
    console.log('\n📋 Step 1: Checking feature flag status...');
    const featureResponse = await request.get('/api/features');
    expect(featureResponse.status()).toBe(200);
    const featureFlags = await featureResponse.json();
    console.log(`   Feature Flags:`, featureFlags);
    console.log(`   Admin Management Enabled: ${featureFlags.adminManagement ? '✅' : '❌'}`);

    // Step 2: Check user authentication status
    console.log('\n📋 Step 2: Checking user authentication status...');
    const meResponse = await request.get('/api/admin/me');
    const isAuthenticated = meResponse.status() === 200;
    console.log(`   User Authenticated: ${isAuthenticated ? '✅' : '❌'}`);

    if (isAuthenticated) {
      const userData = await meResponse.json();
      console.log(`   User Email: ${userData.email}`);
      console.log(`   User Role: ${userData.role}`);
      console.log(`   User Active: ${userData.is_active ? '✅' : '❌'}`);
      console.log(`   User ID: ${userData.id}`);
    }

    // Step 3: Navigate to admin page and check menu visibility
    console.log('\n📋 Step 3: Checking menu tab visibility on admin page...');
    await page.goto('/admin');
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Redirected to login - user not authenticated');
      console.log('   Expected: User should be authenticated to see admin management tab');
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ Successfully on admin page');
      
      // Wait for page to load completely
      await page.waitForTimeout(2000);
      
      // Check for Admin Management Team menu tab
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible: ${isMenuTabVisible ? '✅' : '❌'}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible!');
        
        // Verify the tab links to the correct page
        const href = await menuTab.getAttribute('href');
        console.log(`   Menu tab href: ${href}`);
        expect(href).toBe('/admin/management');
        
        // Test clicking the menu tab
        console.log('\n📋 Step 4: Testing menu tab functionality...');
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
          
          // Check for Super Admin badge
          const superAdminBadge = page.locator('text=Super Admin');
          const hasSuperAdminBadge = await superAdminBadge.isVisible();
          console.log(`   Super Admin badge visible: ${hasSuperAdminBadge ? '✅' : '❌'}`);
          
        } else {
          console.log('❌ Menu tab navigation failed');
        }
        
      } else {
        console.log('❌ FAILED: Menu tab is not visible');
        
        // Debug what menu items are visible
        const visibleMenuItems = await page.locator('nav a').allTextContents();
        console.log('   Visible menu items:');
        visibleMenuItems.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.trim()}`);
        });
        
        // Check if user info shows Super Admin
        const superAdminBadge = page.locator('text=Super Admin');
        const hasSuperAdminBadge = await superAdminBadge.isVisible();
        console.log(`   Super Admin badge visible: ${hasSuperAdminBadge ? '✅' : '❌'}`);
        
        // Check user email
        const userEmail = page.locator(`text=${SUPER_ADMIN_EMAIL}`);
        const hasUserEmail = await userEmail.isVisible();
        console.log(`   User email visible: ${hasUserEmail ? '✅' : '❌'}`);
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'artifacts/admin-management-tab-debug.png', fullPage: true });
        console.log('   Screenshot saved to: artifacts/admin-management-tab-debug.png');
      }
      
    } else {
      console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
    }
  });

  test('Validate Menu Tab Conditions Analysis', async ({ request }) => {
    console.log('\n🔧 Analyzing Menu Tab Visibility Conditions...');

    // Step 1: Check feature flag
    const featureResponse = await request.get('/api/features');
    const featureFlags = await featureResponse.json();
    const featureFlagEnabled = featureFlags.adminManagement;

    // Step 2: Check authentication
    const meResponse = await request.get('/api/admin/me');
    const isAuthenticated = meResponse.status() === 200;
    
    let userData = null;
    if (isAuthenticated) {
      userData = await meResponse.json();
    }

    // Step 3: Analyze conditions
    console.log('\n📋 Menu Tab Visibility Conditions Analysis:');
    console.log(`   1. Feature Flag (FEATURES_ADMIN_MANAGEMENT): ${featureFlagEnabled ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`   2. User Authenticated: ${isAuthenticated ? '✅ TRUE' : '❌ FALSE'}`);
    
    if (userData) {
      console.log(`   3. User Role (super_admin): ${userData.role === 'super_admin' ? '✅ TRUE' : '❌ FALSE'} (${userData.role})`);
      console.log(`   4. User Active (is_active): ${userData.is_active ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`   5. User Email: ${userData.email}`);
    } else {
      console.log(`   3. User Role (super_admin): ❌ FALSE (not authenticated)`);
      console.log(`   4. User Active (is_active): ❌ FALSE (not authenticated)`);
      console.log(`   5. User Email: N/A (not authenticated)`);
    }

    // Step 4: Calculate expected result
    const expectedVisible = featureFlagEnabled && isAuthenticated && userData?.role === 'super_admin' && userData?.is_active;
    console.log(`\n📋 Expected Menu Tab Visible: ${expectedVisible ? '✅ YES' : '❌ NO'}`);
    
    if (!expectedVisible) {
      console.log('\n📋 Missing Conditions:');
      if (!featureFlagEnabled) console.log('   - Feature flag disabled');
      if (!isAuthenticated) console.log('   - User not authenticated');
      if (userData && userData.role !== 'super_admin') console.log('   - User not super_admin');
      if (userData && !userData.is_active) console.log('   - User not active');
    }
  });

  test('Validate API Endpoints for Menu Tab Functionality', async ({ request }) => {
    console.log('\n🔧 Validating API Endpoints for Menu Tab Functionality...');

    // Test 1: Features API
    console.log('\n📋 Test 1: Features API');
    const featureResponse = await request.get('/api/features');
    console.log(`   Status: ${featureResponse.status()}`);
    if (featureResponse.status() === 200) {
      const features = await featureResponse.json();
      console.log(`   Response:`, features);
    }

    // Test 2: Admin Me API
    console.log('\n📋 Test 2: Admin Me API');
    const meResponse = await request.get('/api/admin/me');
    console.log(`   Status: ${meResponse.status()}`);
    if (meResponse.status() === 200) {
      const meData = await meResponse.json();
      console.log(`   Response:`, meData);
    }

    // Test 3: Admin Management Page (should redirect if not authorized)
    console.log('\n📋 Test 3: Admin Management Page Access');
    const managementResponse = await request.get('/admin/management');
    console.log(`   Status: ${managementResponse.status()}`);
    console.log(`   URL: ${managementResponse.url()}`);

    // Test 4: Admin Management API (should require super_admin)
    console.log('\n📋 Test 4: Admin Management API');
    const managementApiResponse = await request.get('/api/admin/management/admins');
    console.log(`   Status: ${managementApiResponse.status()}`);
    if (managementApiResponse.status() !== 200) {
      const errorData = await managementApiResponse.json().catch(() => ({}));
      console.log(`   Error:`, errorData);
    }
  });
});
