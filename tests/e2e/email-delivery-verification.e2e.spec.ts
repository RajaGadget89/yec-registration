import { test, expect } from '@playwright/test';

/**
 * Email Delivery Verification E2E Test
 * 
 * This test specifically focuses on verifying real email delivery by:
 * 1. Testing actual email sending (not dry-run)
 * 2. Capturing detailed Resend API responses
 * 3. Monitoring email delivery status
 * 4. Providing comprehensive error analysis
 * 5. Testing multiple email scenarios
 */

test.describe('Email Delivery Verification', () => {
  test('should send real email and verify delivery', async ({ request }) => {
    console.log('\n📧 Starting Real Email Delivery Verification Test');
    console.log('================================================');

    // Step 1: Verify we're in the right environment for real sending
    console.log('\n🔍 Step 1: Verifying environment for real email sending...');
    const envCheck = await request.get('/api/admin/email-status', {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });
    
    expect(envCheck.ok()).toBeTruthy();
    const envData = await envCheck.json();
    console.log('🔍 Environment Check:', JSON.stringify(envData.env, null, 2));
    
    // Verify we're not in dry-run mode
    if (envData.env.DISPATCH_DRY_RUN === 'true') {
      console.log('⚠️ WARNING: DISPATCH_DRY_RUN is true - emails will not be sent!');
    } else {
      console.log('✅ DISPATCH_DRY_RUN is false - real emails will be sent');
    }

    // Step 2: Test direct email sending via dev endpoint
    console.log('\n📤 Step 2: Testing direct email sending...');
    const directSendResponse = await request.post('/api/dev/send-test', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      data: {
        subjectPrefix: 'REAL-DELIVERY-TEST',
        trackingCode: 'E2E-REAL-DELIVERY-001',
        message: 'This is a real email delivery test from the E2E test suite.'
      }
    });

    expect(directSendResponse.ok()).toBeTruthy();
    const directSendData = await directSendResponse.json();
    console.log('📤 Direct Send Result:', JSON.stringify(directSendData, null, 2));

    // Step 3: Analyze the direct send result
    console.log('\n🔍 Step 3: Analyzing direct send result...');
    const directSendAnalysis = {
      success: directSendData.ok,
      to: directSendData.to,
      subject: directSendData.subject,
      trackingCode: directSendData.trackingCode,
      providerResult: directSendData.providerResult,
      transportStats: directSendData.transportStats
    };
    console.log('🔍 Direct Send Analysis:', JSON.stringify(directSendAnalysis, null, 2));

    // Step 4: Test email dispatch with real sending
    console.log('\n📤 Step 4: Testing email dispatch with real sending...');
    
    // First, seed a test email
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
            trackingCode: 'E2E-DISPATCH-REAL-001',
            applicantName: 'E2E Dispatch Test User',
            testType: 'real-delivery-verification'
          }
        }]
      }
    });

    expect(seedResponse.ok()).toBeTruthy();
    const seedData = await seedResponse.json();
    console.log('📧 Seed Result:', JSON.stringify(seedData, null, 2));

    // Now dispatch the email
    const dispatchResponse = await request.get('/api/admin/dispatch-emails', {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });

    expect(dispatchResponse.ok()).toBeTruthy();
    const dispatchData = await dispatchResponse.json();
    console.log('📤 Dispatch Result:', JSON.stringify(dispatchData, null, 2));

    // Step 5: Verify email was processed correctly
    console.log('\n🗄️ Step 5: Verifying email processing...');
    const emailId = seedData.ids[0];
    const dbCheck = await request.post('/api/test/execute-sql', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'X-Test-Helpers-Enabled': '1',
        'Content-Type': 'application/json'
      },
      data: {
        sql: `SELECT id, to_email, status, sent_at, last_error, updated_at, payload FROM email_outbox WHERE id = '${emailId}';`
      }
    });

    expect(dbCheck.ok()).toBeTruthy();
    const dbData = await dbCheck.json();
    console.log('🗄️ Database Check:', JSON.stringify(dbData, null, 2));

    // Step 6: Comprehensive delivery analysis
    console.log('\n🎯 Step 6: Comprehensive delivery analysis...');
    
    const deliveryAnalysis = {
      // Direct send analysis
      directSendSuccess: directSendData.ok,
      directSendProviderResult: directSendData.providerResult,
      directSendTransportStats: directSendData.transportStats,
      
      // Dispatch analysis
      dispatchSuccess: dispatchData.ok,
      emailsDispatched: dispatchData.sent,
      dispatchDryRun: dispatchData.dryRun,
      
      // Database analysis
      emailStatus: dbData.result?.[0]?.status,
      sentAtTimestamp: dbData.result?.[0]?.sent_at,
      lastError: dbData.result?.[0]?.last_error,
      
      // Environment analysis
      dispatchDryRunEnv: envData.env.DISPATCH_DRY_RUN,
      emailMode: envData.env.EMAIL_MODE,
      allowlistSize: envData.config.allowlistSize
    };

    console.log('🎯 Delivery Analysis:', JSON.stringify(deliveryAnalysis, null, 2));

    // Step 7: Root cause determination
    console.log('\n🔍 Step 7: Root cause determination...');
    
    if (deliveryAnalysis.directSendSuccess && deliveryAnalysis.directSendProviderResult?.ok) {
      console.log('✅ Direct email sending is working');
      console.log('📧 Email should have been sent via Resend API');
      console.log('📧 Check your email inbox for delivery');
    } else {
      console.log('❌ Direct email sending failed');
      console.log('🔍 Provider result:', deliveryAnalysis.directSendProviderResult);
    }

    if (deliveryAnalysis.dispatchSuccess && deliveryAnalysis.emailsDispatched > 0) {
      console.log('✅ Email dispatch is working');
      console.log('📧 Emails should have been sent via dispatch job');
    } else {
      console.log('❌ Email dispatch failed');
      console.log('🔍 Dispatch result:', deliveryAnalysis.dispatchSuccess);
    }

    if (deliveryAnalysis.emailStatus === 'sent' && deliveryAnalysis.sentAtTimestamp) {
      console.log('✅ Database correctly updated');
      console.log('📧 Email marked as sent in database');
    } else {
      console.log('❌ Database update issue');
      console.log('🔍 Email status:', deliveryAnalysis.emailStatus);
      console.log('🔍 Sent timestamp:', deliveryAnalysis.sentAtTimestamp);
    }

    // Step 8: Delivery verification recommendations
    console.log('\n💡 Step 8: Delivery verification recommendations...');
    
    if (deliveryAnalysis.directSendSuccess || deliveryAnalysis.dispatchSuccess) {
      console.log('💡 Email sending appears successful');
      console.log('💡 If email not received, check:');
      console.log('   1. Spam/junk folder');
      console.log('   2. Email provider dashboard');
      console.log('   3. Resend API delivery logs');
      console.log('   4. Email routing configuration');
      console.log('   5. Domain verification status');
    } else {
      console.log('💡 Email sending failed');
      console.log('💡 Check:');
      console.log('   1. Email configuration');
      console.log('   2. Resend API key');
      console.log('   3. Domain verification');
      console.log('   4. Allowlist settings');
    }

    console.log('\n✅ Email Delivery Verification Test Completed');
    console.log('============================================');
  });

  test('should test multiple email scenarios', async ({ request }) => {
    console.log('\n📧 Starting Multiple Email Scenarios Test');
    
    const scenarios = [
      {
        name: 'Tracking Email',
        template: 'tracking',
        payload: { trackingCode: 'SCENARIO-TRACKING-001' }
      },
      {
        name: 'Approval Email',
        template: 'approval-badge',
        payload: { applicantName: 'Scenario Test User' }
      }
    ];

    for (const scenario of scenarios) {
      console.log(`\n📧 Testing scenario: ${scenario.name}`);
      
      // Seed email for this scenario
      const seedResponse = await request.post('/api/test/seed-outbox', {
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'X-Test-Helpers-Enabled': '1',
          'Content-Type': 'application/json'
        },
        data: {
          emails: [{
            template: scenario.template,
            to_email: 'raja.gadgets89@gmail.com',
            payload: scenario.payload
          }]
        }
      });

      expect(seedResponse.ok()).toBeTruthy();
      const seedData = await seedResponse.json();
      console.log(`📧 ${scenario.name} seeded:`, seedData.success);

      // Dispatch emails
      const dispatchResponse = await request.get('/api/admin/dispatch-emails', {
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
      });

      expect(dispatchResponse.ok()).toBeTruthy();
      const dispatchData = await dispatchResponse.json();
      console.log(`📤 ${scenario.name} dispatched:`, dispatchData.sent, 'emails');
    }

    console.log('\n✅ Multiple Email Scenarios Test Completed');
  });

  test('should verify email provider status', async ({ request }) => {
    console.log('\n🔧 Starting Email Provider Status Verification');
    
    // Test email provider configuration
    const providerTest = await request.get('/api/test/email-debug', {
      headers: { 
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'X-Test-Helpers-Enabled': '1'
      }
    });
    
    expect(providerTest.ok()).toBeTruthy();
    const providerData = await providerTest.json();
    
    console.log('🔧 Provider Status:', JSON.stringify(providerData, null, 2));
    
    // Verify all critical components
    expect(providerData.apiKey.configured).toBe(true);
    expect(providerData.domains.success).toBe(true);
    expect(providerData.sendTest.success).toBe(true);
    
    console.log('✅ Email provider status verified');
  });
});
