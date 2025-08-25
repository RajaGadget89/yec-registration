import { test, expect, Page } from '@playwright/test';

/**
 * Real Email Magic Link Test
 * 
 * This test simulates the EXACT scenario when a user clicks a magic link from their email.
 * It will capture the malformed redirect URL issue and show what's really happening.
 */

test.describe('Real Email Magic Link Flow', () => {
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

    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });

    page.on('requestfailed', request => {
      console.log(`[Request Failed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('should simulate clicking magic link from email and capture real issues', async () => {
    console.log('[Test] 🚀 Starting REAL email magic link simulation');
    
    // Step 1: Generate a magic link (simulating what Supabase sends in email)
    console.log('[Test] Step 1: Generating magic link via Supabase API');
    
    const magicLinkResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkData = await magicLinkResponse.json();
    
    console.log('[Test] Generated magic link:', magicLinkData.actionLink);
    
    // Step 2: Click the magic link (simulating user clicking from email)
    console.log('[Test] Step 2: Clicking magic link from email (simulated)');
    console.log('[Test] This simulates exactly what happens when you click the link from your email');
    
    // Navigate to the magic link URL
    await page.goto(magicLinkData.actionLink);
    
    // Wait for any redirects to complete
    await page.waitForLoadState('networkidle');
    
    // Step 3: Analyze what actually happened
    console.log('[Test] Step 3: Analyzing the real flow');
    
    const currentUrl = page.url();
    console.log('[Test] Current URL after clicking magic link:', currentUrl);
    
    // Check if we got redirected to the malformed URL
    if (currentUrl.includes('%2A.vercel.app')) {
      console.log('[Test] ❌ MALFORMED URL DETECTED!');
      console.log('[Test] The magic link redirected to a malformed URL with %2A (encoded *)');
      console.log('[Test] This is causing the DNS resolution failure you experienced');
      
      // Try to navigate to the malformed URL to see the error
      try {
        await page.goto(currentUrl);
        await page.waitForLoadState('networkidle');
        
        const errorPageUrl = page.url();
        console.log('[Test] Error page URL:', errorPageUrl);
        
        // Check for DNS error
        const pageContent = await page.content();
        if (pageContent.includes('DNS_PROBE_FINISHED_NXDOMAIN') || 
            pageContent.includes("This site can't be reached") ||
            pageContent.includes('Check if there is a typo')) {
          console.log('[Test] ❌ DNS RESOLUTION FAILURE CONFIRMED');
          console.log('[Test] This matches exactly what you experienced in your browser');
        }
        
      } catch (error) {
        console.log('[Test] ❌ Navigation to malformed URL failed:', error.message);
      }
      
    } else if (currentUrl.includes('localhost:8080/auth/callback')) {
      console.log('[Test] ✅ Correct redirect to localhost callback');
      
      // Check if we're on the callback page
      const isOnCallbackPage = await page.locator('text=Processing Authentication').isVisible();
      console.log('[Test] On callback page:', isOnCallbackPage);
      
      if (isOnCallbackPage) {
        console.log('[Test] ✅ Callback page loaded correctly');
        
        // Wait for processing
        await page.waitForTimeout(10000);
        
        const finalUrl = page.url();
        console.log('[Test] Final URL after processing:', finalUrl);
        
        const isOnAdminPage = finalUrl.includes('/admin') && !finalUrl.includes('/login');
        console.log('[Test] Successfully on admin page:', isOnAdminPage);
        
      } else {
        console.log('[Test] ❌ Callback page not loaded');
      }
      
    } else {
      console.log('[Test] ⚠️ Unexpected redirect URL:', currentUrl);
    }
    
    // Step 4: Test the exact URL from your screenshot
    console.log('[Test] Step 4: Testing the exact malformed URL from your screenshot');
    
    const malformedUrl = 'https://%2A.vercel.app/auth/callback#access_token=eyJhbGciOiJIUzI1NiIsImtpZCI6IkVXSDI2Q3RnUmdGOFAwM3MiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL251eGFoZnJlbHZmdnNtaHp2eHFtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4OGFiY2FiMS1jNjlmLTRhMTQtYWE3Zi1kYjQzN2UyNjUzMTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2MDk1ODc4LCJpYXQiOjE3NTYwOTIyNzgsImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InJhamEuZ2FkZ2V0czg5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijg4YWJjYWIxLWM2OWYtNGExNC1hYTdmLWRiNDM3ZTI2NTMxOCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc1NjA5MjI3OH1dLCJzZXNzaW9uX2lkIjoiNzVmNGE5NzUtMmQwZC00YjkxLWE4OWQtNGM5MjdjOWYwODczIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.ytacFSq0y0YC9UdGpkmkJGq1i7GOHh3s1L3hyUPtqIA&expires_at=1756095878&expires_in=3600&refresh_token=n7qq4c6f5hfh&token_type=bearer&type=magiclink';
    
    try {
      await page.goto(malformedUrl);
      await page.waitForLoadState('networkidle');
      
      const errorPageUrl = page.url();
      console.log('[Test] Malformed URL result:', errorPageUrl);
      
      // Check for DNS error
      const pageContent = await page.content();
      if (pageContent.includes('DNS_PROBE_FINISHED_NXDOMAIN') || 
          pageContent.includes("This site can't be reached")) {
        console.log('[Test] ❌ CONFIRMED: Malformed URL causes DNS resolution failure');
        console.log('[Test] This is exactly what you experienced!');
      }
      
    } catch (error) {
      console.log('[Test] ❌ Malformed URL navigation failed:', error.message);
    }
    
    console.log('[Test] 🏁 Real email magic link simulation completed');
  });

  test('should test what happens when Supabase redirects to wrong URL', async () => {
    console.log('[Test] 🚀 Testing Supabase redirect behavior');
    
    // This test simulates what happens when Supabase has the wrong redirect URL configured
    console.log('[Test] Simulating Supabase with malformed redirect URL configuration');
    
    // Generate magic link
    const magicLinkResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkData = await magicLinkResponse.json();
    
    console.log('[Test] Magic link from API:', magicLinkData.actionLink);
    
    // Check if the redirect_to parameter is correct
    const url = new URL(magicLinkData.actionLink);
    const redirectTo = url.searchParams.get('redirect_to');
    
    console.log('[Test] Redirect_to parameter:', redirectTo);
    
    if (redirectTo === 'http://localhost:8080/auth/callback') {
      console.log('[Test] ✅ Redirect_to parameter is correct');
    } else {
      console.log('[Test] ❌ Redirect_to parameter is wrong:', redirectTo);
    }
    
    // Navigate to the magic link
    await page.goto(magicLinkData.actionLink);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('[Test] URL after Supabase redirect:', currentUrl);
    
    // Analyze the result
    if (currentUrl.includes('%2A.vercel.app')) {
      console.log('[Test] ❌ PROBLEM: Supabase is redirecting to malformed URL');
      console.log('[Test] This means your Supabase project has the wrong redirect URL configured');
    } else if (currentUrl.includes('localhost:8080/auth/callback')) {
      console.log('[Test] ✅ GOOD: Supabase is redirecting to correct URL');
    } else {
      console.log('[Test] ⚠️ UNEXPECTED: Supabase redirected to:', currentUrl);
    }
  });
});

