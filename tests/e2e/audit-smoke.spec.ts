import { test, expect } from '@playwright/test';
import { supabaseTestClient } from './helpers/supabaseTestClient';
import { waitForLogs } from './helpers/logPoller';

/**
 * Audit Smoke Test
 * 
 * Validates audit plumbing end-to-end:
 * - Every API response includes x-request-id
 * - Access logs are written to audit.access_log
 * - Event logs are written to audit.event_log with correlation_id = request_id
 */

test.describe('@audit-smoke', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

  test('Scenario A: Access Log Validation', async ({ request }) => {
    // Call instrumented API endpoint
    const response = await request.post(`${BASE_URL}/api/test-audit`, {
      data: {
        test: 'data',
        timestamp: new Date().toISOString()
      }
    });

    // Verify response includes x-request-id
    const requestId = response.headers()['x-request-id'];
    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBeGreaterThan(0);

    console.log(`Captured request ID: ${requestId}`);

    // Poll for access log entry
    const pollingResult = await waitForLogs(requestId, { access: 1, events: 0 }, {
      timeoutMs: 30000, // 30 seconds
      intervalMs: 1000  // 1 second intervals
    });

    expect(pollingResult.success).toBe(true);
    expect(pollingResult.accessLogs).toHaveLength(1);

    const accessLog = pollingResult.accessLogs[0];

    // Assert required fields
    expect(accessLog.action).toBe('api:POST /api/test-audit');
    expect(accessLog.resource).toBe('test-audit');
    expect(accessLog.request_id).toBe(requestId);
    expect(accessLog.result).toBe('success');
    expect(accessLog.latency_ms).toBeGreaterThan(0);
    expect(accessLog.src_ip).toBeTruthy();
    expect(accessLog.user_agent).toBeTruthy();
    expect(accessLog.row_hash).toBeTruthy();

    console.log('✅ Access log validation passed');
    console.log(`   Action: ${accessLog.action}`);
    console.log(`   Resource: ${accessLog.resource}`);
    console.log(`   Latency: ${accessLog.latency_ms}ms`);
    console.log(`   IP: ${accessLog.src_ip}`);
  });

  test('Scenario B: Event Log Validation', async ({ request }) => {
    // Call diagnostic event endpoint
    const response = await request.get(`${BASE_URL}/api/diag/audit-rpc`);

    // Verify response includes x-request-id
    const requestId = response.headers()['x-request-id'];
    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBeGreaterThan(0);

    console.log(`Captured request ID: ${requestId}`);

    // Verify response body
    const responseBody = await response.json();
    expect(responseBody.ok).toBe(true);
    expect(responseBody.requestId).toBe(requestId);

    // Poll for event log entry
    const pollingResult = await waitForLogs(requestId, { access: 1, events: 1 }, {
      timeoutMs: 30000, // 30 seconds
      intervalMs: 1000  // 1 second intervals
    });

    expect(pollingResult.success).toBe(true);
    expect(pollingResult.accessLogs).toHaveLength(1);
    expect(pollingResult.eventLogs).toHaveLength(1);

    const accessLog = pollingResult.accessLogs[0];
    const eventLog = pollingResult.eventLogs[0];

    // Assert access log fields
    expect(accessLog.action).toBe('api:GET /api/diag/audit-rpc');
    expect(accessLog.resource).toBe('diag/audit-rpc');
    expect(accessLog.request_id).toBe(requestId);
    expect(accessLog.result).toBe('success');

    // Assert event log fields
    expect(eventLog.action).toBe('DiagEvent');
    expect(eventLog.resource).toBe('System');
    expect(eventLog.correlation_id).toBe(requestId);
    expect(eventLog.actor_role).toBe('system');
    expect(eventLog.result).toBe('success');
    expect(eventLog.row_hash).toBeTruthy();

    // Verify correlation chain integrity
    expect(eventLog.correlation_id).toBe(accessLog.request_id);

    console.log('✅ Event log validation passed');
    console.log(`   Event Action: ${eventLog.action}`);
    console.log(`   Event Resource: ${eventLog.resource}`);
    console.log(`   Correlation ID: ${eventLog.correlation_id}`);
    console.log(`   Actor Role: ${eventLog.actor_role}`);
  });

  test('Scenario C: Registration Flow Audit Validation', async ({ request }) => {
    // Create test registration data (no PII)
    const testData = {
      title: 'Mr.',
      firstName: 'Test',
      lastName: 'User',
      nickname: 'testuser',
      phone: '0812345678',
      lineId: 'testuser123',
      email: 'test@example.com',
      companyName: 'Test Company',
      businessType: 'technology',
      yecProvince: 'bangkok',
      hotelChoice: 'in-quota',
      roomType: 'single',
      travelType: 'private-car',
      profileImage: null,
      chamberCard: null,
      paymentSlip: null
    };

    // Call registration endpoint
    const response = await request.post(`${BASE_URL}/api/register`, {
      data: testData
    });

    // Verify response includes x-request-id
    const requestId = response.headers()['x-request-id'];
    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBeGreaterThan(0);

    console.log(`Captured request ID: ${requestId}`);

    // Poll for audit logs (expect 1 access log + multiple event logs)
    const pollingResult = await waitForLogs(requestId, { access: 1, events: 3 }, {
      timeoutMs: 30000, // 30 seconds
      intervalMs: 1000  // 1 second intervals
    });

    expect(pollingResult.success).toBe(true);
    expect(pollingResult.accessLogs).toHaveLength(1);
    expect(pollingResult.eventLogs.length).toBeGreaterThanOrEqual(3);

    const accessLog = pollingResult.accessLogs[0];

    // Assert access log fields
    expect(accessLog.action).toBe('api:POST /api/register');
    expect(accessLog.resource).toBe('registration');
    expect(accessLog.request_id).toBe(requestId);
    expect(accessLog.result).toBe('success');

    // Assert event logs have correct correlation
    for (const eventLog of pollingResult.eventLogs) {
      expect(eventLog.correlation_id).toBe(requestId);
      expect(eventLog.row_hash).toBeTruthy();
    }

    // Check for expected domain events
    const eventActions = pollingResult.eventLogs.map(log => log.action);
    expect(eventActions).toContain('RegisterSubmitted');
    expect(eventActions).toContain('RegistrationCreated');
    expect(eventActions).toContain('StatusChanged');

    console.log('✅ Registration flow audit validation passed');
    console.log(`   Access Log: ${accessLog.action}`);
    console.log(`   Event Logs: ${eventActions.join(', ')}`);
    console.log(`   Total Events: ${pollingResult.eventLogs.length}`);
  });
});
