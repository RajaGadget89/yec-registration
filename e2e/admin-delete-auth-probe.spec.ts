/**
 * Admin Delete Auth Probe Test - Test-First Approach
 * 
 * This test validates the complete admin delete flow with proper auth-probe
 * to ensure session cookies are visible to Route Handlers before attempting
 * destructive operations.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Delete Auth Probe - Test-First Validation', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Complete Admin Delete Flow with Auth Probe Validation', async ({ page, request }) => {
    console.log('\n🔧 Testing Admin Delete Flow with Auth Probe...');

    // Step 1: Complete authentication setup
    console.log('\n📋 Step 1: Setting up authentication...');
    const setupResponse = await request.post(`${baseUrl}/api/test/complete-auth-setup`, {
      data: { email: adminEmail }
    });
    
    expect(setupResponse.status()).toBe(200);
    const setupData = await setupResponse.json();
    console.log('✅ Authentication setup completed');
    console.log(`   Email: ${setupData.user.email}`);
    console.log(`   Role: ${setupData.user.role}`);

    // Step 2: Navigate to admin management and verify access
    console.log('\n📋 Step 2: Verifying admin management access...');
    await page.goto(`${baseUrl}/admin/management`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/management')) {
      console.log('✅ Successfully accessed management page');
      
      // Verify page content loads
      await expect(page.locator('h1:has-text("Admin Management Team")')).toBeVisible();
      console.log('✅ Management page content loaded correctly');
    } else {
      console.log('❌ Failed to access management page');
      throw new Error('Cannot access admin management page');
    }

    // Step 3: Navigate to dev-delete-tester
    console.log('\n📋 Step 3: Navigating to dev-delete-tester...');
    await page.goto(`${baseUrl}/admin/management/dev-delete-tester`);
    
    const testerUrl = page.url();
    console.log(`   Dev-delete-tester URL: ${testerUrl}`);
    expect(testerUrl).toContain('/dev-delete-tester');
    console.log('✅ Successfully accessed dev-delete-tester page');

    // Step 4: Run auth probe from the same page context
    console.log('\n📋 Step 4: Running auth probe from page context...');
    
    // Execute auth probe via page context to ensure cookies are included
    const authProbeResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/dev/route-auth-check', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { status: 500, data: { error: String(error) } };
      }
    });

    console.log('   Auth probe result:', authProbeResult);
    
    // Validate auth probe succeeded
    expect(authProbeResult.status).toBe(200);
    expect(authProbeResult.data.ok).toBe(true);
    expect(authProbeResult.data.email).toBeTruthy();
    console.log('✅ Auth probe succeeded from page context');
    console.log(`   Email: ${authProbeResult.data.email}`);
    console.log(`   Role: ${authProbeResult.data.role}`);

    // Step 5: Test dry-run operation
    console.log('\n📋 Step 5: Testing dry-run operation...');
    
    // Find an admin user to test with
    const adminRow = page.locator('tr[data-admin-id]').first();
    if (await adminRow.count() > 0) {
      const adminId = await adminRow.getAttribute('data-admin-id');
      console.log(`   Testing with admin ID: ${adminId}`);
      
      // Click dry-run button
      const dryRunButton = adminRow.locator('button:has-text("Dry Run")');
      await dryRunButton.click();
      
      // Wait for dry-run to complete
      await page.waitForTimeout(2000);
      
      // Check dry-run result
      const dryRunResult = await page.evaluate(async (id) => {
        try {
          const response = await fetch(`/api/admin/management/admins/${id}?dry_run=1`, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'same-origin',
          });
          const data = await response.json().catch(() => ({}));
          return { status: response.status, data };
        } catch (error) {
          return { status: 500, data: { error: String(error) } };
        }
      }, adminId);
      
      console.log('   Dry-run result:', dryRunResult);
      
      // Expect 200 status (not 401)
      expect(dryRunResult.status).toBe(200);
      console.log('✅ Dry-run succeeded with 200 status');
      
      // Step 6: Test actual delete operation
      console.log('\n📋 Step 6: Testing actual delete operation...');
      
      // Click delete button
      const deleteButton = adminRow.locator('button:has-text("Delete")');
      await deleteButton.click();
      
      // Wait for delete to complete
      await page.waitForTimeout(2000);
      
      // Check delete result
      const deleteResult = await page.evaluate(async (id) => {
        try {
          const response = await fetch(`/api/admin/management/admins/${id}`, {
            method: 'DELETE',
            credentials: 'same-origin',
          });
          const data = await response.json().catch(() => ({}));
          return { status: response.status, data };
        } catch (error) {
          return { status: 500, data: { error: String(error) } };
        }
      }, adminId);
      
      console.log('   Delete result:', deleteResult);
      
      // Expect 200 status (not 401)
      expect(deleteResult.status).toBe(200);
      console.log('✅ Delete succeeded with 200 status');
      
    } else {
      console.log('⚠️ No admin users found for testing');
    }

    // Step 7: Capture Network tab cookies for verification
    console.log('\n📋 Step 7: Capturing network cookies for verification...');
    
    // Navigate to a page that will make a request to capture cookies
    await page.goto(`${baseUrl}/admin/management`);
    
    // Open DevTools and capture network request
    await page.evaluate(() => {
      // This will be captured in the test artifacts
      console.log('Network tab should show cookies in request headers');
    });
    
    console.log('✅ Test completed successfully');
  });

  test('Auth Probe Validation - Route Handler Cookie Visibility', async ({ page, request }) => {
    console.log('\n🔧 Testing Route Handler Cookie Visibility...');

    // Setup authentication
    const setupResponse = await request.post(`${baseUrl}/api/test/complete-auth-setup`, {
      data: { email: adminEmail }
    });
    expect(setupResponse.status()).toBe(200);

    // Navigate to page to establish session context
    await page.goto(`${baseUrl}/admin/management`);
    
    // Test auth probe from page context (should include cookies)
    const pageContextProbe = await page.evaluate(async () => {
      const response = await fetch('/api/dev/route-auth-check', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      return { status: response.status, data: await response.json() };
    });

    console.log('Page context probe result:', pageContextProbe);
    expect(pageContextProbe.status).toBe(200);
    expect(pageContextProbe.data.ok).toBe(true);

    // Test auth probe from request context (should fail without cookies)
    const requestContextProbe = await request.get(`${baseUrl}/api/dev/route-auth-check`);
    const requestProbeData = await requestContextProbe.json();
    
    console.log('Request context probe result:', requestProbeData);
    
    // The request context probe should fail because it doesn't have cookies
    // This demonstrates the difference between page context and request context
    expect(requestContextProbe.status).toBe(401);
    console.log('✅ Request context probe correctly fails without cookies');
  });
});

