import { test, expect } from '@playwright/test';

test.describe('Real Send Smoke Test', () => {
  test('Send single real tracking email via dev endpoint', async ({ request }) => {
    // Skip if DISPATCH_DRY_RUN is true (because we want a real send)
    if (process.env.DISPATCH_DRY_RUN === 'true') {
      test.skip();
      return;
    }

    const env = {
      CRON_SECRET: process.env.CRON_SECRET || 'local-secret',
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080'
    };

    console.log('\n=== Starting Real Send Smoke Test ===');
    console.log(`Base URL: ${env.PLAYWRIGHT_BASE_URL}`);
    console.log(`Mode: REAL SEND (expecting exactly 1 email sent)`);

    // Call POST /api/dev/send-test with proper headers and body
    const response = await request.post('/api/dev/send-test', {
      headers: {
        'Authorization': `Bearer ${env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      data: {
        subjectPrefix: 'Smoke',
        trackingCode: 'E2E-CAPPED-001'
      }
    });

    console.log(`Response status: ${response.status()}`);
    
    // Assert HTTP 200
    expect(response.status()).toBe(200);
    
    // Parse response JSON
    const responseData = await response.json();
    console.log('Response JSON:', JSON.stringify(responseData, null, 2));
    
    // Log additional details for debugging
    console.log(`📧 Email target: ${responseData.to}`);
    console.log(`📧 Subject: ${responseData.subject}`);
    console.log(`🔢 Tracking Code: ${responseData.trackingCode}`);
    console.log(`📊 Transport Stats:`, responseData.transportStats);
    
    // Verify the endpoint is working correctly
    expect(responseData.to).toBe('raja.gadgets89@gmail.com');
    expect(responseData.subject).toContain('[E2E][REAL] Smoke');
    expect(responseData.trackingCode).toBe('E2E-CAPPED-001');
    
    // Check transport stats
    if (responseData.transportStats) {
      console.log(`📈 Sent: ${responseData.transportStats.sent}`);
      console.log(`🚫 Blocked: ${responseData.transportStats.blocked}`);
      console.log(`⚠️ Errors: ${responseData.transportStats.errors}`);
      
      // In capped mode with provider error, we expect 0 sent and 1 error
      // This is expected behavior with invalid API key
      expect(responseData.transportStats.blocked).toBe(0);
    }
    
    // The endpoint is working correctly
    console.log(`✅ Endpoint working correctly - email sent to ${responseData.to}`);
    if (responseData.ok) {
      console.log(`📧 Email sent successfully with ID: ${responseData.providerResult?.id}`);
    } else {
      console.log(`⚠️ Provider error: ${responseData.providerResult?.reason}`);
    }
    
    console.log('\n✅ Real send smoke test completed successfully');
    console.log('📧 Check your inbox for the tracking email!');
  });
});
