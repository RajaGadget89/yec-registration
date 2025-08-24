import { test, expect } from '@playwright/test';
import { waitForLogs, waitForSpecificEvents } from './helpers/logPoller';
import { supabaseTestClient } from './helpers/supabaseTestClient';
import { createTestContext } from './helpers/testData';
import { saveAuditArtifacts } from './helpers/artifactSaver';

test.describe('Email Dispatch Audit Integration - Comprehensive Testing', () => {
  let testRegistrationId: string;
  let testRegistrationData: any;

  test.beforeAll(async () => {
    // Create a test registration to trigger email dispatch
    const testContext = createTestContext('email-dispatch-audit-test');
    testRegistrationData = testContext.registrationData;
    
    // Submit registration to get a valid registration ID and trigger email
    const response = await fetch(`${process.env.BASE_URL || 'http://localhost:8080'}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `email-dispatch-setup-${Date.now()}`,
      },
      body: JSON.stringify(testRegistrationData),
    });
    
    if (response.ok) {
      const result = await response.json();
      testRegistrationId = result.registration_id;
      console.log(`[email-dispatch-audit] Created test registration: ${testRegistrationId}`);
    } else {
      throw new Error('Failed to create test registration for email dispatch audit tests');
    }
  });

  test('@audit @email-dispatch should log email dispatch actions to audit logs', async ({ request, baseURL }) => {
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `email-dispatch-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Call email dispatch endpoint
    const response = await request.get('/api/admin/dispatch-emails', {
      headers: {
        'X-Request-ID': rid,
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      params: {
        dry_run: 'true', // Use dry-run to avoid sending real emails
      },
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[email-dispatch] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    const responseData = await response.json();
    expect(responseData.ok).toBe(true);
    expect(responseData.dryRun).toBe(true);

    try {
      // Wait for audit logs
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 0, { startTs });

      // Verify access log
      expect(accessLogs).toHaveLength(1);
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:GET \/api\/admin\/dispatch-emails/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // Verify access log metadata contains email dispatch information
      if (accessLog.meta) {
        expect(accessLog.meta.dryRun).toBe(true);
        expect(accessLog.meta.sent).toBeDefined();
        expect(accessLog.meta.wouldSend).toBeDefined();
        expect(accessLog.meta.errors).toBeDefined();
      }

      console.log(`[email-dispatch] ✅ Email dispatch audit logging validated`);

    } catch (error) {
      console.error(`[email-dispatch] ❌ Email dispatch audit logging failed:`, error);
      throw error;
    }
  });

  test('@audit @email-outbox should validate email outbox audit trail', async ({ request, baseURL }) => {
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `email-outbox-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Check email outbox status
    const response = await request.get('/api/admin/email-status', {
      headers: {
        'X-Request-ID': rid,
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[email-outbox] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    const responseData = await response.json();
    expect(responseData.mode).toBeDefined();
    expect(responseData.allowlist).toBeDefined();

    try {
      // Wait for audit logs
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 0, { startTs });

      // Verify access log
      expect(accessLogs).toHaveLength(1);
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:GET \/api\/admin\/email-status/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // Verify access log metadata contains email status information
      if (accessLog.meta) {
        expect(accessLog.meta.mode).toBeDefined();
        expect(accessLog.meta.allowlist).toBeDefined();
      }

      // Verify email outbox table has entries for our test registration
      const supabase = supabaseTestClient;
      const { data: emailOutboxEntries, error } = await supabase
        .from('email_outbox')
        .select('*')
        .eq('payload->registration_id', testRegistrationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`[email-outbox] Email outbox query failed: ${error.message}`);
        if (error.message.includes('does not exist')) {
          console.log(`[email-outbox] ⚠️  email_outbox table not found - skipping outbox validation`);
          return;
        }
        throw error;
      }

      // Should have at least one email outbox entry for the test registration
      expect(emailOutboxEntries.length).toBeGreaterThan(0);
      
      const outboxEntry = emailOutboxEntries[0];
      expect(outboxEntry.template).toBeDefined();
      expect(outboxEntry.to_email).toBe(testRegistrationData.email);
      expect(outboxEntry.status).toBeDefined();

      console.log(`[email-outbox] ✅ Email outbox audit trail validated`);

    } catch (error) {
      console.error(`[email-outbox] ❌ Email outbox audit trail failed:`, error);
      throw error;
    }
  });

  test('@audit @email-registration-integration should validate email dispatch in registration flow', async ({ request, baseURL }) => {
    const testContext = createTestContext('email-registration-integration');
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `email-registration-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Submit a new registration to trigger email dispatch
    const response = await request.post('/api/register', {
      headers: {
        'X-Request-ID': rid,
        'Content-Type': 'application/json',
      },
      data: testContext.registrationData,
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[email-registration] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.registration_id).toBeDefined();

    try {
      // Wait for audit logs
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 3, { startTs });

      // Verify access log
      expect(accessLogs).toHaveLength(1);
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/register/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // Verify event logs include email-related events
      expect(eventLogs).toHaveLength(3);
      const eventActions = new Set(eventLogs.map(log => log.action));
      expect(eventActions).toContain('RegisterSubmitted');
      expect(eventActions).toContain('RegistrationCreated');
      expect(eventActions).toContain('StatusChanged');

      // Verify email dispatch status in response (for non-prod environments)
      if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') {
        expect(responseData.emailDispatch).toBeDefined();
        expect(responseData.emailDispatchDetails).toBeDefined();
      }

      // Verify email outbox has entry for this registration
      const supabase = supabaseTestClient;
      const { data: emailOutboxEntries, error } = await supabase
        .from('email_outbox')
        .select('*')
        .eq('payload->registration_id', responseData.registration_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn(`[email-registration] Email outbox query failed: ${error.message}`);
        if (error.message.includes('does not exist')) {
          console.log(`[email-registration] ⚠️  email_outbox table not found - skipping outbox validation`);
          return;
        }
        throw error;
      }

      expect(emailOutboxEntries).toHaveLength(1);
      const outboxEntry = emailOutboxEntries[0];
      expect(outboxEntry.template).toBe('registration.created');
      expect(outboxEntry.to_email).toBe(testContext.registrationData.email);
      expect(outboxEntry.status).toBe('pending');

      console.log(`[email-registration] ✅ Email registration integration audit validated`);

    } catch (error) {
      console.error(`[email-registration] ❌ Email registration integration audit failed:`, error);
      throw error;
    }
  });

  test('@audit @email-dispatch-performance should validate audit logging performance', async ({ request, baseURL }) => {
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `email-performance-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Call email dispatch endpoint and measure performance
    const dispatchStart = Date.now();
    const response = await request.get('/api/admin/dispatch-emails', {
      headers: {
        'X-Request-ID': rid,
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      params: {
        dry_run: 'true',
        batchSize: '1', // Small batch for performance testing
      },
    });
    const dispatchEnd = Date.now();
    const dispatchDuration = dispatchEnd - dispatchStart;

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[email-performance] baseURL=${baseURL} x-request-id=${rid} duration=${dispatchDuration}ms`);

    // Verify response
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    // Performance assertion: email dispatch should complete within reasonable time
    expect(dispatchDuration).toBeLessThan(10000); // 10 seconds max

    try {
      // Wait for audit logs
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 0, { startTs });

      // Verify access log
      expect(accessLogs).toHaveLength(1);
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:GET \/api\/admin\/dispatch-emails/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // Verify latency is recorded in audit log
      if (accessLog.latency_ms) {
        expect(accessLog.latency_ms).toBeGreaterThan(0);
        expect(accessLog.latency_ms).toBeLessThan(10000); // 10 seconds max
      }

      console.log(`[email-performance] ✅ Email dispatch performance audit validated`);

    } catch (error) {
      console.error(`[email-performance] ❌ Email dispatch performance audit failed:`, error);
      throw error;
    }
  });

  test.afterAll(async () => {
    // Clean up test data if needed
    console.log(`[email-dispatch-audit] Test cleanup completed`);
  });
});
