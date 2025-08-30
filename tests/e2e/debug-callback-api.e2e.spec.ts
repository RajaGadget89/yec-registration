import { test, expect } from '@playwright/test';

test.describe('Debug Callback API', () => {
  test('should debug the callback API error', async ({ page }) => {
    console.log('🔍 Starting callback API debug test...');
    
    // Step 1: Generate a real magic link
    console.log('📧 Generating magic link...');
    const magicLinkResponse = await page.request.get(
      'http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com'
    );
    
    const magicLinkData = await magicLinkResponse.json();
    console.log('Magic link response:', magicLinkData);
    
    if (!magicLinkData.ok || !magicLinkData.actionLink) {
      console.error('❌ Failed to generate magic link');
      return;
    }
    
    // Step 2: Extract tokens from the magic link
    const magicLinkUrl = new URL(magicLinkData.actionLink);
    const token = magicLinkUrl.searchParams.get('token');
    
    console.log('Token extracted:', token ? 'Present' : 'Missing');
    
    // Step 3: Simulate the magic link click to get real tokens
    console.log('🖱️ Simulating magic link click...');
    await page.goto(magicLinkData.actionLink);
    
    // Wait for redirect to callback page
    await page.waitForURL('**/auth/callback**');
    
    // Get the current URL to extract tokens
    const callbackUrl = page.url();
    console.log('Callback URL:', callbackUrl);
    
    // Extract tokens from URL hash
    const hash = await page.evaluate(() => window.location.hash);
    console.log('URL Hash:', hash);
    
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    console.log('Tokens extracted:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });
    
    if (!accessToken || !refreshToken) {
      console.error('❌ No tokens found in URL hash');
      return;
    }
    
    // Step 4: Test the callback API with real tokens
    console.log('🔧 Testing callback API with real tokens...');
    const callbackResponse = await page.request.post(
      'http://localhost:8080/api/auth/callback',
      {
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          next: '/admin'
        }
      }
    );
    
    console.log('Callback API response status:', callbackResponse.status());
    console.log('Callback API response headers:', callbackResponse.headers());
    
    const responseText = await callbackResponse.text();
    console.log('Callback API response body:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Callback API response JSON:', responseJson);
    } catch (e) {
      console.log('Response is not JSON:', responseText);
    }
    
    // Step 5: Check if we got redirected
    if (callbackResponse.status() === 303) {
      const location = callbackResponse.headers()['location'];
      console.log('✅ Got redirect to:', location);
    } else {
      console.log('❌ No redirect received, status:', callbackResponse.status());
    }
    
    // Step 6: Take a screenshot
    await page.screenshot({ path: 'test-artifacts/debug-callback-api.png' });
    
    console.log('📊 Debug test completed.');
  });
});
