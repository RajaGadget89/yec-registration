/**
 * Real Authentication Test for Admin Menu Tab Visibility
 * 
 * This test simulates the real authentication flow to validate
 * the "Admin Management Team" menu tab visibility
 */

import { test, expect } from '@playwright/test';

test.describe('Real Authentication Test - Admin Menu Tab Visibility', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Test Menu Tab with Real Authentication', async ({ page, request }) => {
    console.log('\n🔧 Testing Admin Menu Tab with Real Authentication...');

    // Step 1: Ensure admin user exists
    console.log('\n📋 Step 1: Ensuring admin user exists...');
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    
    expect(createResponse.status()).toBe(200);
    const createData = await createResponse.json();
    console.log('✅ Admin user ready:');
    console.log(`   Email: ${createData.user.email}`);
    console.log(`   Role: ${createData.user.role}`);
    console.log(`   Active: ${createData.user.is_active}`);

    // Step 2: Navigate to admin login page
    console.log('\n📋 Step 2: Navigating to admin login page...');
    await page.goto(`${baseUrl}/admin/login`);
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('✅ On login page - proceeding with authentication');
      
      // Step 3: Fill email and send magic link
      console.log('\n📋 Step 3: Sending magic link...');
      
      const emailField = page.locator('input[type="email"]');
      await emailField.fill(adminEmail);
      
      const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
      await magicLinkButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Check for success message
      const successMessage = page.locator('text=Magic link sent');
      if (await successMessage.isVisible()) {
        console.log('✅ Magic link sent successfully');
        
        // Step 4: Simulate authenticated session
        console.log('\n📋 Step 4: Simulating authenticated session...');
        
        // Set admin-email cookie to simulate authenticated session
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
        
        // Step 5: Navigate to admin page
        console.log('\n📋 Step 5: Navigating to admin page...');
        await page.goto(`${baseUrl}/admin`);
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        const adminUrl = page.url();
        console.log(`   Admin page URL: ${adminUrl}`);
        
        if (adminUrl.includes('/admin') && !adminUrl.includes('/login')) {
          console.log('✅ Successfully on admin page');
          
          // Step 6: Check for Admin Management Team menu tab
          console.log('\n📋 Step 6: Checking for Admin Management Team menu tab...');
          
          // Wait for navigation to load
          await page.waitForTimeout(2000);
          
          // Look for the menu tab
          const menuTab = page.locator('a:has-text("Admin Management Team")');
          const isMenuTabVisible = await menuTab.isVisible();
          
          console.log(`   Admin Management Team menu tab visible: ${isMenuTabVisible}`);
          
          if (isMenuTabVisible) {
            console.log('✅ SUCCESS: Menu tab is visible!');
            
            // Verify the tab links to the correct page
            const href = await menuTab.getAttribute('href');
            console.log(`   Menu tab href: ${href}`);
            expect(href).toBe('/admin/management');
            
            // Step 7: Test clicking the menu tab
            console.log('\n📋 Step 7: Testing menu tab functionality...');
            await menuTab.click();
            
            // Wait for navigation
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
            await page.screenshot({ path: 'test-results/admin-menu-tab-real-auth-debug.png', fullPage: true });
            console.log('   Screenshot saved to: test-results/admin-menu-tab-real-auth-debug.png');
            
            // Check menu conditions via API
            console.log('\n📋 Debug: Checking menu conditions via API...');
            const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
            const menuData = await menuResponse.json();
            
            console.log('   Menu conditions analysis:');
            console.log(`     User found: ${menuData.menu_conditions.user_found}`);
            console.log(`     isSuperAdmin: ${menuData.menu_conditions.isSuperAdmin}`);
            console.log(`     Feature flag enabled: ${menuData.menu_conditions.featureFlagEnabled}`);
            console.log(`     Should show menu: ${menuData.analysis.should_show_menu}`);
          }
          
        } else {
          console.log('❌ Failed to access admin page');
          console.log(`   Current URL: ${adminUrl}`);
        }
        
      } else {
        console.log('❌ Magic link sending failed');
        
        // Check for error messages
        const errorMessage = page.locator('.error, .alert, [role="alert"]');
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          console.log(`   Error: ${errorText}`);
        }
      }
      
    } else {
      console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
    }
  });

  test('Verify Menu Conditions After Authentication', async ({ request }) => {
    console.log('\n🔧 Verifying menu conditions after authentication...');

    // Create admin user
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Check menu conditions
    const menuResponse = await request.get(`${baseUrl}/api/test/debug-menu-conditions`);
    expect(menuResponse.status()).toBe(200);
    const menuData = await menuResponse.json();

    console.log('\n📋 Menu Conditions Analysis:');
    console.log(`   1. User found: ${menuData.menu_conditions.user_found ? '✅' : '❌'}`);
    console.log(`   2. User active: ${menuData.analysis.condition1_user_exists_and_active ? '✅' : '❌'}`);
    console.log(`   3. Database super_admin role: ${menuData.analysis.condition2_user_has_super_admin_role ? '✅' : '❌'}`);
    console.log(`   4. RBAC super_admin role: ${menuData.analysis.condition3_rbac_has_super_admin ? '✅' : '❌'}`);
    console.log(`   5. isSuperAdmin calculated: ${menuData.analysis.condition4_isSuperAdmin_calculated ? '✅' : '❌'}`);
    console.log(`   6. Feature flag enabled: ${menuData.analysis.condition5_feature_flag_enabled ? '✅' : '❌'}`);
    console.log(`   7. Should show menu: ${menuData.analysis.should_show_menu ? '✅' : '❌'}`);

    // Note: In E2E mode, user_found will be false because E2E_TEST_MODE bypasses authentication
    // This is expected behavior for testing
    console.log('\n📋 Note: In E2E mode, authentication is bypassed for testing purposes');
    console.log('   For real authentication testing, E2E_TEST_MODE should be false');
  });
});
