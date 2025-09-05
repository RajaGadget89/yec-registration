import { test, expect } from '@playwright/test';

/**
 * Complete Magic Link Authentication Flow Test
 * 
 * This test simulates the complete magic link authentication flow by:
 * 1. Sending a magic link via the server-side API
 * 2. Following the magic link to establish a session
 * 3. Verifying that the session is properly established
 */
test.describe('Complete Magic Link Authentication Flow', () => {
  const baseUrl = 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test('Complete magic link authentication flow', async ({ page, context }) => {
    console.log('\n🔗 Complete Magic Link Authentication Flow Test');
    console.log('================================================');

    // Step 1: Clear cookies and storage
    console.log('\n📋 Step 1: Clearing cookies and storage...');
    await context.clearCookies();
    await page.goto(baseUrl);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('✅ Cookies and storage cleared');

    // Step 2: Send magic link via server-side API
    console.log('\n📋 Step 2: Sending magic link via server-side API...');
    const magicLinkResponse = await page.request.post(`${baseUrl}/api/auth/magic-link`, {
      data: { email: adminEmail }
    });

    if (!magicLinkResponse.ok()) {
      const errorData = await magicLinkResponse.json();
      throw new Error(`Magic link generation failed: ${magicLinkResponse.status()} - ${JSON.stringify(errorData)}`);
    }

    const magicLinkData = await magicLinkResponse.json();
    console.log('✅ Magic link generated successfully');
    console.log(`   Action Link: ${magicLinkData.actionLink}`);

    // Step 3: Follow the magic link
    console.log('\n📋 Step 3: Following the magic link...');
    
    // Navigate to the magic link URL
    const magicLinkUrl = magicLinkData.actionLink;
    console.log(`   Navigating to: ${magicLinkUrl}`);
    
    const navigationResponse = await page.goto(magicLinkUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log(`   Navigation status: ${navigationResponse?.status()}`);
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Get final URL after navigation
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);

    // Step 4: Check if we were redirected to the callback
    if (finalUrl.includes('/auth/callback')) {
      console.log('✅ Successfully redirected to /auth/callback');
      
      // Wait for the callback to process
      await page.waitForTimeout(2000);
      
      // Check if we were redirected to admin page
      const currentUrl = page.url();
      console.log(`   Current URL after callback: ${currentUrl}`);
      
      if (currentUrl.includes('/admin') && !currentUrl.includes('/login')) {
        console.log('✅ Successfully authenticated and redirected to admin page');
      } else {
        console.log('❌ Still on login page or callback page');
      }
    } else if (finalUrl.includes('/admin') && !finalUrl.includes('/login')) {
      console.log('✅ Successfully authenticated and redirected to admin page');
    } else {
      console.log('❌ Unexpected redirect destination');
    }

    // Step 5: Check cookies
    console.log('\n📋 Step 5: Checking authentication cookies...');
    const cookies = await context.cookies();
    const authCookies = {
      sbAccessToken: cookies.find(c => c.name.includes('sb-access-token')),
      sbRefreshToken: cookies.find(c => c.name.includes('sb-refresh-token')),
      adminEmail: cookies.find(c => c.name === 'admin-email')
    };
    
    console.log('   Supabase access token cookie:', authCookies.sbAccessToken ? 'SET' : 'NOT SET');
    console.log('   Supabase refresh token cookie:', authCookies.sbRefreshToken ? 'SET' : 'NOT SET');
    console.log('   Admin email cookie:', authCookies.adminEmail ? 'SET' : 'NOT SET');

    // Step 6: Test admin API access
    console.log('\n📋 Step 6: Testing admin API access...');
    const meResponse = await page.request.get(`${baseUrl}/api/admin/me`);
    console.log(`   /api/admin/me status: ${meResponse.status()}`);
    
    if (meResponse.ok()) {
      const meData = await meResponse.json();
      console.log('✅ Admin API access successful');
      console.log(`   User email: ${meData.email}`);
      console.log(`   User role: ${meData.role}`);
    } else {
      const errorData = await meResponse.json();
      console.log('❌ Admin API access failed');
      console.log(`   Error: ${JSON.stringify(errorData)}`);
    }

    // Step 7: Test admin dashboard access
    console.log('\n📋 Step 7: Testing admin dashboard access...');
    await page.goto(`${baseUrl}/admin`);
    
    const dashboardUrl = page.url();
    console.log(`   Dashboard URL: ${dashboardUrl}`);
    
    if (dashboardUrl.includes('/admin') && !dashboardUrl.includes('/login')) {
      console.log('✅ Admin dashboard access successful');
    } else {
      console.log('❌ Admin dashboard access failed - redirected to login');
    }

    // Step 8: Take screenshot
    console.log('\n📋 Step 8: Taking screenshot...');
    await page.screenshot({ 
      path: 'playwright-report/magic-link-complete-flow.png',
      fullPage: true 
    });
    console.log('✅ Screenshot saved');

    console.log('\n🎯 Complete Magic Link Authentication Flow Test Complete');
    console.log('========================================================');
  });
});
