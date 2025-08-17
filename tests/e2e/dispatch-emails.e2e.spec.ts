import { test, expect } from '@playwright/test';

test.describe('Email Dispatch E2E', () => {
  test('should dispatch emails via admin endpoint', async ({ request }) => {
    // Test dry-run dispatch
    const dryRunResponse = await request.get('/api/admin/dispatch-emails?dry_run=true', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(dryRunResponse.ok()).toBeTruthy();
    const dryRunData = await dryRunResponse.json();
    
    expect(dryRunData).toHaveProperty('ok', true);
    expect(dryRunData).toHaveProperty('dryRun', true);
    expect(dryRunData).toHaveProperty('sent');
    expect(dryRunData).toHaveProperty('wouldSend');
    expect(dryRunData).toHaveProperty('blocked');
    expect(dryRunData).toHaveProperty('errors');
    expect(dryRunData).toHaveProperty('remaining');
    expect(dryRunData).toHaveProperty('timestamp');

    // Test actual dispatch
    const actualResponse = await request.get('/api/admin/dispatch-emails', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(actualResponse.ok()).toBeTruthy();
    const actualData = await actualResponse.json();
    
    expect(actualData).toHaveProperty('ok', true);
    expect(actualData).toHaveProperty('dryRun');
    expect(actualData).toHaveProperty('sent');
    expect(actualData).toHaveProperty('wouldSend');
    expect(actualData).toHaveProperty('blocked');
    expect(actualData).toHaveProperty('errors');
    expect(actualData).toHaveProperty('remaining');
    expect(actualData).toHaveProperty('timestamp');
  });

  test('should return email status via admin endpoint', async ({ request }) => {
    const response = await request.get('/api/admin/email-status', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('config');
    expect(data).toHaveProperty('transport');
    expect(data).toHaveProperty('validation');
    expect(data).toHaveProperty('health');
    expect(data).toHaveProperty('env');

    // Check configuration structure
    expect(data.config).toHaveProperty('mode');
    expect(data.config).toHaveProperty('allowlist');
    expect(data.config).toHaveProperty('allowlistSize');
    expect(data.config).toHaveProperty('fromEmail');
    expect(data.config).toHaveProperty('resendConfigured');
    expect(data.config).toHaveProperty('isProduction');
    expect(data.config).toHaveProperty('nodeEnv');

    // Check transport structure
    expect(data.transport).toHaveProperty('mode');
    expect(data.transport).toHaveProperty('allowlist');
    expect(data.transport).toHaveProperty('capMaxPerRun');
    expect(data.transport).toHaveProperty('blockNonAllowlist');
    expect(data.transport).toHaveProperty('subjectPrefix');
    expect(data.transport).toHaveProperty('resendConfigured');

    // Check validation structure
    expect(data.validation).toHaveProperty('valid');
    expect(data.validation).toHaveProperty('errors');
    expect(data.validation).toHaveProperty('warnings');

    // Check health structure
    expect(data.health).toHaveProperty('provider');
    expect(data.health).toHaveProperty('outbox');

    // Check environment structure
    expect(data.env).toHaveProperty('EMAIL_MODE');
    expect(data.env).toHaveProperty('DISPATCH_DRY_RUN');
    expect(data.env).toHaveProperty('RESEND_API_KEY');
    expect(data.env).toHaveProperty('EMAIL_FROM');
    expect(data.env).toHaveProperty('CRON_SECRET');
    expect(data.env).toHaveProperty('SUPABASE_ENV');
    expect(data.env).toHaveProperty('NODE_ENV');
  });

  test('should handle registration with email dispatch', async ({ request }) => {
    // Submit a registration
    const registrationResponse = await request.post('/api/register', {
      data: {
        title: "Mr",
        firstName: "EmailTest",
        lastName: "User",
        nickname: "EmailTestUser",
        phone: "0123456798",
        lineId: "emailtestuser2",
        email: "raja.gadgets89@gmail.com", // Use allowlisted email
        companyName: "Test Co",
        businessType: "technology",
        yecProvince: "bangkok",
        hotelChoice: "in-quota",
        roomType: "single",
        travelType: "private-car",
        pdpaConsent: true
      }
    });

    expect(registrationResponse.ok()).toBeTruthy();
    const registrationData = await registrationResponse.json();
    
    expect(registrationData).toHaveProperty('success', true);
    expect(registrationData).toHaveProperty('registration_id');
    
    // Check email dispatch status in non-prod
    if (process.env.NODE_ENV !== 'production') {
      expect(registrationData).toHaveProperty('emailDispatch');
      expect(registrationData).toHaveProperty('emailDispatchDetails');
      
      // The emailDispatch should be one of the expected values
      expect(['sent', 'blocked', 'dry_run', 'failed']).toContain(registrationData.emailDispatch);
    }

    // Wait a moment for email processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if emails are in the outbox
    const dispatchResponse = await request.get('/api/admin/dispatch-emails?dry_run=true', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(dispatchResponse.ok()).toBeTruthy();
    const dispatchData = await dispatchResponse.json();
    
    // Should have some emails to process
    expect(dispatchData.wouldSend + dispatchData.blocked + dispatchData.errors).toBeGreaterThan(0);
  });

  test('should reject unauthorized access to admin endpoints', async ({ request }) => {
    // Test without authorization
    const unauthorizedResponse = await request.get('/api/admin/dispatch-emails');
    expect(unauthorizedResponse.status()).toBe(401);

    const unauthorizedStatusResponse = await request.get('/api/admin/email-status');
    expect(unauthorizedStatusResponse.status()).toBe(401);

    // Test with invalid authorization
    const invalidResponse = await request.get('/api/admin/dispatch-emails', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    expect(invalidResponse.status()).toBe(401);
  });
});

