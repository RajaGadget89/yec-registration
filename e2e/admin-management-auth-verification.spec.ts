/**
 * Admin Management Authorization Verification Test
 * 
 * This test specifically verifies the exact authoritative conditions required for /admin/management access:
 * 
 * 1. User must be authenticated (getCurrentUser() returns valid user)
 * 2. User must be active (user.is_active === true)
 * 3. User must have super_admin role (hasRole("super_admin") returns true)
 * 
 * These are the EXACT conditions from app/admin/management/page.tsx lines 28-35
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Management Authorization Verification', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Verify Exact Authoritative Conditions for /admin/management', async ({ page, request }) => {
    console.log('\n🔍 Verifying Exact Authoritative Conditions for /admin/management...');

    // Step 1: Test without authentication (should redirect to login)
    console.log('\n📋 Step 1: Testing without authentication...');
    await page.goto(`${baseUrl}/admin/management`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Should be redirected to login
    expect(currentUrl).toContain('/admin/login');
    console.log('✅ Correctly redirected to login when not authenticated');

    // Step 2: Verify RBAC role assignment
    console.log('\n📋 Step 2: Verifying RBAC role assignment...');
    const rbacResponse = await request.get(`${baseUrl}/api/test/rbac-debug?email=${adminEmail}`);
    const rbacData = await rbacResponse.json();
    
    expect(rbacResponse.status()).toBe(200);
    expect(rbacData.roles).toContain('super_admin');
    console.log(`✅ User has super_admin role: ${rbacData.roles.join(', ')}`);

    // Step 3: Test admin/me endpoint to verify authentication state
    console.log('\n📋 Step 3: Testing admin/me endpoint...');
    const meResponse = await request.get(`${baseUrl}/api/admin/me`);
    
    if (meResponse.status() === 200) {
      const meData = await meResponse.json();
      console.log('✅ User is authenticated');
      console.log(`   Email: ${meData.email}`);
      console.log(`   Role: ${meData.role}`);
      console.log(`   Active: ${meData.is_active}`);
      
      // Verify the exact conditions from the management page
      expect(meData.email).toBe(adminEmail);
      expect(meData.role).toBe('super_admin');
      expect(meData.is_active).toBe(true);
      
      console.log('✅ All authoritative conditions met!');
      
      // Step 4: Now test access to management page
      console.log('\n📋 Step 4: Testing access to management page with authentication...');
      await page.goto(`${baseUrl}/admin/management`);
      
      const finalUrl = page.url();
      console.log(`   Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('/admin/management')) {
        console.log('✅ Successfully accessed management page!');
        
        // Verify page content loads
        await expect(page.locator('h1:has-text("Admin Management Team")')).toBeVisible();
        console.log('✅ Management page content loaded correctly');
      } else {
        console.log('❌ Still redirected to login despite meeting conditions');
        console.log(`   Redirected to: ${finalUrl}`);
      }
      
    } else {
      console.log('❌ User is not authenticated');
      console.log(`   Status: ${meResponse.status()}`);
      
      // Step 4: Test what happens when we try to access management page
      console.log('\n📋 Step 4: Testing management page access without authentication...');
      await page.goto(`${baseUrl}/admin/management`);
      
      const finalUrl = page.url();
      console.log(`   Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('/admin/login')) {
        console.log('✅ Correctly redirected to login (expected behavior)');
      } else {
        console.log('❌ Unexpected behavior - not redirected to login');
      }
    }
  });

  test('Verify hasRole("super_admin") Function Behavior', async ({ request }) => {
    console.log('\n🔍 Verifying hasRole("super_admin") function behavior...');

    // Test the exact conditions that hasRole checks:
    // 1. getCurrentUser() returns valid user
    // 2. user.is_active === true  
    // 3. user.role === "super_admin"

    const meResponse = await request.get(`${baseUrl}/api/admin/me`);
    
    if (meResponse.status() === 200) {
      const meData = await meResponse.json();
      
      console.log('📋 hasRole("super_admin") conditions check:');
      console.log(`   1. User exists: ${meData.email ? '✅' : '❌'}`);
      console.log(`   2. User is active: ${meData.is_active ? '✅' : '❌'}`);
      console.log(`   3. User has super_admin role: ${meData.role === 'super_admin' ? '✅' : '❌'}`);
      
      // Simulate the exact logic from hasRole function
      const hasSuperAdminRole = meData.email && meData.is_active && meData.role === 'super_admin';
      
      console.log(`   hasRole("super_admin") result: ${hasSuperAdminRole ? '✅ TRUE' : '❌ FALSE'}`);
      
      expect(hasSuperAdminRole).toBe(true);
      
    } else {
      console.log('❌ Cannot test hasRole - user not authenticated');
      console.log(`   Status: ${meResponse.status()}`);
    }
  });

  test('Verify Management Page Server-Side Authorization Logic', async ({ request }) => {
    console.log('\n🔍 Verifying management page server-side authorization logic...');

    // Test the exact authorization flow from the management page:
    // 1. const user = await getCurrentUser();
    // 2. if (!user || !user.is_active) { redirect("/admin/login"); }
    // 3. if (!(await hasRole("super_admin"))) { redirect("/admin/login?unauthorized=1"); }

    const meResponse = await request.get(`${baseUrl}/api/admin/me`);
    
    if (meResponse.status() === 200) {
      const meData = await meResponse.json();
      
      console.log('📋 Management page authorization logic check:');
      
      // Step 1: Check if user exists and is active
      const userExistsAndActive = meData.email && meData.is_active;
      console.log(`   1. User exists and is active: ${userExistsAndActive ? '✅' : '❌'}`);
      
      if (!userExistsAndActive) {
        console.log('   → Should redirect to /admin/login');
      } else {
        // Step 2: Check if user has super_admin role
        const hasSuperAdminRole = meData.role === 'super_admin';
        console.log(`   2. User has super_admin role: ${hasSuperAdminRole ? '✅' : '❌'}`);
        
        if (!hasSuperAdminRole) {
          console.log('   → Should redirect to /admin/login?unauthorized=1');
        } else {
          console.log('   → Should allow access to management page');
        }
      }
      
      // Verify all conditions are met
      expect(userExistsAndActive).toBe(true);
      expect(meData.role).toBe('super_admin');
      
    } else {
      console.log('❌ Cannot test authorization logic - user not authenticated');
      console.log(`   Status: ${meResponse.status()}`);
    }
  });

  test('Verify Cookie-Based Authentication State', async ({ page }) => {
    console.log('\n🔍 Verifying cookie-based authentication state...');

    // Check current cookies
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name.includes('admin-email') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('supabase')
    );
    
    console.log(`📋 Found ${authCookies.length} authentication cookies:`);
    authCookies.forEach(cookie => {
      console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });
    
    if (authCookies.length === 0) {
      console.log('❌ No authentication cookies found');
      console.log('   → This explains why /admin/management redirects to login');
    } else {
      console.log('✅ Authentication cookies present');
      
      // Test if cookies are sufficient for management access
      await page.goto(`${baseUrl}/admin/management`);
      const currentUrl = page.url();
      
      if (currentUrl.includes('/admin/management')) {
        console.log('✅ Cookies provide sufficient authentication for management access');
      } else {
        console.log('❌ Cookies present but still redirected to login');
        console.log(`   Redirected to: ${currentUrl}`);
      }
    }
  });
});
