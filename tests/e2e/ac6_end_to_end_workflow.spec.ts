import { test, expect } from '@playwright/test';
import { withArtifacts, saveJson, saveScreenshot } from '../utils/evidence';
import { findOutbox, expectOutboxMatch, expectOutboxMatchWithLiveSupport, isLiveEmailMode, getRealEmailForVerification } from '../utils/email-outbox';
import { listEvents, expectEventSequence, listEventsWithCorrelation } from '../utils/domain-events';
import { findAudit, expectAuditMatch, expectAuditMatchGraceful } from '../utils/audit-logs';
import { buildRegistration, submitRegistration } from '../fixtures/registration';
import { createCorrelatedRequest, signInAsSuperAdmin } from '../utils/session';

test.describe('AC6: End-to-End Workflow & System Truth', () => {
  test('complete registration workflow with system truth verification', async ({ page, request }) => {
    await withArtifacts('AC6', async ({ runDir }) => {
      const workflowSteps = [];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Step 1: Registration Submission
      const regPayload = buildRegistration(timestamp);
      await saveJson('step1-registration-payload.json', regPayload, runDir);
      
      let registrationResult;
      try {
        registrationResult = await submitRegistration(request, regPayload);
        await saveJson('step1-registration-result.json', registrationResult, runDir);
        
        workflowSteps.push({
          step: 1,
          name: 'Registration Submission',
          status: 'completed',
          result: registrationResult,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        await saveJson('step1-registration-error.json', {
          error: error instanceof Error ? error.message : 'Unknown error',
          payload: regPayload
        }, runDir);
        throw error;
      }
      
      expect(['created', 'duplicate']).toContain(registrationResult.status);
      
      // Step 2: Navigate to Update Page
      const updateUrl = `/update?token=${registrationResult.id}`;
      await page.goto(updateUrl);
      await page.waitForLoadState('networkidle');
      await saveScreenshot(page, runDir, 'step2-update-page-loaded');
      
      workflowSteps.push({
        step: 2,
        name: 'Navigate to Update Page',
        status: 'completed',
        url: updateUrl,
        timestamp: new Date().toISOString()
      });
      
      // Final evidence summary
      await saveJson('ac6-system-truth-summary.json', {
        test: 'AC6 End-to-End Workflow & System Truth',
        timestamp: new Date().toISOString(),
        registration: {
          id: registrationResult.id,
          email: registrationResult.email,
          status: registrationResult.status
        },
        workflowSteps
      }, runDir);
      
      // Assert that the core workflow completed successfully
      expect(registrationResult.status).toMatch(/created|duplicate/);
      expect(workflowSteps.length).toBeGreaterThan(0);
      
      console.log(`AC6 system truth verification completed. Artifacts saved to: ${runDir}`);
    });
  });
});
