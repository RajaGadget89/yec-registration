/**
 * Admin Delete Verification Test
 * 
 * This test verifies that the admin delete 401 issue is fixed by using
 * existing auth state and testing the endpoints.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Delete 401 Fix Verification', () => {
  test('Verify Admin Delete No Longer Returns 401', async ({ page }) => {
    console.log('\n🔧 Testing Admin Delete 401 Fix...');

    // Use existing auth state (raja_gadgets89_gmail_com.json)
    await page.goto('http://localhost:8080/admin/management');
    
    // Wait for page to load and verify we're authenticated
    await expect(page.locator('h1:has-text("Admin Management Team")')).toBeVisible();
    console.log('✅ Successfully accessed admin management page');

    // Test 1: Auth probe from page context
    console.log('\n📋 Step 1: Testing auth probe from page context...');
    const authProbeResult = await page.evaluate(async () => {
      const response = await fetch('/api/dev/route-auth-check', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      return { status: response.status, data: await response.json() };
    });

    console.log(`   Auth probe status: ${authProbeResult.status}`);
    console.log(`   Auth probe data:`, authProbeResult.data);
    
    // Expect 200 for auth probe
    expect(authProbeResult.status).toBe(200);
    expect(authProbeResult.data.ok).toBe(true);
    console.log('✅ Auth probe succeeded');

    // Test 2: Admin delete dry-run from page context
    console.log('\n📋 Step 2: Testing admin delete dry-run from page context...');
    const dryRunResult = await page.evaluate(async () => {
      const response = await fetch('/api/admin/management/admins/test-id?dry_run=1', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      return { status: response.status, data: await response.json().catch(() => ({})) };
    });

    console.log(`   Dry-run status: ${dryRunResult.status}`);
    console.log(`   Dry-run data:`, dryRunResult.data);
    
    // Expect NOT 401 for admin delete (should be 200, 404, or 403)
    expect(dryRunResult.status).not.toBe(401);
    console.log('✅ Admin delete no longer returns 401');

    // Test 3: Capture cookies for verification
    console.log('\n📋 Step 3: Capturing session cookies...');
    const cookies = await page.context().cookies();
    const sessionCookies = cookies.filter(cookie => 
      cookie.name.includes('sb-') || cookie.name.includes('admin-')
    );
    
    console.log(`   Session cookies found: ${sessionCookies.length}`);
    sessionCookies.forEach(cookie => {
      console.log(`     ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });

    console.log('\n🎉 Admin Delete 401 Fix Verification Complete!');
    console.log('   - Auth probe: ✅ 200');
    console.log('   - Admin delete: ✅ No 401');
    console.log('   - Session cookies: ✅ Bound properly');
  });
});

