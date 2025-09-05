import { test, expect } from '@playwright/test';

/**
 * Debug Cookie Setting
 * 
 * This test specifically tests if cookies are being set correctly by the session endpoint
 */
test.describe('Debug Cookie Setting', () => {
  const baseUrl = 'http://localhost:8080';

  test('Debug cookie setting by session endpoint', async ({ page, context }) => {
    console.log('\n🍪 Debug Cookie Setting');
    console.log('========================');

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

    // Step 3: Follow the magic link to get real tokens
    console.log('\n📋 Step 3: Following magic link to get real tokens...');
    await page.goto(magicLinkData.actionLink);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Extract tokens from the URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/callback')) {
      const hash = await page.evaluate(() => window.location.hash);
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        console.log('✅ Real tokens extracted');
        console.log(`   Access token length: ${accessToken.length}`);
        console.log(`   Refresh token length: ${refreshToken.length}`);
        
        // Step 4: Test the session endpoint directly
        console.log('\n📋 Step 4: Testing session endpoint directly...');
        const sessionResponse = await page.request.post(`${baseUrl}/api/auth/session`, {
          data: { 
            access_token: accessToken,
            refresh_token: refreshToken
          }
        });
        
        console.log(`   Session endpoint status: ${sessionResponse.status()}`);
        
        if (sessionResponse.ok()) {
          console.log('✅ Session endpoint successful');
          
          // Check cookies after session endpoint call
          const cookies = await context.cookies();
          console.log(`   Total cookies: ${cookies.length}`);
          
          cookies.forEach(cookie => {
            console.log(`   Cookie: ${cookie.name} = ${cookie.value.substring(0, 50)}...`);
            console.log(`     Domain: ${cookie.domain}`);
            console.log(`     Path: ${cookie.path}`);
            console.log(`     HttpOnly: ${cookie.httpOnly}`);
            console.log(`     Secure: ${cookie.secure}`);
            console.log(`     SameSite: ${cookie.sameSite}`);
          });
          
          // Step 5: Test admin API access
          console.log('\n📋 Step 5: Testing admin API access...');
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
          
        } else {
          const errorData = await sessionResponse.json();
          console.log('❌ Session endpoint failed');
          console.log(`   Error: ${JSON.stringify(errorData)}`);
        }
      } else {
        console.log('❌ No tokens found in URL');
      }
    } else {
      console.log('❌ Not on callback page');
    }

    console.log('\n🎯 Debug Cookie Setting Complete');
    console.log('=================================');
  });
});
