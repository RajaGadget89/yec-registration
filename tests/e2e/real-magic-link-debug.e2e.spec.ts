import { test, expect, Page } from '@playwright/test';

/**
 * Real Magic Link Debug Test Suite
 * 
 * This test suite simulates the exact flow that's failing in the browser:
 * 1. User clicks magic link in email
 * 2. Browser opens with "Authenticating..." message
 * 3. Page redirects back to admin login
 */

test.describe('Real Magic Link Authentication Debug', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Enable console logging for debugging
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Enable network request logging
    page.on('request', request => {
      console.log(`[Network Request] ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`[Network Response] ${response.status()} ${response.url()}`);
    });
  });

  test('should debug real magic link authentication flow', async () => {
    console.log('[Test] Starting real magic link authentication debug');
    
    // Step 1: Generate a real magic link
    console.log('[Test] Step 1: Generating magic link');
    const magicLinkResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkData = await magicLinkResponse.json();
    
    console.log('[Test] Magic link data:', magicLinkData);
    
    // Step 2: Navigate to the magic link URL (simulating clicking email link)
    console.log('[Test] Step 2: Navigating to magic link URL');
    const magicLinkUrl = magicLinkData.actionLink;
    console.log('[Test] Magic link URL:', magicLinkUrl);
    
    // Navigate to the magic link URL
    await page.goto(magicLinkUrl);
    
    // Step 3: Wait for the callback page to load
    console.log('[Test] Step 3: Waiting for callback page');
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the callback page
    const currentUrl = page.url();
    console.log('[Test] Current URL after magic link:', currentUrl);
    
    // Step 4: Check if authentication was successful
    console.log('[Test] Step 4: Checking authentication status');
    
    // Wait for either success or error state
    try {
      // Wait for success (redirect to admin)
      await page.waitForURL('**/admin', { timeout: 10000 });
      console.log('[Test] ✅ Successfully redirected to admin page');
      
      // Verify we're authenticated
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name === 'admin-email' || 
        cookie.name === 'sb-access-token' || 
        cookie.name === 'sb-refresh-token'
      );
      
      console.log('[Test] Authentication cookies:', authCookies.map(c => c.name));
      
      if (authCookies.length > 0) {
        console.log('[Test] ✅ Authentication successful - cookies set');
      } else {
        console.log('[Test] ⚠️ No authentication cookies found');
      }
      
    } catch (error) {
      console.log('[Test] ❌ Did not redirect to admin page, checking for errors');
      
      // Check if we're back on login page
      const isOnLoginPage = await page.locator('text=Admin Login').isVisible();
      if (isOnLoginPage) {
        console.log('[Test] ❌ Redirected back to login page - authentication failed');
        
        // Check for error messages
        const errorElements = await page.locator('[class*="error"], [class*="alert"], [class*="failed"]').all();
        for (const element of errorElements) {
          const text = await element.textContent();
          console.log('[Test] Error message found:', text);
        }
      }
      
      // Check if we're on callback page with error
      const isOnCallbackPage = await page.locator('text=Authentication Failed').isVisible();
      if (isOnCallbackPage) {
        console.log('[Test] ❌ On callback page with authentication error');
        
        // Get error message
        const errorMessage = await page.locator('p.text-gray-600').textContent();
        console.log('[Test] Error message:', errorMessage);
      }
    }
  });

  test('should test direct callback URL with real tokens', async () => {
    console.log('[Test] Testing direct callback URL with real tokens');
    
    // First, get a magic link to extract the tokens
    const magicLinkResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkData = await magicLinkResponse.json();
    
    // Extract the token from the magic link URL
    const magicLinkUrl = new URL(magicLinkData.actionLink);
    const token = magicLinkUrl.searchParams.get('token');
    
    console.log('[Test] Extracted token:', token?.substring(0, 20) + '...');
    
    // Now simulate the Supabase verification by calling the verification URL directly
    const verificationUrl = `https://nuxahfrelvfvsmhzvxqm.supabase.co/auth/v1/verify?token=${token}&type=magiclink&redirect_to=http://localhost:8080/auth/callback`;
    
    console.log('[Test] Verification URL:', verificationUrl);
    
    // Navigate to the verification URL
    await page.goto(verificationUrl);
    
    // Wait for the callback page
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('[Test] Current URL after verification:', currentUrl);
    
    // Check if we have tokens in the URL hash
    const hash = await page.evaluate(() => window.location.hash);
    console.log('[Test] URL hash:', hash);
    
    if (hash.includes('access_token=')) {
      console.log('[Test] ✅ Tokens found in URL hash');
      
      // Wait for the callback page to process the tokens
      await page.waitForTimeout(3000);
      
      // Check if we're redirected to admin
      const finalUrl = page.url();
      console.log('[Test] Final URL:', finalUrl);
      
      if (finalUrl.includes('/admin')) {
        console.log('[Test] ✅ Successfully authenticated and redirected to admin');
      } else {
        console.log('[Test] ❌ Not redirected to admin page');
      }
    } else {
      console.log('[Test] ❌ No tokens found in URL hash');
    }
  });

  test('should debug callback page processing', async () => {
    console.log('[Test] Debugging callback page processing');
    
    // Create a mock callback URL with tokens (simulating what Supabase would create)
    const mockCallbackUrl = 'http://localhost:8080/auth/callback#access_token=mock_access_token&refresh_token=mock_refresh_token&token_type=bearer&type=magiclink';
    
    console.log('[Test] Navigating to mock callback URL:', mockCallbackUrl);
    
    // Navigate to the callback page
    await page.goto(mockCallbackUrl);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the callback page
    const isOnCallbackPage = await page.locator('text=Processing Authentication').isVisible();
    console.log('[Test] On callback page:', isOnCallbackPage);
    
    if (isOnCallbackPage) {
      console.log('[Test] ✅ Callback page loaded correctly');
      
      // Wait for processing to complete
      await page.waitForTimeout(5000);
      
      // Check the final state
      const finalUrl = page.url();
      console.log('[Test] Final URL after processing:', finalUrl);
      
      // Check for success or error state
      const hasSuccess = await page.locator('text=Authentication Successful').isVisible();
      const hasError = await page.locator('text=Authentication Failed').isVisible();
      
      if (hasSuccess) {
        console.log('[Test] ✅ Authentication successful');
      } else if (hasError) {
        console.log('[Test] ❌ Authentication failed');
        const errorMessage = await page.locator('p.text-gray-600').textContent();
        console.log('[Test] Error message:', errorMessage);
      } else {
        console.log('[Test] ⚠️ Still processing or unknown state');
      }
    } else {
      console.log('[Test] ❌ Callback page not loaded correctly');
    }
  });

  test('should test API callback endpoint directly', async () => {
    console.log('[Test] Testing API callback endpoint directly');
    
    // Test the API callback endpoint with mock tokens
    const response = await page.request.post('http://localhost:8080/api/auth/callback', {
      data: {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        next: '/admin'
      }
    });
    
    console.log('[Test] API response status:', response.status());
    console.log('[Test] API response headers:', response.headers());
    
    if (response.status() === 303) {
      const location = response.headers()['location'];
      console.log('[Test] ✅ Redirect response with location:', location);
    } else {
      const responseText = await response.text();
      console.log('[Test] ❌ Unexpected response:', responseText);
    }
  });
});

