import { test, expect } from '@playwright/test';
import { waitForLogs } from './helpers/logPoller';
import { supabaseTestClient } from './helpers/supabaseTestClient';
import { createTestContext } from './helpers/testData';
import { saveAuditArtifacts } from './helpers/artifactSaver';

test.describe('Audit Logging - Login Flow', () => {
  test('@audit @login should log login with audit trail', async ({ request, baseURL }) => {
    const testContext = createTestContext('login-audit');
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `e2e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Test login data
    const loginData = {
      email: 'test-admin@example.com',
      password: 'test-password-123'
    };

    // Make login request with explicit request ID
    const response = await request.post('/api/auth/login', {
      data: loginData,
      headers: {
        'X-Request-ID': rid
      }
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[e2e] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response and request ID propagation
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    try {
      // Wait for audit logs with exact expected counts
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 2, { startTs });

      // STRENGTHENED ASSERTIONS: Exact counts
      expect(accessLogs).toHaveLength(1);
      expect(eventLogs).toHaveLength(2);

      // Verify access log
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/auth\/login/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // STRENGTHENED ASSERTIONS: Exact action set validation
      const eventActions = new Set(eventLogs.map(log => log.action));
      const expectedActions = new Set(['LoginSubmitted', 'LoginSucceeded']);
      expect(eventActions).toEqual(expectedActions);

      // STRENGTHENED ASSERTIONS: Single distinct correlation_id verification
      const correlationIds = new Set(eventLogs.map(log => log.correlation_id));
      expect(correlationIds.size).toBe(1);
      expect(correlationIds.has(rid)).toBe(true);

      // STRENGTHENED ASSERTIONS: Timestamp validation (±90s window)
      const accessTimestamp = new Date(accessLog.occurred_at_utc);
      const timeDiffMs = Math.abs(accessTimestamp.getTime() - startTs.getTime());
      expect(timeDiffMs).toBeLessThanOrEqual(90000); // 90 seconds

      // STRENGTHENED ASSERTIONS: Non-decreasing timestamp order
      const sortedEvents = [...eventLogs].sort((a, b) => 
        new Date(a.occurred_at_utc).getTime() - new Date(b.occurred_at_utc).getTime()
      );
      expect(sortedEvents).toEqual(eventLogs);

      // ENHANCED PII SAFETY: Stricter regex checks
      const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
      const phoneRegex = /(0|\+66)\d{8,10}/;
      
      // Check access log meta
      if (accessLog.meta) {
        const accessMetaStr = JSON.stringify(accessLog.meta);
        expect(accessMetaStr).not.toMatch(emailRegex);
        expect(accessMetaStr).not.toMatch(phoneRegex);
      }

      // Check event log meta
      eventLogs.forEach(event => {
        if (event.meta) {
          const eventMetaStr = JSON.stringify(event.meta);
          expect(eventMetaStr).not.toMatch(emailRegex);
          expect(eventMetaStr).not.toMatch(phoneRegex);
        }
      });

      // Verify specific event details
      const loginSubmitted = eventLogs.find(e => e.action === 'LoginSubmitted');
      expect(loginSubmitted?.resource).toBe('User');
      expect(loginSubmitted?.actor_role).toBe('user');

      const loginSucceeded = eventLogs.find(e => e.action === 'LoginSucceeded');
      expect(loginSucceeded?.resource).toBe('User');
      expect(loginSucceeded?.actor_role).toBe('system');

    } catch (error) {
      // Save artifacts on failure
      await saveAuditArtifacts(rid, 'login-audit-failure');
      throw error;
    }
  });

  test('should handle login failure with audit trail', async ({ request, baseURL }) => {
    const testContext = createTestContext('login-failure-audit');
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `e2e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Test invalid login data
    const loginData = {
      email: 'invalid@example.com',
      password: 'wrong-password'
    };

    // Make login request with explicit request ID
    const response = await request.post('/api/auth/login', {
      data: loginData,
      headers: {
        'X-Request-ID': rid
      }
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[e2e] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response and request ID propagation
    expect(response.status()).toBe(401);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    try {
      // Wait for access log only (no events for login failures)
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 0, { startTs });

      // STRENGTHENED ASSERTIONS: Exact counts
      expect(accessLogs).toHaveLength(1);
      expect(eventLogs).toHaveLength(0);

      // Verify access log
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/auth\/login/);
      expect(accessLog.result).toBe('401');
      expect(accessLog.request_id).toBe(rid);

    } catch (error) {
      // Save artifacts on failure
      await saveAuditArtifacts(rid, 'login-failure-audit-failure');
      throw error;
    }
  });

  test('should handle magic link authentication', async ({ request, baseURL }) => {
    const testContext = createTestContext('magic-link-audit');
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `e2e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Test magic link request
    const magicLinkData = {
      email: 'test@example.com'
    };

    // Make magic link request with explicit request ID
    const response = await request.post('/api/auth/login', {
      data: magicLinkData,
      headers: {
        'X-Request-ID': rid
      }
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[e2e] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response and request ID propagation
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    try {
      // Wait for access log only (magic link requests don't emit domain events)
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 0, { startTs });

      // STRENGTHENED ASSERTIONS: Exact counts
      expect(accessLogs).toHaveLength(1);
      expect(eventLogs).toHaveLength(0);

      // Verify access log
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/auth\/login/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

    } catch (error) {
      // Save artifacts on failure
      await saveAuditArtifacts(rid, 'magic-link-audit-failure');
      throw error;
    }
  });
});
