/**
 * Final Test for Admin Management Authentication
 * 
 * This test verifies the complete solution works end-to-end
 */

import { test, expect } from '@playwright/test';

test.describe('Final Test - Admin Management Authentication', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Complete Solution Verification', async ({ page, request }) => {
    console.log('\n🔧 Final Solution Verification...');

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

    // Step 2: Verify getCurrentUser() works
    console.log('\n📋 Step 2: Verifying getCurrentUser()...');
    const debugResponse = await request.get(`${baseUrl}/api/test/debug-get-current-user`);
    
    expect(debugResponse.status()).toBe(200);
    const debugData = await debugResponse.json();
    console.log('✅ getCurrentUser() analysis:');
    console.log(`   User found: ${debugData.getCurrentUser.user_found}`);
    console.log(`   User active: ${debugData.analysis.user_exists_and_active}`);
    console.log(`   Has super_admin role: ${debugData.analysis.user_has_super_admin_role}`);
    console.log(`   hasRole("super_admin"): ${debugData.analysis.hasRole_super_admin_returns}`);
    console.log(`   Should allow access: ${debugData.analysis.should_allow_access}`);

    // Verify all conditions are met
    expect(debugData.analysis.should_allow_access).toBe(true);

    // Step 3: Test management page access
    console.log('\n📋 Step 3: Testing management page access...');
    await page.goto(`${baseUrl}/admin/management`);
    
    const currentUrl = page.url();
    console.log(`   Final URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/management')) {
      console.log('✅ SUCCESS: Management page accessed!');
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Check for management page content
      const pageContent = await page.locator('body').textContent();
      if (pageContent) {
        console.log('✅ Page content loaded');
        
        // Check for specific management content
        if (pageContent.includes('Admin Management Team') || 
            pageContent.includes('Users') || 
            pageContent.includes('Management')) {
          console.log('✅ Management page content verified');
        } else {
          console.log('⚠️  Management page content not as expected');
          console.log(`   Content preview: ${pageContent.substring(0, 200)}...`);
        }
      }
      
    } else if (currentUrl.includes('/admin/login')) {
      console.log('❌ FAILED: Still redirected to login');
      
      if (currentUrl.includes('unauthorized=1')) {
        console.log('❌ Unauthorized access - authentication failed');
      } else {
        console.log('❌ Not authenticated - no session');
      }
      
      // This should not happen since all conditions are met
      throw new Error('Management page access failed despite meeting all conditions');
      
    } else {
      console.log(`⚠️  Unexpected redirect to: ${currentUrl}`);
      throw new Error(`Unexpected redirect to: ${currentUrl}`);
    }
  });

  test('Verify All Authoritative Conditions Are Met', async ({ request }) => {
    console.log('\n🔧 Verifying all authoritative conditions...');

    // Create admin user
    const createResponse = await request.post(`${baseUrl}/api/test/create-admin-user`, {
      data: { email: adminEmail }
    });
    expect(createResponse.status()).toBe(200);

    // Test getCurrentUser() conditions
    const debugResponse = await request.get(`${baseUrl}/api/test/debug-get-current-user`);
    expect(debugResponse.status()).toBe(200);
    const debugData = await debugResponse.json();

    console.log('\n📋 Authoritative Conditions Check:');
    
    // Condition 1: getCurrentUser() returns valid user
    const condition1 = debugData.getCurrentUser.user_found;
    console.log(`   1. getCurrentUser() returns valid user: ${condition1 ? '✅' : '❌'}`);
    expect(condition1).toBe(true);
    
    // Condition 2: user.is_active is true
    const condition2 = debugData.analysis.user_exists_and_active;
    console.log(`   2. user.is_active is true: ${condition2 ? '✅' : '❌'}`);
    expect(condition2).toBe(true);
    
    // Condition 3: hasRole("super_admin") returns true
    const condition3 = debugData.analysis.hasRole_super_admin_returns;
    console.log(`   3. hasRole("super_admin") returns true: ${condition3 ? '✅' : '❌'}`);
    expect(condition3).toBe(true);
    
    // All conditions should be met
    const allConditionsMet = condition1 && condition2 && condition3;
    console.log(`\n   All conditions met: ${allConditionsMet ? '✅ YES' : '❌ NO'}`);
    expect(allConditionsMet).toBe(true);
    
    console.log('✅ All authoritative conditions are satisfied!');
  });

  test('Verify Solution Does Not Affect Core Services', async ({ request }) => {
    console.log('\n🔧 Verifying solution does not affect core services...');

    // Test core services still work
    const healthResponse = await request.get(`${baseUrl}/api/health`);
    expect(healthResponse.status()).toBe(200);
    console.log('✅ Health endpoint works');

    const envResponse = await request.get(`${baseUrl}/api/test/env-debug`);
    expect(envResponse.status()).toBe(200);
    console.log('✅ Environment debug works');

    const rbacResponse = await request.get(`${baseUrl}/api/test/rbac-debug?email=${adminEmail}`);
    expect(rbacResponse.status()).toBe(200);
    console.log('✅ RBAC debug works');

    const magicLinkResponse = await request.get(`${baseUrl}/api/test/magic-link?email=${adminEmail}`);
    expect(magicLinkResponse.status()).toBe(200);
    console.log('✅ Magic link generation works');

    console.log('✅ All core services still work correctly');
  });
});
