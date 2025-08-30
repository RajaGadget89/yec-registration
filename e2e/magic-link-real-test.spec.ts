import { test, expect } from '@playwright/test';

/**
 * Real Magic Link Test - Using Actual Magic Link URL
 * 
 * This test simulates clicking the real magic link email to identify
 * exactly where the authentication flow breaks.
 */

test.describe('Real Magic Link Authentication Test', () => {
  test('test real magic link flow with actual URL', async ({ page, context }) => {
    console.log('=== Real Magic Link Test ===');
    
    // Clear cookies and storage
    await context.clearCookies();
    await page.goto('http://localhost:8080');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('✅ Setup completed - cookies cleared');
    
    // The actual magic link from the email
    const realMagicLink = 'https://nuxahfrelvfvsmhzvxqm.supabase.co/auth/v1/verify?token=f967755ac2a67951f38ba06444f89d8b3e02ec2917729ac96bfecfca&type=magiclink&redirect_to=http://localhost:8080/auth/confirm';
    
    console.log('🔗 Testing real magic link:', realMagicLink);
    
    // Network request tracking
    const networkRequests: any[] = [];
    page.on('request', request => {
      networkRequests.push({
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString()
      });
    });
    
    page.on('response', response => {
      const request = networkRequests.find(r => r.url === response.url());
      if (request) {
        request.response = {
          status: response.status(),
          statusText: response.statusText(),
          url: response.url()
        };
      }
    });
    
    try {
      // Navigate to the real magic link
      console.log('📱 Navigating to real magic link...');
      const response = await page.goto(realMagicLink, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log('📍 Initial response status:', response?.status());
      console.log('📍 Initial response URL:', response?.url());
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Get final URL after all redirects
      const finalUrl = page.url();
      console.log('🎯 Final URL after navigation:', finalUrl);
      
      // Check if we ended up on the expected page
      if (finalUrl.includes('/auth/confirm')) {
        console.log('✅ Successfully redirected to /auth/confirm');
        
        // Check if there are any error parameters
        const urlParams = new URLSearchParams(finalUrl.split('?')[1] || '');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.log('❌ Error detected:', error);
          console.log('❌ Error description:', errorDescription);
        } else {
          console.log('✅ No error parameters found');
        }
        
        // Check if there are tokens in the URL hash
        const hash = await page.evaluate(() => window.location.hash);
        console.log('🔍 URL hash:', hash);
        
        if (hash.includes('access_token')) {
          console.log('✅ Access token found in URL hash');
        } else {
          console.log('❌ No access token found in URL hash');
        }
        
      } else if (finalUrl.includes('/auth/callback')) {
        console.log('✅ Successfully redirected to /auth/callback');
        
        // Check if there are any error parameters
        const urlParams = new URLSearchParams(finalUrl.split('?')[1] || '');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.log('❌ Error detected:', error);
          console.log('❌ Error description:', errorDescription);
        } else {
          console.log('✅ No error parameters found');
        }
        
        // Check if there are tokens in the URL hash
        const hash = await page.evaluate(() => window.location.hash);
        console.log('🔍 URL hash:', hash);
        
        if (hash.includes('access_token')) {
          console.log('✅ Access token found in URL hash');
        } else {
          console.log('❌ No access token found in URL hash');
        }
        
      } else if (finalUrl.includes('/admin/login')) {
        console.log('❌ Redirected back to login page');
        
        // Check for error parameters
        const urlParams = new URLSearchParams(finalUrl.split('?')[1] || '');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.log('❌ Error detected:', error);
          console.log('❌ Error description:', errorDescription);
        }
        
      } else {
        console.log('❓ Unexpected final URL:', finalUrl);
      }
      
      // Check cookies after navigation
      const cookies = await context.cookies();
      const authCookies = {
        sbAccessToken: cookies.find(c => c.name === 'sb-access-token'),
        sbRefreshToken: cookies.find(c => c.name === 'sb-refresh-token'),
        adminEmail: cookies.find(c => c.name === 'admin-email')
      };
      
      console.log('🍪 Auth cookies after navigation:', {
        sbAccessToken: !!authCookies.sbAccessToken,
        sbRefreshToken: !!authCookies.sbRefreshToken,
        adminEmail: !!authCookies.adminEmail
      });
      
      // Test session verification
      console.log('🔍 Testing session verification...');
      const meResponse = await page.request.get('http://localhost:8080/api/admin/me');
      console.log('📊 /api/admin/me status:', meResponse.status());
      
      if (meResponse.ok()) {
        const meData = await meResponse.json();
        console.log('✅ Session verification successful:', {
          email: meData.email,
          isAdmin: meData.isAdmin
        });
      } else {
        console.log('❌ Session verification failed');
      }
      
      // Log all network requests for analysis
      console.log('🌐 Network requests:');
      networkRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.method} ${req.url} - ${req.response?.status || 'pending'}`);
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  });
  
  test('test /auth/confirm endpoint directly', async ({ page }) => {
    console.log('=== Testing /auth/confirm endpoint ===');
    
    // Test the /auth/confirm endpoint directly
    const confirmResponse = await page.goto('http://localhost:8080/auth/confirm?token_hash=test&type=email&next=/admin/management');
    
    console.log('📊 /auth/confirm response status:', confirmResponse?.status());
    console.log('📊 /auth/confirm response URL:', confirmResponse?.url());
    
    // Check if it redirects properly
    const finalUrl = page.url();
    console.log('🎯 Final URL after /auth/confirm:', finalUrl);
  });
  
  test('test /auth/callback endpoint directly', async ({ page }) => {
    console.log('=== Testing /auth/callback endpoint ===');
    
    // Test the /auth/callback endpoint directly
    const callbackResponse = await page.goto('http://localhost:8080/auth/callback#access_token=test&refresh_token=test&type=magiclink');
    
    console.log('📊 /auth/callback response status:', callbackResponse?.status());
    console.log('📊 /auth/callback response URL:', callbackResponse?.url());
    
    // Check if it loads properly
    const finalUrl = page.url();
    console.log('🎯 Final URL after /auth/callback:', finalUrl);
  });
});
