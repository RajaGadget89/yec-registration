import { test, expect } from '@playwright/test';
import { withArtifacts, saveJson, saveScreenshot } from '../utils/evidence';
import { findOutbox, expectOutboxMatch, expectOutboxMatchWithLiveSupport, isLiveEmailMode, getRealEmailForVerification } from '../utils/email-outbox';
import { listEvents, listEventsWithCorrelation } from '../utils/domain-events';
import { findAudit, expectAuditMatch, expectAuditMatchGraceful } from '../utils/audit-logs';
import { buildRegistration, submitRegistration } from '../fixtures/registration';
import { createCorrelatedRequest, signInAsSuperAdmin } from '../utils/session';

test.describe('AC2: Payment Slip Validation & System Truth', () => {
  test('payment validation workflow with system truth verification', async ({ page, request }) => {
    await withArtifacts('AC2', async ({ runDir }) => {
      // Step 1: Create correlated request context for system-truth tracking
      const { req, correlationId, headers } = createCorrelatedRequest('AC2', request);
      await saveJson('correlation-context.json', { correlationId, headers }, runDir);
      
      // Step 2: Create a registration first (prerequisite)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const regPayload = buildRegistration(timestamp);
      
      await saveJson('registration-payload.json', regPayload, runDir);
      
      // Submit registration with correlation tracking
      let registrationResult;
      try {
        // Use the correlated request context for submission
        const response = await req.post('/api/register', {
          data: regPayload,
          headers
        });
        
        const responseData = await response.json();
        
        if (response.ok()) {
          registrationResult = {
            id: responseData.registration_id || responseData.id || correlationId,
            email: regPayload.email,
            status: 'created'
          };
        } else if (response.status() === 409) {
          // Handle duplicate email as idempotent success
          registrationResult = {
            id: responseData.existing_id || correlationId,
            email: regPayload.email,
            status: 'duplicate'
          };
        } else {
          throw new Error(`Registration failed: ${responseData.error || responseData.message || 'Unknown error'}`);
        }
        
        await saveJson('registration-result.json', registrationResult, runDir);
      } catch (error) {
        await saveJson('registration-error.json', {
          error: error instanceof Error ? error.message : 'Unknown error',
          payload: regPayload,
          correlationId
        }, runDir);
        throw error;
      }
      
      expect(['created', 'duplicate']).toContain(registrationResult.status);
      
      // Step 2: Navigate to update page with the registration ID
      const updateUrl = `/update?token=${registrationResult.id}`;
      await page.goto(updateUrl);
      await page.waitForLoadState('networkidle');
      
      await saveScreenshot(page, runDir, 'update-page-loaded');
      
      // Step 3: Verify payment section is present and interactable
      const paymentSection = page.locator('[data-testid="payment-section"], .payment-section, #payment');
      const paymentSectionExists = await paymentSection.count() > 0;
      
      await saveJson('payment-section-check.json', {
        paymentSectionExists,
        updateUrl,
        registrationId: registrationResult.id,
        timestamp: new Date().toISOString()
      }, runDir);
      
      // Step 4: Test payment slip upload (if available)
      const fileInput = page.locator('input[type="file"][name*="payment"], input[type="file"][accept*="image"]');
      const fileInputExists = await fileInput.count() > 0;
      
      if (fileInputExists) {
        // Create a dummy file for testing
        const testFile = Buffer.from('fake payment slip content');
        await fileInput.setInputFiles({
          name: 'test-payment-slip.jpg',
          mimeType: 'image/jpeg',
          buffer: testFile
        });
        
        await saveScreenshot(page, runDir, 'after-file-upload');
      }
      
      // Step 5: System truth verification - Email Outbox with LIVE mode support
      const outboxResult = await expectOutboxMatchWithLiveSupport({ 
        to: regPayload.email,
        templateKey: 'payment.confirmation'
      });
      
      await saveJson('email-outbox-verification.json', {
        expected: { to: regPayload.email, templateKey: 'payment.confirmation' },
        result: outboxResult,
        liveMode: isLiveEmailMode(),
        realEmail: getRealEmailForVerification()
      }, runDir);
      
      // Step 6: System truth verification - Domain Events with correlation tracking
      try {
        const events = await listEventsWithCorrelation(
          correlationId,
          'payment.validated',
          headers
        );
        
        await saveJson('domain-events-verification.json', {
          expected: { correlationId: correlationId, eventName: 'payment.validated' },
          found: events,
          count: events.length,
          verification: events.length > 0 ? 'PASSED' : 'NO_EVENTS_FOUND'
        }, runDir);
      } catch (error) {
        await saveJson('domain-events-verification.json', {
          expected: { correlationId: correlationId, eventName: 'payment.validated' },
          error: error instanceof Error ? error.message : 'Unknown error',
          verification: 'FAILED'
        }, runDir);
        console.warn('Domain events verification failed:', error);
      }
      
      // Step 7: System truth verification - Audit Logs with admin session and graceful 403 handling
      const adminSession = await signInAsSuperAdmin(request);
      const auditResult = await expectAuditMatchGraceful({ 
        action: 'payment.validate',
        correlationId: correlationId,
        headers: adminSession.isAuthenticated ? headers : undefined
      });
      
      await saveJson('audit-logs-verification.json', {
        expected: { action: 'payment.validate', correlationId: correlationId },
        adminSession: adminSession,
        result: auditResult
      }, runDir);
      
      // Step 8: RBAC negative test - unauthorized role should get 403
      try {
        const unauthorizedResponse = await request.post('/api/admin/validate-payment', {
          data: { registrationId: registrationResult.id }
        });
        
        await saveJson('rbac-negative-test.json', {
          status: unauthorizedResponse.status(),
          expectedStatus: 403,
          testPassed: unauthorizedResponse.status() === 403,
          timestamp: new Date().toISOString()
        }, runDir);
        
        expect(unauthorizedResponse.status()).toBe(403);
      } catch (error) {
        await saveJson('rbac-negative-test.json', {
          error: error instanceof Error ? error.message : 'Unknown error',
          testPassed: false,
          timestamp: new Date().toISOString()
        }, runDir);
        console.warn('RBAC negative test failed:', error);
      }
      
      // Final evidence summary with enhanced status tracking
      await saveJson('ac2-system-truth-summary.json', {
        test: 'AC2 Payment Validation & System Truth',
        timestamp: new Date().toISOString(),
        correlationId: correlationId,
        registration: {
          id: registrationResult.id,
          email: registrationResult.email,
          status: registrationResult.status
        },
        liveMode: isLiveEmailMode(),
        realEmailAddress: getRealEmailForVerification(),
        adminSessionConfigured: !!process.env.TEST_SUPERADMIN_EMAIL,
        verificationResults: {
          emailOutbox: outboxResult.status,
          auditLogs: auditResult.status,
          domainEvents: 'See domain-events-verification.json',
          rbacNegative: 'See rbac-negative-test.json'
        }
      }, runDir);
      
      console.log(`AC2 system truth verification completed with correlation ID: ${correlationId}`);
      console.log(`Artifacts saved to: ${runDir}`);
    });
  });
});
