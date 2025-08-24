import { test, expect } from '@playwright/test';

test.describe('Email Dispatch Debug - Database Update Issue', () => {
  test('should debug email dispatch database update issue', async ({ request }) => {
    console.log('🔍 Starting email dispatch debug test...');

    // Step 1: Check initial email status
    console.log('📊 Step 1: Checking initial email status...');
    const initialStatusResponse = await request.get('/api/admin/email-status', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(initialStatusResponse.ok()).toBeTruthy();
    const initialStatus = await initialStatusResponse.json();
    console.log('📊 Initial outbox status:', JSON.stringify(initialStatus.health.outbox, null, 2));
    console.log('📊 Initial config:', JSON.stringify(initialStatus.config, null, 2));

    // Step 2: Seed a test email into outbox
    console.log('📧 Step 2: Seeding test email into outbox...');
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
            trackingCode: 'DEBUG-TEST-123',
            applicantName: 'Debug Test User'
          }
        }]
      }
    });

    expect(seedResponse.ok()).toBeTruthy();
    const seedResult = await seedResponse.json();
    console.log('📧 Seed result:', JSON.stringify(seedResult, null, 2));

    // Step 3: Check outbox status after seeding
    console.log('📊 Step 3: Checking outbox status after seeding...');
    const afterSeedResponse = await request.get('/api/admin/email-status', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(afterSeedResponse.ok()).toBeTruthy();
    const afterSeedStatus = await afterSeedResponse.json();
    console.log('📊 After seed outbox status:', JSON.stringify(afterSeedStatus.health.outbox, null, 2));

    // Step 4: Test dry-run dispatch
    console.log('🧪 Step 4: Testing dry-run dispatch...');
    const dryRunResponse = await request.get('/api/admin/dispatch-emails?dry_run=true', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(dryRunResponse.ok()).toBeTruthy();
    const dryRunResult = await dryRunResponse.json();
    console.log('🧪 Dry-run result:', JSON.stringify(dryRunResult, null, 2));

    // Step 5: Perform actual dispatch
    console.log('📤 Step 5: Performing actual dispatch...');
    const dispatchResponse = await request.get('/api/admin/dispatch-emails', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(dispatchResponse.ok()).toBeTruthy();
    const dispatchResult = await dispatchResponse.json();
    console.log('📤 Dispatch result:', JSON.stringify(dispatchResult, null, 2));

    // Step 6: Check outbox status after dispatch
    console.log('📊 Step 6: Checking outbox status after dispatch...');
    const afterDispatchResponse = await request.get('/api/admin/email-status', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(afterDispatchResponse.ok()).toBeTruthy();
    const afterDispatchStatus = await afterDispatchResponse.json();
    console.log('📊 After dispatch outbox status:', JSON.stringify(afterDispatchStatus.health.outbox, null, 2));

    // Step 7: Analyze the issue
    console.log('🔍 Step 7: Analyzing the issue...');
    
    const initialPending = initialStatus.health.outbox.total_pending;
    const afterSeedPending = afterSeedStatus.health.outbox.total_pending;
    const afterDispatchPending = afterDispatchStatus.health.outbox.total_pending;
    const afterDispatchSent = afterDispatchStatus.health.outbox.total_sent;
    
    console.log('📊 Analysis:');
    console.log(`   - Initial pending: ${initialPending}`);
    console.log(`   - After seed pending: ${afterSeedPending}`);
    console.log(`   - After dispatch pending: ${afterDispatchPending}`);
    console.log(`   - After dispatch sent: ${afterDispatchSent}`);
    console.log(`   - Dispatch reported sent: ${dispatchResult.sent}`);
    
    // Step 8: Test database function directly
    console.log('🗄️ Step 8: Testing database function directly...');
    try {
      const dbTestResponse = await request.post('/api/test/outbox-status', {
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'X-Test-Helpers-Enabled': '1'
        }
      });
      
      if (dbTestResponse.ok()) {
        const dbTestResult = await dbTestResponse.json();
        console.log('🗄️ Database function test result:', JSON.stringify(dbTestResult, null, 2));
      } else {
        const dbTestError = await dbTestResponse.text();
        console.log('🗄️ Database function test error:', dbTestError);
      }
    } catch (error) {
      console.log('🗄️ Database function test exception:', error);
    }

    // Step 9: Verify email configuration
    console.log('⚙️ Step 9: Verifying email configuration...');
    console.log('⚙️ Email configuration:', JSON.stringify(afterDispatchStatus.config, null, 2));
    console.log('⚙️ Transport configuration:', JSON.stringify(afterDispatchStatus.transport, null, 2));
    console.log('⚙️ Environment variables:', JSON.stringify(afterDispatchStatus.env, null, 2));

    // Step 10: Test email debug endpoint
    console.log('🔧 Step 10: Testing email debug endpoint...');
    try {
      const debugResponse = await request.get('/api/test/email-debug', {
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'X-Test-Helpers-Enabled': '1'
        }
      });
      
      if (debugResponse.ok()) {
        const debugResult = await debugResponse.json();
        console.log('🔧 Email debug result:', JSON.stringify(debugResult, null, 2));
      } else {
        const debugError = await debugResponse.text();
        console.log('🔧 Email debug error:', debugError);
      }
    } catch (error) {
      console.log('🔧 Email debug exception:', error);
    }

    // Assertions to identify the issue
    console.log('✅ Step 11: Running assertions...');
    
    // Check if emails were seeded correctly
    expect(afterSeedPending).toBeGreaterThanOrEqual(initialPending);
    
    // Check if dispatch reported success
    expect(dispatchResult.ok).toBe(true);
    expect(dispatchResult.sent).toBeGreaterThan(0);
    
    // Check if database stats were updated (this is the issue we're investigating)
    const expectedPending = afterSeedPending - dispatchResult.sent;
    const expectedSent = afterDispatchSent + dispatchResult.sent;
    
    console.log(`📊 Expected pending: ${expectedPending}, Actual: ${afterDispatchPending}`);
    console.log(`📊 Expected sent: ${expectedSent}, Actual: ${afterDispatchSent}`);
    
    // This assertion will fail if the database update issue exists
    if (afterDispatchPending !== expectedPending) {
      console.log('❌ DATABASE UPDATE ISSUE DETECTED:');
      console.log(`   - Dispatch reported sending ${dispatchResult.sent} emails`);
      console.log(`   - But database still shows ${afterDispatchPending} pending (expected ${expectedPending})`);
      console.log(`   - Database sent count: ${afterDispatchSent} (expected ${expectedSent})`);
    }
    
    // Log the issue for manual investigation
    console.log('🔍 ISSUE SUMMARY:');
    console.log('   - Email dispatch system reports success');
    console.log('   - But database status is not being updated');
    console.log('   - This suggests a database update function issue');
    console.log('   - Or a database permissions/connection issue');
    
    // Don't fail the test - we want to see the logs
    console.log('✅ Debug test completed - check logs above for issue analysis');
  });

  test('should test email transport with detailed logging', async ({ request }) => {
    console.log('🔍 Starting email transport debug test...');

    // Test email transport configuration
    const statusResponse = await request.get('/api/admin/email-status', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(statusResponse.ok()).toBeTruthy();
    const status = await statusResponse.json();
    
    console.log('📊 Email transport configuration:');
    console.log('   - Mode:', status.transport.mode);
    console.log('   - Cap max per run:', status.transport.capMaxPerRun);
    console.log('   - Subject prefix:', status.transport.subjectPrefix);
    console.log('   - Resend configured:', status.transport.resendConfigured);
    console.log('   - Allowlist:', status.transport.allowlist);
    
    // Test with a small batch to see detailed logs
    console.log('📤 Testing dispatch with detailed logging...');
    const dispatchResponse = await request.get('/api/admin/dispatch-emails?batchSize=1', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(dispatchResponse.ok()).toBeTruthy();
    const dispatchResult = await dispatchResponse.json();
    
    console.log('📤 Dispatch result with batch size 1:');
    console.log(JSON.stringify(dispatchResult, null, 2));
    
    // Check if the issue is with batch processing
    if (dispatchResult.sent > 0 && dispatchResult.remaining === 0) {
      console.log('✅ Dispatch reported success with no remaining emails');
    } else {
      console.log('⚠️ Dispatch may have issues with batch processing');
    }
  });
});
