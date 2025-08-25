import { test, expect, Page } from '@playwright/test';

/**
 * Complete Magic Link Authentication Scenario Test
 * 
 * This test captures the FULL real-world scenario including:
 * 1. Rate limiting/cooldown issues
 * 2. Token expiration
 * 3. Session establishment
 * 4. Error handling
 * 5. User experience flow
 */

test.describe('Complete Magic Link Authentication Scenario', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Enable comprehensive logging
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    page.on('request', request => {
      console.log(`[Network Request] ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`[Network Response] ${response.status()} ${response.url()}`);
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });

    // Listen for request failures
    page.on('requestfailed', request => {
      console.log(`[Request Failed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('should capture complete magic link authentication flow with all scenarios', async () => {
    console.log('[Test] 🚀 Starting complete magic link authentication scenario test');
    
    // Step 1: Navigate to admin login page
    console.log('[Test] Step 1: Navigating to admin login page');
    await page.goto('http://localhost:8080/admin/login');
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/admin\/login/);
    await expect(page.locator('text=Admin Login')).toBeVisible();
    
    console.log('[Test] ✅ Successfully loaded admin login page');
    
    // Step 2: Check current authentication status
    console.log('[Test] Step 2: Checking current authentication status');
    const authStatus = await page.locator('text=Not Authenticated').isVisible();
    console.log('[Test] Authentication status - Not Authenticated:', authStatus);
    
    // Step 3: Fill in email and attempt magic link
    console.log('[Test] Step 3: Attempting magic link authentication');
    
    // Fill in email
    await page.fill('input[type="email"]', 'raja.gadgets89@gmail.com');
    
    // Click send magic link button
    await page.click('button:has-text("Send Magic Link")');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check for success message
    const successMessage = await page.locator('text=Magic link sent! Check your email.').isVisible();
    console.log('[Test] Magic link sent successfully:', successMessage);
    
    if (!successMessage) {
      // Check for rate limiting error
      const rateLimitError = await page.locator('text=For security purposes, you can only request this after').isVisible();
      if (rateLimitError) {
        console.log('[Test] ⚠️ Rate limiting detected - waiting for cooldown');
        
        // Wait for cooldown period (usually 60 seconds)
        console.log('[Test] Waiting 60 seconds for rate limit cooldown...');
        await page.waitForTimeout(60000);
        
        // Try again
        console.log('[Test] Retrying magic link request after cooldown');
        await page.click('button:has-text("Send Magic Link")');
        await page.waitForTimeout(2000);
        
        const retrySuccess = await page.locator('text=Magic link sent! Check your email.').isVisible();
        console.log('[Test] Magic link sent after cooldown:', retrySuccess);
      }
    }
    
    // Step 4: Generate magic link via API for testing
    console.log('[Test] Step 4: Generating magic link via API for testing');
    const magicLinkResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkData = await magicLinkResponse.json();
    
    console.log('[Test] Magic link API response:', {
      ok: magicLinkData.ok,
      hasActionLink: !!magicLinkData.actionLink,
      redirectTo: magicLinkData.redirectTo,
      email: magicLinkData.email
    });
    
    // Step 5: Test the magic link URL directly
    console.log('[Test] Step 5: Testing magic link URL directly');
    const magicLinkUrl = magicLinkData.actionLink;
    console.log('[Test] Magic link URL:', magicLinkUrl);
    
    // Navigate to the magic link URL
    await page.goto(magicLinkUrl);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check current URL
    const currentUrl = page.url();
    console.log('[Test] Current URL after magic link:', currentUrl);
    
    // Step 6: Analyze the callback page
    console.log('[Test] Step 6: Analyzing callback page');
    
    // Check if we're on the callback page
    const isOnCallbackPage = await page.locator('text=Processing Authentication').isVisible();
    console.log('[Test] On callback page:', isOnCallbackPage);
    
    if (isOnCallbackPage) {
      console.log('[Test] ✅ Callback page loaded correctly');
      
      // Wait for processing to complete
      console.log('[Test] Waiting for authentication processing...');
      await page.waitForTimeout(10000);
      
      // Check final state
      const finalUrl = page.url();
      console.log('[Test] Final URL after processing:', finalUrl);
      
      // Check for success or error states
      const hasSuccess = await page.locator('text=Authentication Successful').isVisible();
      const hasError = await page.locator('text=Authentication Failed').isVisible();
      const isOnAdminPage = finalUrl.includes('/admin') && !finalUrl.includes('/login');
      const isOnLoginPage = finalUrl.includes('/login');
      
      console.log('[Test] Final state analysis:', {
        hasSuccess,
        hasError,
        isOnAdminPage,
        isOnLoginPage,
        finalUrl
      });
      
      // Step 7: Check authentication cookies
      console.log('[Test] Step 7: Checking authentication cookies');
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name === 'admin-email' || 
        cookie.name === 'sb-access-token' || 
        cookie.name === 'sb-refresh-token' ||
        cookie.name.includes('supabase')
      );
      
      console.log('[Test] Authentication cookies found:', authCookies.map(c => ({
        name: c.name,
        value: c.value?.substring(0, 20) + '...',
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure
      })));
      
      // Step 8: Test admin dashboard access
      console.log('[Test] Step 8: Testing admin dashboard access');
      
      if (isOnAdminPage) {
        console.log('[Test] ✅ Successfully on admin page');
        
        // Check for admin dashboard content
        const hasAdminContent = await page.locator('text=Registration Management').isVisible();
        console.log('[Test] Admin dashboard content visible:', hasAdminContent);
        
        // Test authentication status API
        const whoamiResponse = await page.request.get('http://localhost:8080/api/whoami');
        const whoamiData = await whoamiResponse.json();
        console.log('[Test] Whoami API response:', whoamiData);
        
      } else if (isOnLoginPage) {
        console.log('[Test] ❌ Redirected back to login page');
        
        // Check for error messages
        const errorMessages = await page.locator('[class*="error"], [class*="alert"], [class*="failed"]').all();
        for (const element of errorMessages) {
          const text = await element.textContent();
          console.log('[Test] Error message found:', text);
        }
        
        // Check authentication status
        const whoamiResponse = await page.request.get('http://localhost:8080/api/whoami');
        const whoamiData = await whoamiResponse.json();
        console.log('[Test] Whoami API response (after failure):', whoamiData);
        
      } else {
        console.log('[Test] ⚠️ Unknown final state');
      }
      
    } else {
      console.log('[Test] ❌ Callback page not loaded correctly');
      
      // Check for error states
      const hasError = await page.locator('text=Authentication Failed').isVisible();
      const hasExpiredError = await page.locator('text=expired').isVisible();
      const hasInvalidError = await page.locator('text=invalid').isVisible();
      
      console.log('[Test] Error states:', {
        hasError,
        hasExpiredError,
        hasInvalidError
      });
      
      // Get page content for debugging
      const pageContent = await page.content();
      console.log('[Test] Page content length:', pageContent.length);
      
      // Check for specific error patterns
      if (pageContent.includes('expired')) {
        console.log('[Test] ❌ Token expired error detected');
      }
      if (pageContent.includes('invalid')) {
        console.log('[Test] ❌ Invalid token error detected');
      }
      if (pageContent.includes('rate limit')) {
        console.log('[Test] ❌ Rate limiting error detected');
      }
    }
    
    // Step 9: Test direct login as fallback
    console.log('[Test] Step 9: Testing direct login as fallback');
    const directLoginResponse = await page.request.get('http://localhost:8080/api/test/direct-login?email=raja.gadgets89@gmail.com');
    console.log('[Test] Direct login response status:', directLoginResponse.status());
    
    if (directLoginResponse.status() === 200) {
      console.log('[Test] ✅ Direct login successful');
      
      // Navigate to admin page
      await page.goto('http://localhost:8080/admin');
      await page.waitForLoadState('networkidle');
      
      const adminUrl = page.url();
      console.log('[Test] Admin page URL after direct login:', adminUrl);
      
      const isOnAdmin = adminUrl.includes('/admin') && !adminUrl.includes('/login');
      console.log('[Test] Successfully on admin page after direct login:', isOnAdmin);
      
    } else {
      console.log('[Test] ❌ Direct login failed');
    }
    
    console.log('[Test] 🏁 Complete magic link authentication scenario test finished');
  });

  test('should test rate limiting and cooldown scenarios', async () => {
    console.log('[Test] 🚀 Testing rate limiting and cooldown scenarios');
    
    // Navigate to login page
    await page.goto('http://localhost:8080/admin/login');
    
    // Fill email
    await page.fill('input[type="email"]', 'raja.gadgets89@gmail.com');
    
    // Send multiple magic links quickly to trigger rate limiting
    console.log('[Test] Sending multiple magic links to trigger rate limiting...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`[Test] Attempt ${i}: Sending magic link`);
      await page.click('button:has-text("Send Magic Link")');
      await page.waitForTimeout(1000);
      
      // Check for rate limiting error
      const rateLimitError = await page.locator('text=For security purposes, you can only request this after').isVisible();
      if (rateLimitError) {
        console.log(`[Test] ⚠️ Rate limiting triggered on attempt ${i}`);
        break;
      }
    }
    
    // Wait and try again
    console.log('[Test] Waiting 60 seconds for rate limit cooldown...');
    await page.waitForTimeout(60000);
    
    console.log('[Test] Retrying after cooldown...');
    await page.click('button:has-text("Send Magic Link")');
    await page.waitForTimeout(2000);
    
    const successAfterCooldown = await page.locator('text=Magic link sent! Check your email.').isVisible();
    console.log('[Test] Success after cooldown:', successAfterCooldown);
  });

  test('should test token expiration scenarios', async () => {
    console.log('[Test] 🚀 Testing token expiration scenarios');
    
    // Generate a magic link
    const magicLinkResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkData = await magicLinkResponse.json();
    
    console.log('[Test] Generated magic link:', magicLinkData.actionLink);
    
    // Wait for token to potentially expire
    console.log('[Test] Waiting 30 seconds to test token expiration...');
    await page.waitForTimeout(30000);
    
    // Try to use the magic link
    await page.goto(magicLinkData.actionLink);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('[Test] URL after delayed magic link usage:', currentUrl);
    
    // Check for expiration error
    const hasExpiredError = await page.locator('text=expired').isVisible();
    const hasInvalidError = await page.locator('text=invalid').isVisible();
    
    console.log('[Test] Token expiration test results:', {
      hasExpiredError,
      hasInvalidError,
      currentUrl
    });
  });

  test('should test complete user journey simulation', async () => {
    console.log('[Test] 🚀 Testing complete user journey simulation');
    
    // Simulate a real user's journey
    console.log('[Test] Step 1: User visits admin login page');
    await page.goto('http://localhost:8080/admin/login');
    
    console.log('[Test] Step 2: User enters email');
    await page.fill('input[type="email"]', 'raja.gadgets89@gmail.com');
    
    console.log('[Test] Step 3: User clicks send magic link');
    await page.click('button:has-text("Send Magic Link")');
    
    console.log('[Test] Step 4: User waits for email');
    await page.waitForTimeout(5000);
    
    console.log('[Test] Step 5: User clicks magic link from email (simulated)');
    const magicLinkResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkData = await magicLinkResponse.json();
    
    await page.goto(magicLinkData.actionLink);
    
    console.log('[Test] Step 6: User sees authentication processing');
    await page.waitForLoadState('networkidle');
    
    console.log('[Test] Step 7: User waits for completion');
    await page.waitForTimeout(10000);
    
    const finalUrl = page.url();
    console.log('[Test] Final URL in user journey:', finalUrl);
    
    const isSuccess = finalUrl.includes('/admin') && !finalUrl.includes('/login');
    console.log('[Test] User journey success:', isSuccess);
    
    if (isSuccess) {
      console.log('[Test] ✅ User successfully authenticated and reached admin dashboard');
    } else {
      console.log('[Test] ❌ User journey failed - redirected to login or error page');
    }
  });
});

