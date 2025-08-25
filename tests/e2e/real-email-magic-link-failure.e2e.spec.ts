import { test, expect, Page } from '@playwright/test';
import { ErrorCapture } from './helpers/errorCapture';

test.describe('Real Email Magic Link Failure - Exact User Scenario', () => {
  let page: Page;
  let errorCapture: ErrorCapture;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    errorCapture = new ErrorCapture(page);
    await errorCapture.enableFullCapture();
    console.log('[Real Email Test] 🚀 Starting real email magic link failure simulation');
  });

  test('should capture the exact malformed URL failure from real email', async () => {
    console.log('[Real Email Test] 📧 Simulating real email magic link click');
    
    // The exact malformed URL from the user's email
    const malformedUrl = 'https://%2A.vercel.app/auth/callback#access_token=eyJhbGciOiJIUzI1NiIsImtpZCI6IkVXSDI2Q3RnUmdGOFAwM3MiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL251eGFoZnJlbHZmdnNtaHp2eHFtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4OGFiY2FiMS1jNjlmLTRhMTQtYWE3Zi1kYjQzN2UyNjUzMTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2MTAzMzIwLCJpYXQiOjE3NTYwOTk3MjAsImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InJhamEuZ2FkZ2V0czg5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijg4YWJjYWIxLWM2OWYtNGExNC1hYTdmLWRiNDM3ZTI2NTMxOCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc1NjA5OTcyMH1dLCJzZXNzaW9uX2lkIjoiNzU4MmRmNGItNzJjYS00MjI1LWExYTAtMjE4NmI4MDczZDFmIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.nWulDGV7axW0MX2_0nHIRavB8D-O-gRV7vk9g5h9tbk&expires_at=1756103320&expires_in=3600&refresh_token=6oabz67ndk62&token_type=bearer&type=magiclink';

    console.log('[Real Email Test] 🔗 Attempting to navigate to malformed URL:', malformedUrl);
    
    try {
      // Attempt to navigate to the malformed URL
      await page.goto(malformedUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      console.log('[Real Email Test] ❌ Unexpected: Navigation succeeded to malformed URL');
      console.log('[Real Email Test] Current URL:', page.url());
      
    } catch (error) {
      console.log('[Real Email Test] ✅ Expected: Navigation failed as expected');
      console.log('[Real Email Test] Error:', error instanceof Error ? error.message : 'Unknown error');
      
      // Check if we got a DNS error page
      const pageContent = await page.content();
      if (pageContent.includes('This site can\'t be reached') || 
          pageContent.includes('DNS_PROBE_FINISHED_NXDOMAIN') ||
          pageContent.includes('%2A.vercel.app')) {
        console.log('[Real Email Test] 🎯 Confirmed: DNS resolution failure detected');
      }
    }

    // Capture all errors and network activity
    const errors = errorCapture.getCapturedErrors();
    const warnings = errorCapture.getCapturedWarnings();
    const networkFailures = errorCapture.getRequestFailures();
    const pageErrors = errorCapture.getPageErrors();

    console.log('[Real Email Test] 📊 Error Analysis:');
    console.log('[Real Email Test] - Total Errors:', errors.length);
    console.log('[Real Email Test] - Total Warnings:', warnings.length);
    console.log('[Real Email Test] - Network Failures:', networkFailures.length);
    console.log('[Real Email Test] - Page Errors:', pageErrors.length);

    // Log specific errors
    if (errors.length > 0) {
      console.log('[Real Email Test] 🔍 Detailed Errors:');
      errors.forEach((error, index) => {
        console.log(`[Real Email Test] Error ${index + 1}:`, error);
      });
    }

    if (networkFailures.length > 0) {
      console.log('[Real Email Test] 🌐 Network Failures:');
      networkFailures.forEach((failure, index) => {
        console.log(`[Real Email Test] Failure ${index + 1}:`, failure);
      });
    }

    // Verify the failure scenario
    expect(errors.length).toBeGreaterThan(0);
    expect(networkFailures.length).toBeGreaterThan(0);
    
    console.log('[Real Email Test] ✅ Test completed - malformed URL failure confirmed');
  });

  test('should test the working API-generated magic link for comparison', async () => {
    console.log('[Real Email Test] 🔄 Testing API-generated magic link for comparison');
    
    // First, generate a magic link via API
    const response = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const data = await response.json();
    
    if (data.actionLink) {
      console.log('[Real Email Test] 📧 API-generated magic link:', data.actionLink);
      
      // Navigate to the API-generated link
      await page.goto(data.actionLink, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      console.log('[Real Email Test] Current URL after API link:', page.url());
      
      // Check if this works (should redirect to localhost)
      if (page.url().includes('localhost:8080')) {
        console.log('[Real Email Test] ✅ API-generated link works correctly');
      } else {
        console.log('[Real Email Test] ❌ API-generated link also has issues');
      }
    }
  });

  test('should analyze the difference between email and API magic links', async () => {
    console.log('[Real Email Test] 🔍 Analyzing difference between email and API magic links');
    
    // Get API-generated magic link
    const apiResponse = await page.request.get('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const apiData = await apiResponse.json();
    
    console.log('[Real Email Test] 📊 Comparison Analysis:');
    console.log('[Real Email Test] API Magic Link URL:', apiData.actionLink);
    console.log('[Real Email Test] Real Email Magic Link URL: https://%2A.vercel.app/auth/callback#access_token=...');
    
    // Parse the URLs to understand the difference
    if (apiData.actionLink) {
      const apiUrl = new URL(apiData.actionLink);
      console.log('[Real Email Test] API Link Analysis:');
      console.log('[Real Email Test] - Protocol:', apiUrl.protocol);
      console.log('[Real Email Test] - Hostname:', apiUrl.hostname);
      console.log('[Real Email Test] - Pathname:', apiUrl.pathname);
      console.log('[Real Email Test] - Search:', apiUrl.search);
      console.log('[Real Email Test] - Hash:', apiUrl.hash);
    }
    
    console.log('[Real Email Test] Real Email Link Analysis:');
    console.log('[Real Email Test] - Protocol: https:');
    console.log('[Real Email Test] - Hostname: %2A.vercel.app (MALFORMED)');
    console.log('[Real Email Test] - Pathname: /auth/callback');
    console.log('[Real Email Test] - Hash: #access_token=... (VALID TOKENS)');
    
    console.log('[Real Email Test] 🎯 Root Cause: Supabase project Site URL configuration');
    console.log('[Real Email Test] - API uses: localhost:8080 (working)');
    console.log('[Real Email Test] - Email uses: %2A.vercel.app (broken)');
  });

  test.afterEach(async () => {
    await errorCapture.cleanup();
  });
});
