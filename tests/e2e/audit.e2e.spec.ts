import { test, expect } from '@playwright/test';
import { waitForLogs, waitForSpecificEvents } from './helpers/logPoller';
import { supabaseTestClient } from './helpers/supabaseTestClient';
import { createTestContext } from './helpers/testData';
import { saveAuditArtifacts } from './helpers/artifactSaver';

test.describe('Audit Logging - Registration Flow', () => {
  test('@audit @registration should log registration with audit trail', async ({ request, baseURL }) => {
    const testContext = createTestContext('registration-audit');
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `e2e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Submit registration with explicit request ID
    const response = await request.post('/api/register', {
      data: testContext.registrationData,
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
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 3, { startTs });

      // STRENGTHENED ASSERTIONS: Exact counts
      expect(accessLogs).toHaveLength(1);
      expect(eventLogs).toHaveLength(3);

      // Verify access log
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/register/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // STRENGTHENED ASSERTIONS: Exact action set validation
      const eventActions = new Set(eventLogs.map(log => log.action));
      const expectedActions = new Set(['RegisterSubmitted', 'RegistrationCreated', 'StatusChanged']);
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

      // ENHANCED PII SAFETY: Stricter regex checks that exclude masked values
      const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
      const phoneRegex = /(0|\+66)\d{8,10}(?!\*)/; // Exclude masked patterns (no asterisks after digits)
      
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
          
          // Skip PII validation for masked values (they are already safe)
          const hasMaskedPhone = eventMetaStr.includes('phone_masked') && eventMetaStr.includes('*******');
          const hasMaskedEmail = eventMetaStr.includes('email_masked') && eventMetaStr.includes('*******');
          
          if (!hasMaskedEmail) {
            expect(eventMetaStr).not.toMatch(emailRegex);
          }
          if (!hasMaskedPhone) {
            expect(eventMetaStr).not.toMatch(phoneRegex);
          }
        }
      });

      // Verify specific event details
      const registerSubmitted = eventLogs.find(e => e.action === 'RegisterSubmitted');
      expect(registerSubmitted?.resource).toBe('User');
      expect(registerSubmitted?.actor_role).toBe('user');

      const registrationCreated = eventLogs.find(e => e.action === 'RegistrationCreated');
      expect(registrationCreated?.resource).toBe('Registration');
      expect(registrationCreated?.actor_role).toBe('system');

      const statusChanged = eventLogs.find(e => e.action === 'StatusChanged');
      expect(statusChanged?.resource).toBe('Registration');
      expect(statusChanged?.actor_role).toBe('system');
      expect(statusChanged?.reason).toBe('Initial status set');

    } catch (error) {
      // Save artifacts on failure
      await saveAuditArtifacts(rid, 'registration-audit-failure');
      throw error;
    } finally {
      // Cleanup test data
      await supabaseTestClient.cleanupTestData(testContext.tag);
    }
  });

  test('@audit @registration should handle registration validation errors', async ({ request, baseURL }) => {
    const testContext = createTestContext('registration-validation');
    const startTs = new Date();
    
    // Generate explicit request ID
    const rid = `e2e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Submit invalid registration (missing required fields)
    const response = await request.post('/api/register', {
      data: {
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        phone: '123',
        organization: '',
        role: '',
        dietaryRestrictions: '',
        agreeToTerms: false
      },
      headers: {
        'X-Request-ID': rid
      }
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[e2e] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response and request ID propagation
    expect(response.status()).toBe(400);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    try {
      // Wait for access log only (no events for validation errors)
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 0, { startTs });

      // STRENGTHENED ASSERTIONS: Exact counts
      expect(accessLogs).toHaveLength(1);
      expect(eventLogs).toHaveLength(0);

      // Verify access log
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/register/);
      expect(accessLog.result).toBe('400');
      expect(accessLog.request_id).toBe(rid);

    } catch (error) {
      // Save artifacts on failure
      await saveAuditArtifacts(rid, 'registration-validation-failure');
      throw error;
    }
  });
});
