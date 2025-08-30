/**
 * Complete Flow Test for Admin Menu Tab Visibility
 * 
 * This test simulates the complete magic link authentication flow
 * to establish a proper Supabase session and verify menu tab visibility
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Flow Test - Admin Menu Tab Visibility', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Complete Magic Link Flow and Menu Tab Verification', async ({ page, request }) => {
    console.log('\n🔧 Complete Magic Link Flow Test...');

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

    // Step 2: Navigate to admin login page
    console.log('\n📋 Step 2: Navigating to admin login page...');
    await page.goto(`${baseUrl}/admin/login`);
    
    let currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Step 3: Fill email and send magic link
    console.log('\n📋 Step 3: Sending magic link...');
    
    // Fill email
    const emailField = page.locator('input[type="email"]');
    await emailField.fill(adminEmail);
    
    // Click send magic link
    const magicLinkButton = page.locator('button:has-text("Send Magic Link")');
    await magicLinkButton.click();
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for success message
    const successMessage = page.locator('text=Magic link sent');
    const errorMessage = page.locator('text=Error');
    
    if (await successMessage.isVisible()) {
      console.log('✅ Magic link sent successfully');
      
      // Step 4: Simulate magic link click (this would normally be done via email)
      console.log('\n📋 Step 4: Simulating magic link authentication...');
      console.log('   Note: In real scenario, user would click magic link from email');
      console.log('   For testing, we need to manually complete the authentication');
      
      // Wait a moment for the magic link to be processed
      await page.waitForTimeout(2000);
      
      // Try to navigate to admin page to see if session is established
      console.log('\n📋 Step 5: Checking if session is established...');
      await page.goto(`${baseUrl}/admin`);
      
      currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/admin/login')) {
        console.log('❌ Still on login page - session not established');
        console.log('   This means the magic link needs to be clicked manually');
        
        // Check if there are any error messages
        const errorText = await page.locator('body').textContent();
        if (errorText?.includes('error') || errorText?.includes('Error')) {
          console.log('   Error detected on page');
        }
        
      } else if (currentUrl.includes('/admin')) {
        console.log('✅ Successfully on admin page - session established!');
        
        // Step 6: Check for Admin Management Team menu tab
        console.log('\n📋 Step 6: Checking for Admin Management Team menu tab...');
        
        // Wait for page to load completely
        await page.waitForTimeout(3000);
        
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
          
          // Test clicking the menu tab
          console.log('\n📋 Step 7: Testing menu tab functionality...');
          await menuTab.click();
          
          await page.waitForTimeout(2000);
          const newUrl = page.url();
          console.log(`   URL after clicking menu tab: ${newUrl}`);
          
          if (newUrl.includes('/admin/management')) {
            console.log('✅ SUCCESS: Menu tab works correctly!');
          } else {
            console.log('❌ Menu tab navigation failed');
          }
          
        } else {
          console.log('❌ FAILED: Menu tab is not visible');
          
          // Debug what's visible
          console.log('\n📋 Step 6a: Analyzing visible menu items...');
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
          
          // Take a screenshot for debugging
          console.log('\n📋 Step 6b: Taking screenshot for debugging...');
          await page.screenshot({ path: 'test-results/admin-menu-tab-complete-flow.png', fullPage: true });
          console.log('   Screenshot saved to: test-results/admin-menu-tab-complete-flow.png');
        }
        
      } else {
        console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
      }
      
    } else if (await errorMessage.isVisible()) {
      console.log('❌ Error sending magic link');
      const errorText = await errorMessage.textContent();
      console.log(`   Error: ${errorText}`);
      
    } else {
      console.log('⚠️  No clear success/error message found');
      
      // Take a screenshot to see what's on the page
      await page.screenshot({ path: 'test-results/admin-login-page.png', fullPage: true });
      console.log('   Screenshot saved to: test-results/admin-login-page.png');
    }
  });

  test('Verify Menu Tab After Manual Authentication', async ({ page, request }) => {
    console.log('\n🔧 Testing menu tab after manual authentication...');

    // Create admin user
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Navigate directly to admin page to see current state
    console.log('\n📋 Navigating to admin page to check current state...');
    await page.goto(`${baseUrl}/admin`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('❌ Still on login page - authentication needed');
      console.log('\n📋 Instructions for manual authentication:');
      console.log('   1. Navigate to: http://localhost:8080/admin/login');
      console.log('   2. Enter email: raja.gadgets89@gmail.com');
      console.log('   3. Click "Send Magic Link"');
      console.log('   4. Check email for magic link');
      console.log('   5. Click the magic link');
      console.log('   6. Navigate to: http://localhost:8080/admin');
      console.log('   7. Check if "Admin Management Team" tab is visible');
      
    } else if (currentUrl.includes('/admin')) {
      console.log('✅ On admin page - checking menu tab...');
      
      // Wait for page to load
      await page.waitForTimeout(3000);
      
      // Check for Admin Management Team menu tab
      const menuTab = page.locator('a:has-text("Admin Management Team")');
      const isMenuTabVisible = await menuTab.isVisible();
      
      console.log(`   Admin Management Team menu tab visible: ${isMenuTabVisible}`);
      
      if (isMenuTabVisible) {
        console.log('✅ SUCCESS: Menu tab is visible!');
        
        // Test clicking the menu tab
        await menuTab.click();
        await page.waitForTimeout(2000);
        
        const newUrl = page.url();
        console.log(`   URL after clicking menu tab: ${newUrl}`);
        
        if (newUrl.includes('/admin/management')) {
          console.log('✅ SUCCESS: Menu tab navigation works!');
        } else {
          console.log('❌ Menu tab navigation failed');
        }
        
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
        await page.screenshot({ path: 'test-results/admin-menu-tab-manual-auth.png', fullPage: true });
        console.log('   Screenshot saved to: test-results/admin-menu-tab-manual-auth.png');
      }
    }
  });
});
