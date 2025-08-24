import { test, expect } from '@playwright/test';

/**
 * Comprehensive Email Delivery Debug E2E Test
 * 
 * This test provides detailed debugging for email delivery issues by:
 * 1. Capturing all network requests and responses
 * 2. Monitoring console logs and errors
 * 3. Testing the complete email delivery chain
 * 4. Providing detailed error analysis
 * 5. Verifying email delivery through multiple methods
 */

test.describe('Email Delivery Debug - Comprehensive', () => {
  let capturedLogs: string[] = [];
  let networkRequests: any[] = [];
  let emailId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Clear captured data
    capturedLogs = [];
    networkRequests = [];
    emailId = null;

    // Capture all console logs
    page.on('console', msg => {
      const logEntry = `[${new Date().toISOString()}] ${msg.type().toUpperCase()}: ${msg.text()}`;
      capturedLogs.push(logEntry);
      console.log(logEntry);
    });

    // Capture all network requests
    page.on('request', request => {
      const requestData = {
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData()
      };
      networkRequests.push(requestData);
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    });

    // Capture all network responses
    page.on('response', response => {
      console.log(`🌐 RESPONSE: ${response.status()} ${response.url()}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      const errorEntry = `[${new Date().toISOString()}] PAGE ERROR: ${error.message}`;
      capturedLogs.push(errorEntry);
      console.log(errorEntry);
    });
  });

  test('should debug complete email delivery chain with detailed logging', async ({ page, request }) => {
    console.log('\n🔍 Starting Comprehensive Email Delivery Debug Test');
    console.log('==================================================');

    // Step 1: Check initial system status
    console.log('\n📊 Step 1: Checking initial system status...');
    const initialStatus = await request.get('/api/admin/email-status', {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });
    
    expect(initialStatus.ok()).toBeTruthy();
    const statusData = await initialStatus.json();
    console.log('📊 Initial Status:', JSON.stringify(statusData, null, 2));

    // Step 2: Verify email configuration
    console.log('\n⚙️ Step 2: Verifying email configuration...');
    expect(statusData.config.allowlist).toContain('raja.gadgets89@gmail.com');
    expect(statusData.config.allowlistSize).toBeGreaterThan(0);
    console.log('✅ Email configuration verified');

    // Step 3: Test email provider directly
    console.log('\n🔧 Step 3: Testing email provider directly...');
    const providerTest = await request.get('/api/test/email-debug', {
      headers: { 
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'X-Test-Helpers-Enabled': '1'
      }
    });
    
    expect(providerTest.ok()).toBeTruthy();
    const providerData = await providerTest.json();
    console.log('🔧 Provider Test:', JSON.stringify(providerData, null, 2));

    // Step 4: Seed a test email with detailed tracking
    console.log('\n📧 Step 4: Seeding test email with detailed tracking...');
    const seedResponse = await request.post('/api/test/seed-outbox', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'X-Test-Helpers-Enabled': '1',
        'Content-Type': 'application/json'
      },
      data: {
        emails: [{
          template: 'tracking',
          to_email: 'raja.gadgets89@gmail.com',
          payload: {
            trackingCode: 'E2E-DEBUG-COMPREHENSIVE',
            applicantName: 'E2E Debug Test User',
            debugInfo: {
              testId: 'comprehensive-debug-test',
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV || 'development'
            }
          }
        }]
      }
    });

    expect(seedResponse.ok()).toBeTruthy();
    const seedData = await seedResponse.json();
    emailId = seedData.ids[0];
    console.log('📧 Seed Result:', JSON.stringify(seedData, null, 2));

    // Step 5: Verify email in database
    console.log('\n🗄️ Step 5: Verifying email in database...');
    const dbCheck = await request.post('/api/test/execute-sql', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'X-Test-Helpers-Enabled': '1',
        'Content-Type': 'application/json'
      },
      data: {
        sql: `SELECT id, to_email, status, scheduled_at, created_at, payload FROM email_outbox WHERE id = '${emailId}';`
      }
    });

    expect(dbCheck.ok()).toBeTruthy();
    const dbData = await dbCheck.json();
    console.log('🗄️ Database Check:', JSON.stringify(dbData, null, 2));

    // Step 6: Test dry-run dispatch with detailed logging
    console.log('\n🧪 Step 6: Testing dry-run dispatch...');
    const dryRunResponse = await request.get('/api/admin/dispatch-emails?dry_run=true', {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });

    expect(dryRunResponse.ok()).toBeTruthy();
    const dryRunData = await dryRunResponse.json();
    console.log('🧪 Dry-Run Result:', JSON.stringify(dryRunData, null, 2));

    // Step 7: Perform actual dispatch with comprehensive monitoring
    console.log('\n📤 Step 7: Performing actual dispatch with comprehensive monitoring...');
    
    // Monitor the dispatch process
    const dispatchStartTime = new Date();
    const dispatchResponse = await request.get('/api/admin/dispatch-emails', {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });
    const dispatchEndTime = new Date();
    const dispatchDuration = dispatchEndTime.getTime() - dispatchStartTime.getTime();

    expect(dispatchResponse.ok()).toBeTruthy();
    const dispatchData = await dispatchResponse.json();
    console.log('📤 Dispatch Result:', JSON.stringify(dispatchData, null, 2));
    console.log(`⏱️ Dispatch Duration: ${dispatchDuration}ms`);

    // Step 8: Verify database state after dispatch
    console.log('\n🗄️ Step 8: Verifying database state after dispatch...');
    const afterDispatchCheck = await request.post('/api/test/execute-sql', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'X-Test-Helpers-Enabled': '1',
        'Content-Type': 'application/json'
      },
      data: {
        sql: `SELECT id, to_email, status, sent_at, last_error, updated_at FROM email_outbox WHERE id = '${emailId}';`
      }
    });

    expect(afterDispatchCheck.ok()).toBeTruthy();
    const afterDispatchData = await afterDispatchCheck.json();
    console.log('🗄️ After Dispatch Check:', JSON.stringify(afterDispatchData, null, 2));

    // Step 9: Check final email status
    console.log('\n📊 Step 9: Checking final email status...');
    const finalStatus = await request.get('/api/admin/email-status', {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });

    expect(finalStatus.ok()).toBeTruthy();
    const finalStatusData = await finalStatus.json();
    console.log('📊 Final Status:', JSON.stringify(finalStatusData, null, 2));

    // Step 10: Comprehensive analysis
    console.log('\n🔍 Step 10: Comprehensive analysis...');
    
    // Analyze the results
    const analysis = {
      emailSeeded: seedData.success,
      emailId: emailId,
      dispatchReported: dispatchData.ok,
      emailsSent: dispatchData.sent,
      databaseUpdated: afterDispatchData.result?.[0]?.status === 'sent',
      sentAtTimestamp: afterDispatchData.result?.[0]?.sent_at,
      finalPending: finalStatusData.health.outbox.total_pending,
      finalSent: finalStatusData.health.outbox.total_sent,
      dispatchDuration: dispatchDuration,
      networkRequests: networkRequests.length,
      consoleLogs: capturedLogs.length
    };

    console.log('🔍 Analysis:', JSON.stringify(analysis, null, 2));

    // Step 11: Root cause determination
    console.log('\n🎯 Step 11: Root cause determination...');
    
    if (analysis.dispatchReported && analysis.emailsSent > 0 && analysis.databaseUpdated) {
      console.log('✅ Email dispatch appears successful');
      console.log('🔍 Checking for delivery issues...');
      
      // Check if email was actually sent via Resend
      if (analysis.sentAtTimestamp) {
        console.log('✅ Email marked as sent in database');
        console.log('⚠️ If email not received, possible causes:');
        console.log('   - Email provider delivery delay');
        console.log('   - Spam filter blocking');
        console.log('   - Email routing issue');
        console.log('   - Resend API delivery failure');
      } else {
        console.log('❌ Email not marked as sent in database');
        console.log('🔍 Database update issue detected');
      }
    } else {
      console.log('❌ Email dispatch failed');
      console.log('🔍 Dispatch issue detected');
    }

    // Step 12: Detailed error reporting
    console.log('\n📋 Step 12: Detailed error reporting...');
    console.log(`📊 Network Requests Captured: ${networkRequests.length}`);
    console.log(`📊 Console Logs Captured: ${capturedLogs.length}`);
    
    // Log any errors found
    const errors = capturedLogs.filter(log => log.includes('ERROR') || log.includes('error'));
    if (errors.length > 0) {
      console.log('❌ Errors found:');
      errors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('✅ No errors found in logs');
    }

    // Step 13: Recommendations
    console.log('\n💡 Step 13: Recommendations...');
    if (analysis.dispatchReported && analysis.emailsSent > 0) {
      console.log('💡 Email dispatch is working correctly');
      console.log('💡 Check email provider dashboard for delivery status');
      console.log('💡 Verify email is not in spam folder');
      console.log('💡 Check Resend API logs for delivery confirmation');
    } else {
      console.log('💡 Email dispatch needs investigation');
      console.log('💡 Check email configuration');
      console.log('💡 Verify allowlist settings');
      console.log('💡 Check email provider API status');
    }

    console.log('\n✅ Comprehensive Email Delivery Debug Test Completed');
    console.log('==================================================');
  });

  test('should test email delivery with network interception', async ({ page, context }) => {
    console.log('\n🌐 Starting Network Interception Email Test');
    
    // Set up network interception
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      
      // Only log email-related requests
      if (url.includes('/api/admin/dispatch-emails') || 
          url.includes('/api/test/') || 
          url.includes('resend.com')) {
        console.log(`🌐 INTERCEPTED: ${request.method()} ${url}`);
        
        // Log request headers for email requests
        if (url.includes('/api/admin/dispatch-emails')) {
          console.log(`🌐 Headers:`, JSON.stringify(request.headers(), null, 2));
        }
      }
      
      await route.continue();
    });

    // Navigate to a page that might trigger email sending
    await page.goto('/admin');
    
    // Wait for any email-related requests
    await page.waitForTimeout(5000);
    
    console.log('✅ Network interception test completed');
  });

  test('should verify email provider integration', async ({ request }) => {
    console.log('\n🔧 Starting Email Provider Integration Test');
    
    // Test Resend API directly
    const resendTest = await request.get('/api/test/email-debug', {
      headers: { 
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'X-Test-Helpers-Enabled': '1'
      }
    });
    
    expect(resendTest.ok()).toBeTruthy();
    const resendData = await resendTest.json();
    
    console.log('🔧 Resend API Test:', JSON.stringify(resendData, null, 2));
    
    // Verify Resend configuration
    expect(resendData.apiKey.configured).toBe(true);
    expect(resendData.domains.success).toBe(true);
    expect(resendData.sendTest.success).toBe(true);
    
    console.log('✅ Email provider integration verified');
  });
});
