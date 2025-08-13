import { test, expect, Page } from '@playwright/test';
import { supabaseTestClient } from './helpers/supabaseTestClient';
import { waitForLogs, waitForSpecificEvents, verifyAuditLogConsistency } from './helpers/logPoller';
import { createTestContext, SAMPLE_REGISTRATION_DATA, EXPECTED_AUDIT_EVENTS } from './helpers/testData';

test.describe('Audit Logging E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('@audit smoke', () => {
    test('should log audit events for test endpoint', async () => {
      const testContext = createTestContext('audit-smoke');
      
      // Make request to test audit endpoint
      const response = await page.request.post('/api/test-audit', {
        headers: testContext.headers,
        data: { test: 'data' }
      });

      expect(response.status()).toBe(200);
      
      // Extract request ID from response headers
      const requestId = response.headers()['x-request-id'];
      expect(requestId).toBeDefined();
      expect(requestId).toBe(testContext.headers['X-Request-ID']);

      // Wait for audit logs to appear
      const logResult = await waitForLogs(requestId, {
        access: 1,
        events: 0 // Test endpoint doesn't emit domain events
      });

      expect(logResult.success).toBe(true);
      expect(logResult.accessLogs).toHaveLength(1);
      expect(logResult.eventLogs).toHaveLength(0);

      // Verify access log content with all required fields
      const accessLog = logResult.accessLogs[0];
      expect(accessLog.action).toBe('api:POST /api/test-audit');
      expect(accessLog.resource).toBe('test-audit');
      expect(accessLog.request_id).toBe(requestId);
      expect(accessLog.status_code).toBe(200);
      expect(accessLog.latency_ms).toBeGreaterThan(0);
      expect(accessLog.src_ip).toBeDefined();
      expect(accessLog.user_agent).toBeDefined();
      expect(accessLog.row_hash).toBeDefined();
      
      // Verify result field (status or success/fail)
      expect(accessLog.result).toBeDefined();
      expect(['success', 'fail', '200', '400', '500']).toContain(accessLog.result);

      // Verify consistency
      const consistency = verifyAuditLogConsistency(logResult.accessLogs, logResult.eventLogs, requestId);
      expect(consistency.valid).toBe(true);
    });
  });

  test.describe('@audit @registration', () => {
    test('should log audit events for successful registration', async () => {
      const testContext = createTestContext('registration-happy-path');
      const registrationData = SAMPLE_REGISTRATION_DATA.basic;
      
      // Submit registration
      const response = await page.request.post('/api/register', {
        headers: testContext.headers,
        data: registrationData
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      
      // Extract request ID from response headers
      const requestId = response.headers()['x-request-id'];
      expect(requestId).toBeDefined();

      // Wait for audit logs to appear - expect 3 events: RegisterSubmitted, RegistrationCreated, StatusChanged
      const logResult = await waitForLogs(requestId, {
        access: 1,
        events: 3 // RegisterSubmitted + RegistrationCreated + StatusChanged
      });

      expect(logResult.success).toBe(true);
      expect(logResult.accessLogs).toHaveLength(1);
      expect(logResult.eventLogs.length).toBeGreaterThanOrEqual(3);

      // Verify access log with all required fields
      const accessLog = logResult.accessLogs[0];
      expect(accessLog.action).toBe('api:POST /api/register');
      expect(accessLog.resource).toBe('registration');
      expect(accessLog.request_id).toBe(requestId);
      expect(accessLog.status_code).toBe(200);
      expect(accessLog.latency_ms).toBeGreaterThan(0);
      expect(accessLog.src_ip).toBeDefined();
      expect(accessLog.user_agent).toBeDefined();
      expect(accessLog.row_hash).toBeDefined();
      expect(accessLog.result).toBeDefined();

      // Verify event logs with all required fields
      const eventActions = logResult.eventLogs.map(log => log.action);
      expect(eventActions).toContain('RegisterSubmitted');
      expect(eventActions).toContain('RegistrationCreated');
      expect(eventActions).toContain('StatusChanged');

      // Verify each event log has required fields and shared correlation_id
      logResult.eventLogs.forEach(eventLog => {
        expect(eventLog.action).toBeDefined();
        expect(eventLog.resource).toBeDefined();
        expect(eventLog.correlation_id).toBe(requestId); // All events must share the same correlation_id
        expect(eventLog.actor_role).toBeDefined();
        expect(eventLog.result).toBeDefined();
        expect(eventLog.row_hash).toBeDefined();
        
        // Verify no PII in logged data
        if (eventLog.after_state) {
          const afterState = eventLog.after_state;
          // Check that email is masked if present
          if (afterState.email_masked) {
            expect(afterState.email_masked).toMatch(/^[a-zA-Z0-9]{1,2}\*+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
          }
          // Check that phone is masked if present
          if (afterState.phone_masked) {
            expect(afterState.phone_masked).toMatch(/^[0-9]{1,2}\*+[0-9]{1,2}$/);
          }
          // Ensure no raw email or phone fields
          expect(afterState.email).toBeUndefined();
          expect(afterState.phone).toBeUndefined();
        }
      });

      // Verify specific event details
      const registerSubmittedEvent = logResult.eventLogs.find(log => log.action === 'RegisterSubmitted');
      expect(registerSubmittedEvent).toBeDefined();
      expect(registerSubmittedEvent?.resource).toBe('User');
      expect(registerSubmittedEvent?.actor_role).toBe('user');

      const registrationCreatedEvent = logResult.eventLogs.find(log => log.action === 'RegistrationCreated');
      expect(registrationCreatedEvent).toBeDefined();
      expect(registrationCreatedEvent?.resource).toBe('Registration');
      expect(registrationCreatedEvent?.actor_role).toBe('system');

      const statusChangedEvent = logResult.eventLogs.find(log => log.action === 'StatusChanged');
      expect(statusChangedEvent).toBeDefined();
      expect(statusChangedEvent?.resource).toBe('Registration');
      expect(statusChangedEvent?.actor_role).toBe('system');
      expect(statusChangedEvent?.before_state?.status).toBe('pending');
      expect(statusChangedEvent?.after_state?.status).toBe('waiting_for_review');
      expect(statusChangedEvent?.reason).toBe('Registration submitted for review');

      // Verify correlation consistency
      const consistency = verifyAuditLogConsistency(logResult.accessLogs, logResult.eventLogs, requestId);
      expect(consistency.valid).toBe(true);

      // Clean up test data
      await supabaseTestClient.cleanupTestData(testContext.tag);
    });
  });

  test.describe('@audit sendback', () => {
    test('should log audit events for send-back flow', async () => {
      const testContext = createTestContext('send-back-flow');
      
      // First, create a test registration
      const registrationData = SAMPLE_REGISTRATION_DATA.basic;
      const registration = await supabaseTestClient.createTestRegistration({
        ...registrationData,
        email: `test-${testContext.testId}@example.com`,
        status: 'waiting_for_review'
      });

      // Create test admin user
      const adminUser = await supabaseTestClient.createTestAdmin(testContext.adminData.email);

      // Send back the registration (simulate admin action)
      const sendBackResponse = await page.request.post(`/api/admin/registrations/${registration.id}/request-update`, {
        headers: {
          ...testContext.headers,
          'Cookie': `admin-email=${testContext.adminData.email}` // Simplified auth
        },
        data: {
          reason: 'Missing required documents',
          action: 'send_back'
        }
      });

      expect(sendBackResponse.status()).toBe(200);
      
      const requestId = sendBackResponse.headers()['x-request-id'];
      expect(requestId).toBeDefined();

      // Wait for audit logs
      const logResult = await waitForLogs(requestId, {
        access: 1,
        events: 1 // StatusChanged event
      });

      expect(logResult.success).toBe(true);
      expect(logResult.accessLogs).toHaveLength(1);
      expect(logResult.eventLogs.length).toBeGreaterThanOrEqual(1);

      // Verify access log with all required fields
      const accessLog = logResult.accessLogs[0];
      expect(accessLog.action).toBe('api:POST /api/admin/registrations/[id]/request-update');
      expect(accessLog.resource).toBe('admin/request-update');
      expect(accessLog.request_id).toBe(requestId);
      expect(accessLog.status_code).toBe(200);
      expect(accessLog.latency_ms).toBeGreaterThan(0);
      expect(accessLog.src_ip).toBeDefined();
      expect(accessLog.user_agent).toBeDefined();
      expect(accessLog.row_hash).toBeDefined();
      expect(accessLog.result).toBeDefined();

      // Verify event logs
      const eventActions = logResult.eventLogs.map(log => log.action);
      expect(eventActions).toContain('StatusChanged');

      // Verify the status change event details
      const statusChangeEvent = logResult.eventLogs.find(log => log.action === 'StatusChanged');
      expect(statusChangeEvent).toBeDefined();
      expect(statusChangeEvent?.before_state?.status).toBe('waiting_for_review');
      expect(statusChangeEvent?.after_state?.status).toBe('needs_update');
      expect(statusChangeEvent?.resource_id).toBe(registration.id);
      expect(statusChangeEvent?.actor_role).toBeDefined();
      expect(statusChangeEvent?.result).toBeDefined();
      expect(statusChangeEvent?.row_hash).toBeDefined();
      expect(statusChangeEvent?.reason).toBeDefined(); // Optional reason field

      // Clean up test data
      await supabaseTestClient.cleanupTestData(testContext.tag);
    });
  });

  test.describe('@audit approve', () => {
    test('should log audit events for admin approval', async () => {
      const testContext = createTestContext('admin-approval');
      
      // Create a test registration ready for approval
      const registrationData = SAMPLE_REGISTRATION_DATA.basic;
      const registration = await supabaseTestClient.createTestRegistration({
        ...registrationData,
        email: `test-${testContext.testId}@example.com`,
        status: 'waiting_for_review'
      });

      // Create test admin user
      const adminUser = await supabaseTestClient.createTestAdmin(testContext.adminData.email);

      // Approve the registration
      const approveResponse = await page.request.post(`/api/admin/registrations/${registration.id}/approve`, {
        headers: {
          ...testContext.headers,
          'Cookie': `admin-email=${testContext.adminData.email}` // Simplified auth
        }
      });

      expect(approveResponse.status()).toBe(200);
      
      const requestId = approveResponse.headers()['x-request-id'];
      expect(requestId).toBeDefined();

      // Wait for audit logs
      const logResult = await waitForLogs(requestId, {
        access: 1,
        events: 1 // AdminReviewed event
      });

      expect(logResult.success).toBe(true);
      expect(logResult.accessLogs).toHaveLength(1);
      expect(logResult.eventLogs.length).toBeGreaterThanOrEqual(1);

      // Verify access log with all required fields
      const accessLog = logResult.accessLogs[0];
      expect(accessLog.action).toBe('api:POST /api/admin/registrations/[id]/approve');
      expect(accessLog.resource).toBe('admin/approve');
      expect(accessLog.request_id).toBe(requestId);
      expect(accessLog.status_code).toBe(200);
      expect(accessLog.latency_ms).toBeGreaterThan(0);
      expect(accessLog.src_ip).toBeDefined();
      expect(accessLog.user_agent).toBeDefined();
      expect(accessLog.row_hash).toBeDefined();
      expect(accessLog.result).toBeDefined();

      // Verify event logs
      const eventActions = logResult.eventLogs.map(log => log.action);
      expect(eventActions).toContain('AdminReviewed');

      // Verify the approval event details
      const approvalEvent = logResult.eventLogs.find(log => log.action === 'AdminReviewed');
      expect(approvalEvent).toBeDefined();
      expect(approvalEvent?.admin_email).toBe(testContext.adminData.email);
      expect(approvalEvent?.registration_id).toBe(registration.id);
      expect(approvalEvent?.resource_id).toBe(registration.id);
      expect(approvalEvent?.actor_role).toBeDefined();
      expect(approvalEvent?.result).toBeDefined();
      expect(approvalEvent?.row_hash).toBeDefined();

      // Check for BadgeIssued event (if badge generation is working)
      const badgeEvent = logResult.eventLogs.find(log => log.action === 'BadgeIssued');
      if (badgeEvent) {
        expect(badgeEvent?.registration_id).toBe(registration.id);
        expect(badgeEvent?.correlation_id).toBe(requestId);
        expect(badgeEvent?.resource_id).toBe(registration.id);
        expect(badgeEvent?.actor_role).toBeDefined();
        expect(badgeEvent?.result).toBeDefined();
        expect(badgeEvent?.row_hash).toBeDefined();
      }

      // Clean up test data
      await supabaseTestClient.cleanupTestData(testContext.tag);
    });
  });

  test.describe('@audit comprehensive', () => {
    test('should maintain consistent correlation across full workflow', async () => {
      const testContext = createTestContext('comprehensive-workflow');
      
      // Step 1: Registration
      const registrationData = SAMPLE_REGISTRATION_DATA.basic;
      const registrationResponse = await page.request.post('/api/register', {
        headers: testContext.headers,
        data: registrationData
      });

      expect(registrationResponse.status()).toBe(200);
      const registrationRequestId = registrationResponse.headers()['x-request-id'];

      // Step 2: Admin review (send back)
      const registration = await supabaseTestClient.createTestRegistration({
        ...registrationData,
        email: `test-${testContext.testId}@example.com`,
        status: 'waiting_for_review'
      });

      const sendBackResponse = await page.request.post(`/api/admin/registrations/${registration.id}/request-update`, {
        headers: {
          ...testContext.headers,
          'Cookie': `admin-email=${testContext.adminData.email}`
        },
        data: { reason: 'Missing documents', action: 'send_back' }
      });

      expect(sendBackResponse.status()).toBe(200);
      const sendBackRequestId = sendBackResponse.headers()['x-request-id'];

      // Step 3: Admin approval
      const approveResponse = await page.request.post(`/api/admin/registrations/${registration.id}/approve`, {
        headers: {
          ...testContext.headers,
          'Cookie': `admin-email=${testContext.adminData.email}`
        }
      });

      expect(approveResponse.status()).toBe(200);
      const approveRequestId = approveResponse.headers()['x-request-id'];

      // Verify all request IDs are unique
      expect(registrationRequestId).not.toBe(sendBackRequestId);
      expect(sendBackRequestId).not.toBe(approveRequestId);
      expect(registrationRequestId).not.toBe(approveRequestId);

      // Wait for all audit logs
      const [registrationLogs, sendBackLogs, approveLogs] = await Promise.all([
        waitForLogs(registrationRequestId, { access: 1, events: 2 }),
        waitForLogs(sendBackRequestId, { access: 1, events: 1 }),
        waitForLogs(approveRequestId, { access: 1, events: 1 })
      ]);

      expect(registrationLogs.success).toBe(true);
      expect(sendBackLogs.success).toBe(true);
      expect(approveLogs.success).toBe(true);

      // Verify correlation consistency for each request
      expect(verifyAuditLogConsistency(registrationLogs.accessLogs, registrationLogs.eventLogs, registrationRequestId).valid).toBe(true);
      expect(verifyAuditLogConsistency(sendBackLogs.accessLogs, sendBackLogs.eventLogs, sendBackRequestId).valid).toBe(true);
      expect(verifyAuditLogConsistency(approveLogs.accessLogs, approveLogs.eventLogs, approveRequestId).valid).toBe(true);

      // Clean up test data
      await supabaseTestClient.cleanupTestData(testContext.tag);
    });
  });
});
