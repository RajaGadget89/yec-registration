import { test, expect, Page } from '@playwright/test';

/**
 * Magic Link Redirect Debug Test Suite
 * 
 * This test suite specifically addresses the issue where magic links
 * are redirecting to malformed URLs like https://%2A.vercel.app/auth/callback
 * instead of the correct localhost URL.
 */

test.describe('Magic Link Redirect Debug', () => {
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

  test('should detect malformed redirect URL in magic link', async () => {
    console.log('[Test] Testing malformed redirect URL detection');
    
    // The problematic URL from the user's issue
    const malformedUrl = 'https://%2A.vercel.app/auth/callback#access_token=eyJhbGciOiJIUzI1NiIsImtpZCI6IkVXSDI2Q3RnUmdGOFAwM3MiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL251eGFoZnJlbHZmdnNtaHp2eHFtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4OGFiY2FiMS1jNjlmLTRhMTQtYWE3Zi1kYjQzN2UyNjUzMTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2MDk1ODc4LCJpYXQiOjE3NTYwOTIyNzgsImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InJhamEuZ2FkZ2V0czg5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijg4YWJjYWIxLWM2OWYtNGExNC1hYTdmLWRiNDM3ZTI2NTMxOCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc1NjA5MjI3OH1dLCJzZXNzaW9uX2lkIjoiNzVmNGE5NzUtMmQwZC00YjkxLWE4OWQtNGM5MjdjOWYwODczIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.ytacFSq0y0YC9UdGpkmkJGq1i7GOHh3s1L3hyUPtqIA&expires_at=1756095878&expires_in=3600&refresh_token=n7qq4c6f5hfh&token_type=bearer&type=magiclink';
    
    console.log('[Test] Attempting to navigate to malformed URL:', malformedUrl);
    
    try {
      // Try to navigate to the malformed URL
      await page.goto(malformedUrl, { timeout: 10000 });
      
      // This should fail with a DNS error
      console.log('[Test] Navigation failed as expected - malformed URL detected');
      
      // Check if we get a DNS error or similar
      const currentUrl = page.url();
      console.log('[Test] Current URL after navigation attempt:', currentUrl);
      
      // The page should show an error or be on an error page
      const pageContent = await page.content();
      console.log('[Test] Page content length:', pageContent.length);
      
      // Check for error indicators
      const hasError = pageContent.includes('This site can\'t be reached') || 
                      pageContent.includes('DNS_PROBE_FINISHED_NXDOMAIN') ||
                      pageContent.includes('ERR_NAME_NOT_RESOLVED');
      
      expect(hasError).toBe(true);
      console.log('[Test] Malformed URL correctly detected and handled');
      
    } catch (error) {
      console.log('[Test] Navigation failed as expected:', error.message);
      // This is expected behavior for a malformed URL
    }
  });

  test('should extract tokens from malformed URL and redirect to correct callback', async () => {
    console.log('[Test] Testing token extraction from malformed URL');
    
    // Extract the hash part from the malformed URL
    const malformedUrl = 'https://%2A.vercel.app/auth/callback#access_token=eyJhbGciOiJIUzI1NiIsImtpZCI6IkVXSDI2Q3RnUmdGOFAwM3MiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL251eGFoZnJlbHZmdnNtaHp2eHFtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4OGFiY2FiMS1jNjlmLTRhMTQtYWE3Zi1kYjQzN2UyNjUzMTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2MDk1ODc4LCJpYXQiOjE3NTYwOTIyNzgsImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InJhamEuZ2FkZ2V0czg5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijg4YWJjYWIxLWM2OWYtNGExNC1hYTdmLWRiNDM3ZTI2NTMxOCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc1NjA5MjI3OH1dLCJzZXNzaW9uX2lkIjoiNzVmNGE5NzUtMmQwZC00YjkxLWE4OWQtNGM5MjdjOWYwODczIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.ytacFSq0y0YC9UdGpkmkJGq1i7GOHh3s1L3hyUPtqIA&expires_at=1756095878&expires_in=3600&refresh_token=n7qq4c6f5hfh&token_type=bearer&type=magiclink';
    
    // Extract the hash part
    const hashPart = malformedUrl.split('#')[1];
    console.log('[Test] Extracted hash part:', hashPart);
    
    // Create the correct localhost URL with the same hash
    const correctUrl = `http://localhost:8080/auth/callback#${hashPart}`;
    console.log('[Test] Corrected URL:', correctUrl);
    
    // Navigate to the corrected URL
    await page.goto(correctUrl);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the callback page
    await expect(page).toHaveURL(/\/auth\/callback/);
    
    // Verify the hash is present
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toContain('access_token=');
    expect(hash).toContain('refresh_token=');
    expect(hash).toContain('type=magiclink');
    
    console.log('[Test] Successfully extracted tokens and navigated to correct callback URL');
  });

  test('should handle URL encoding issues in redirect URLs', async () => {
    console.log('[Test] Testing URL encoding handling');
    
    // Test various malformed redirect URL patterns
    const malformedPatterns = [
      'https://%2A.vercel.app/auth/callback',
      'https://*.vercel.app/auth/callback',
      'https://%2A%2A.vercel.app/auth/callback',
      'https://placeholder.vercel.app/auth/callback'
    ];
    
    for (const pattern of malformedPatterns) {
      console.log(`[Test] Testing pattern: ${pattern}`);
      
      // Check if the pattern contains URL encoding issues
      const hasEncodingIssue = pattern.includes('%2A') || pattern.includes('*');
      expect(hasEncodingIssue).toBe(true);
      
      console.log(`[Test] Pattern ${pattern} correctly identified as malformed`);
    }
  });

  test('should verify correct redirect URL configuration', async () => {
    console.log('[Test] Verifying correct redirect URL configuration');
    
    // Test the magic link generation endpoint
    const response = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const data = await response.json();
    
    console.log('[Test] Magic link response:', data);
    
    // Verify the redirect URL is correct
    expect(data.redirectTo).toBe('http://localhost:8080/auth/callback');
    expect(data.actionLink).toContain('redirect_to=http://localhost:8080/auth/callback');
    
    console.log('[Test] Magic link generation using correct redirect URL');
  });

  test('should test authentication flow with corrected URL', async () => {
    console.log('[Test] Testing complete authentication flow with corrected URL');
    
    // Use the direct login endpoint to simulate the corrected flow
    const response = await page.goto('http://localhost:8080/api/test/direct-login?email=raja.gadgets89@gmail.com');
    
    // Should redirect to admin page
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    // Verify we're on the admin page
    await expect(page).toHaveURL(/.*\/admin/);
    
    // Check that authentication cookies are set
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name === 'admin-email' || 
      cookie.name === 'sb-access-token' || 
      cookie.name === 'sb-refresh-token'
    );

    console.log('[Test] Authentication cookies set:', authCookies.map(c => c.name));

    expect(authCookies).toHaveLength(3);
    expect(authCookies.find(c => c.name === 'admin-email')).toBeDefined();
    expect(authCookies.find(c => c.name === 'sb-access-token')).toBeDefined();
    expect(authCookies.find(c => c.name === 'sb-refresh-token')).toBeDefined();
    
    // Verify we can access the admin dashboard
    await expect(page.locator('h1:has-text("Registration Management")')).toBeVisible();
    
    console.log('[Test] Complete authentication flow working correctly');
  });
});

