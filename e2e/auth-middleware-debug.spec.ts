import { test, expect } from '@playwright/test';

/**
 * Debug Middleware Session Detection
 * 
 * This test specifically tests if the middleware can detect the session after authentication
 */
test.describe('Debug Middleware Session Detection', () => {
  const baseUrl = 'http://localhost:8080';

  test('Debug middleware session detection after authentication', async ({ page, context }) => {
    console.log('\n🔍 Debug Middleware Session Detection');
    console.log('=====================================');

    // Step 1: Clear cookies and storage
    console.log('\n📋 Step 1: Clearing cookies and storage...');
    await context.clearCookies();
    await page.goto(baseUrl);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('✅ Cookies and storage cleared');

    // Step 2: Send magic link and get real tokens
    console.log('\n📋 Step 2: Getting real magic link tokens...');
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
        
        // Step 4: Set server session directly
        console.log('\n📋 Step 4: Setting server session directly...');
        const sessionResponse = await page.request.post(`${baseUrl}/api/auth/session`, {
          data: { 
            access_token: accessToken,
            refresh_token: refreshToken
          }
        });
        
        console.log(`   Session endpoint status: ${sessionResponse.status()}`);
        
        if (sessionResponse.ok()) {
          console.log('✅ Server session set successfully');
          
          // Step 5: Check cookies after session endpoint call
          console.log('\n📋 Step 5: Checking cookies after session endpoint...');
          const cookies = await context.cookies();
          console.log(`   Total cookies: ${cookies.length}`);
          
          const supabaseCookies = cookies.filter(c => c.name.includes('sb-'));
          console.log(`   Supabase cookies: ${supabaseCookies.length}`);
          
          supabaseCookies.forEach(cookie => {
            console.log(`   Supabase Cookie: ${cookie.name}`);
            console.log(`     Domain: ${cookie.domain}`);
            console.log(`     Path: ${cookie.path}`);
            console.log(`     HttpOnly: ${cookie.httpOnly}`);
            console.log(`     Secure: ${cookie.secure}`);
            console.log(`     SameSite: ${cookie.sameSite}`);
            console.log(`     Value length: ${cookie.value.length}`);
          });
          
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
          
          // Step 7: Test middleware by accessing admin page
          console.log('\n📋 Step 7: Testing middleware by accessing admin page...');
          
          // Enable console logging to see middleware logs
          page.on('console', msg => {
            if (msg.text().includes('[auth-debug]') || msg.text().includes('middleware')) {
              console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
            }
          });
          
          // Navigate to admin page
          await page.goto(`${baseUrl}/admin`);
          
          // Wait for navigation to complete
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          // Check final URL
          const finalUrl = page.url();
          console.log(`   Final URL: ${finalUrl}`);
          
          if (finalUrl.includes('/admin') && !finalUrl.includes('/login')) {
            console.log('✅ Middleware allowed access to admin page');
          } else if (finalUrl.includes('/admin/login')) {
            console.log('❌ Middleware redirected to login page');
            
            // Check if there are any error parameters in the URL
            const urlParams = new URLSearchParams(finalUrl.split('?')[1] || '');
            const error = urlParams.get('error');
            if (error) {
              console.log(`   Error parameter: ${error}`);
            }
          } else {
            console.log('❌ Unexpected redirect destination');
          }
          
          // Step 8: Test middleware headers
          console.log('\n📋 Step 8: Testing middleware headers...');
          const adminResponse = await page.request.get(`${baseUrl}/admin`);
          const adminHeaders = adminResponse.headers();
          
          const adminGuardHeader = adminHeaders['x-admin-guard'];
          console.log(`   x-admin-guard header: ${adminGuardHeader}`);
          
          if (adminGuardHeader) {
            if (adminGuardHeader.startsWith('ok:')) {
              console.log('✅ Middleware detected valid session');
            } else if (adminGuardHeader.startsWith('deny:')) {
              console.log('❌ Middleware denied access');
              console.log(`   Reason: ${adminGuardHeader}`);
            }
          } else {
            console.log('❌ No x-admin-guard header found');
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

    console.log('\n🎯 Debug Middleware Session Detection Complete');
    console.log('==============================================');
  });
});
