import { test, expect } from '@playwright/test';

/**
 * Debug Callback Page Behavior
 * 
 * This test specifically tests the callback page behavior to see why it's not redirecting
 */
test.describe('Debug Callback Page Behavior', () => {
  const baseUrl = 'http://localhost:8080';

  test('Debug callback page redirect behavior', async ({ page, context }) => {
    console.log('\n🔍 Debug Callback Page Behavior');
    console.log('================================');

    // Step 1: Clear cookies and storage
    console.log('\n📋 Step 1: Clearing cookies and storage...');
    await context.clearCookies();
    await page.goto(baseUrl);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('✅ Cookies and storage cleared');

    // Step 2: Send magic link
    console.log('\n📋 Step 2: Sending magic link...');
    const magicLinkResponse = await page.request.post(`${baseUrl}/api/auth/magic-link`, {
      data: { email: 'raja.gadgets89@gmail.com' }
    });

    if (!magicLinkResponse.ok()) {
      throw new Error('Magic link generation failed');
    }

    const magicLinkData = await magicLinkResponse.json();
    console.log('✅ Magic link generated');

    // Step 3: Navigate to callback page with mock tokens to test the redirect logic
    console.log('\n📋 Step 3: Testing callback page with mock tokens...');
    
    // Create a mock callback URL with tokens
    const mockCallbackUrl = `${baseUrl}/auth/callback#access_token=mock_token&refresh_token=mock_refresh&type=magiclink`;
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Navigate to the callback page
    await page.goto(mockCallbackUrl);
    
    // Wait for the callback page to process
    await page.waitForTimeout(3000);
    
    // Check the current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check if there are any error messages on the page
    const errorElements = await page.locator('[data-testid="error"], .error, [class*="error"]').count();
    console.log(`   Error elements found: ${errorElements}`);
    
    // Check if there are any success messages on the page
    const successElements = await page.locator('[data-testid="success"], .success, [class*="success"]').count();
    console.log(`   Success elements found: ${successElements}`);
    
    // Check the page content
    const pageContent = await page.textContent('body');
    console.log(`   Page contains "error": ${pageContent?.includes('error') || false}`);
    console.log(`   Page contains "success": ${pageContent?.includes('success') || false}`);
    console.log(`   Page contains "redirecting": ${pageContent?.includes('redirecting') || false}`);

    // Step 4: Test with real tokens
    console.log('\n📋 Step 4: Testing with real magic link...');
    
    // Navigate to the real magic link
    await page.goto(magicLinkData.actionLink);
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Wait for callback processing
    await page.waitForTimeout(5000);
    
    // Check the final URL
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    // Check if we were redirected to admin page
    if (finalUrl.includes('/admin') && !finalUrl.includes('/login')) {
      console.log('✅ Successfully redirected to admin page');
    } else if (finalUrl.includes('/auth/callback')) {
      console.log('❌ Still on callback page - redirect not working');
      
      // Check for any error messages
      const errorText = await page.textContent('body');
      if (errorText?.includes('error') || errorText?.includes('Error')) {
        console.log('   Error detected on callback page');
      }
    } else {
      console.log('❌ Unexpected redirect destination');
    }

    // Step 5: Check cookies after real magic link
    console.log('\n📋 Step 5: Checking cookies after real magic link...');
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

    console.log('\n🎯 Debug Callback Page Behavior Complete');
    console.log('========================================');
  });
});
