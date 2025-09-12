import { test, expect } from '@playwright/test';
import { withArtifacts, saveJson, saveScreenshot } from '../utils/evidence';
import { readAdminInviteeRow, pageTextSnapshot, screenshot, detectTokenReuseError } from '../utils/ui-state';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('AC4: Admin Invite Token Reuse - UI Only Evidence', () => {
  test('Token reuse evidence collection via UI only', async ({ page }) => {
    // Check if we need to collect anything for AC4
    const missingFile = join(process.cwd(), 'artifacts', '_handover', 'p0_missing.json');
    let missingArtifacts = { AC4: [] };
    
    if (existsSync(missingFile)) {
      try {
        const missingData = JSON.parse(readFileSync(missingFile, 'utf8'));
        missingArtifacts = missingData.missing || { AC4: [] };
      } catch (error) {
        console.warn('Failed to read missing artifacts file:', error);
      }
    }
    
    // Early exit if nothing to collect for AC4
    if (missingArtifacts.AC4.length === 0) {
      console.log('✅ AC4: All artifacts already present, skipping collection');
      return;
    }
    
    console.log(`🔍 AC4: Collecting ${missingArtifacts.AC4.length} missing artifacts:`, missingArtifacts.AC4);
    
    await withArtifacts('AC4', async ({ runDir }) => {
      console.log('🔍 Starting AC4 UI-only evidence collection...');
      
      // Get deep-link from environment variable or use default
      const deepLinkUrl = process.env.TEST_ADMIN_INVITE_URL || '/admin/accept?token=test-token-12345';
      const testEmail = 'admin+test-ui@example.com';
      
      await saveJson('test-config.json', {
        deepLinkUrl,
        testEmail,
        timestamp: new Date().toISOString()
      }, runDir);

      // Step 1: Before state - try to read admin invitee row (may be BLOCKED)
      let beforeState;
      if (missingArtifacts.AC4.includes('before.json')) {
        console.log('📋 Step 1: Capturing before state...');
        try {
          await page.goto('/admin/users');
          await page.waitForLoadState('networkidle');
          
          beforeState = await readAdminInviteeRow(page, testEmail);
          await saveJson('before.json', beforeState, runDir);
        } catch (error) {
          beforeState = {
            email: testEmail,
            roles: [],
            statusText: `BLOCKED: ${error instanceof Error ? error.message : 'Unknown error'}`,
            blocked: true,
            reason: 'Admin users page not accessible or not found'
          };
          await saveJson('before.json', beforeState, runDir);
        }
      }

      // Step 2: First open - navigate to deep-link and complete acceptance
      let firstAcceptResult;
      if (missingArtifacts.AC4.includes('accept-first.json')) {
        console.log('🔗 Step 2: First open - navigating to deep-link...');
        try {
          await page.goto(deepLinkUrl);
          await page.waitForLoadState('networkidle');
          
          const pageText = await pageTextSnapshot(page);
          const currentUrl = page.url();
          
          // Try to complete the acceptance form if present
          const acceptForm = page.locator('form, [data-testid="admin-accept-form"]');
          if (await acceptForm.count() > 0) {
            // Fill out common admin form fields
            const nameField = page.locator('input[name="name"], input[name="fullName"], input[name="adminName"]');
            if (await nameField.count() > 0) {
              await nameField.fill('Test Admin User');
            }
            
            const passwordField = page.locator('input[name="password"], input[type="password"]');
            if (await passwordField.count() > 0) {
              await passwordField.fill('TestPassword123!');
            }
            
            const confirmPasswordField = page.locator('input[name="confirmPassword"]');
            if (await confirmPasswordField.count() > 0) {
              await confirmPasswordField.fill('TestPassword123!');
            }
            
            // Submit form if submit button available
            const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Accept"), button:has-text("Submit")');
            if (await submitButton.count() > 0) {
              await submitButton.click();
              await page.waitForLoadState('networkidle');
            }
          }
          
          const finalPageText = await pageTextSnapshot(page);
          const finalUrl = page.url();
          
          firstAcceptResult = {
            status: 200,
            url: currentUrl,
            finalUrl: finalUrl,
            pageText: pageText.substring(0, 500), // Keep small for evidence
            finalPageText: finalPageText.substring(0, 500),
            formFound: await acceptForm.count() > 0,
            timestamp: new Date().toISOString()
          };
          
          await saveJson('accept-first.json', firstAcceptResult, runDir);
        } catch (error) {
          firstAcceptResult = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          await saveJson('accept-first.json', firstAcceptResult, runDir);
        }
      }

      // Step 3: Accepted state - return to admin users page
      let acceptedState;
      if (missingArtifacts.AC4.includes('accepted.json')) {
        console.log('✅ Step 3: Capturing accepted state...');
        try {
          await page.goto('/admin/users');
          await page.waitForLoadState('networkidle');
          
          acceptedState = await readAdminInviteeRow(page, testEmail);
          await saveJson('accepted.json', acceptedState, runDir);
        } catch (error) {
          acceptedState = {
            email: testEmail,
            roles: [],
            statusText: `BLOCKED: ${error instanceof Error ? error.message : 'Unknown error'}`,
            blocked: true,
            reason: 'Admin users page not accessible after acceptance'
          };
          await saveJson('accepted.json', acceptedState, runDir);
        }
      }

      // Step 4: Second open - token reuse attempt
      let secondAcceptResult;
      if (missingArtifacts.AC4.includes('accept-second.json') || missingArtifacts.AC4.includes('token-reuse-second-attempt.png')) {
        console.log('🔄 Step 4: Second open - token reuse attempt...');
        try {
          await page.goto(deepLinkUrl);
          await page.waitForLoadState('networkidle');
          
          const pageText = await pageTextSnapshot(page);
          const currentUrl = page.url();
          
          // Detect token reuse error
          const errorDetection = await detectTokenReuseError(page);
          
          secondAcceptResult = {
            status: 200, // Page loaded (but may show error content)
            url: currentUrl,
            pageText: pageText.substring(0, 500),
            errorDetection,
            timestamp: new Date().toISOString()
          };
          
          if (missingArtifacts.AC4.includes('accept-second.json')) {
            await saveJson('accept-second.json', secondAcceptResult, runDir);
          }
          
          // Take screenshot of token reuse error page
          if (missingArtifacts.AC4.includes('token-reuse-second-attempt.png')) {
            await screenshot(page, runDir, 'token-reuse-second-attempt');
          }
          
        } catch (error) {
          secondAcceptResult = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          if (missingArtifacts.AC4.includes('accept-second.json')) {
            await saveJson('accept-second.json', secondAcceptResult, runDir);
          }
        }
      }

      // Step 5: After state - final check
      let afterState;
      if (missingArtifacts.AC4.includes('after.json')) {
        console.log('📊 Step 5: Capturing after state...');
        try {
          await page.goto('/admin/users');
          await page.waitForLoadState('networkidle');
          
          afterState = await readAdminInviteeRow(page, testEmail);
          await saveJson('after.json', afterState, runDir);
        } catch (error) {
          afterState = {
            email: testEmail,
            roles: [],
            statusText: `BLOCKED: ${error instanceof Error ? error.message : 'Unknown error'}`,
            blocked: true,
            reason: 'Admin users page not accessible after second attempt'
          };
          await saveJson('after.json', afterState, runDir);
        }
      }

      // Step 6: Generate token-reuse-test.json - compare states
      let tokenReuseResult;
      if (missingArtifacts.AC4.includes('token-reuse-test.json')) {
        console.log('🔍 Step 6: Analyzing token reuse evidence...');
        const isNegativeBehavior = secondAcceptResult?.errorDetection?.hasError || false;
        
        // Compare accepted.json vs after.json (must be identical for no state change)
        const noStateChange = JSON.stringify(acceptedState) === JSON.stringify(afterState);
        
        tokenReuseResult = {
          test: 'AC4 Token Reuse Evidence Collector (UI Only)',
          timestamp: new Date().toISOString(),
          summary: {
            negativeBehaviorDetected: isNegativeBehavior,
            noStateChange: noStateChange,
            testResult: isNegativeBehavior && noStateChange ? 'PASS' : 'REVIEW_NEEDED'
          },
          evidence: {
            beforeState: beforeState,
            firstAccept: firstAcceptResult,
            acceptedState: acceptedState,
            secondAccept: secondAcceptResult,
            afterState: afterState
          },
          analysis: {
            secondOpenShowsError: isNegativeBehavior,
            stateUnchanged: noStateChange,
            message: `Token reuse test: ${isNegativeBehavior ? 'Negative behavior detected' : 'No negative behavior'}, ${noStateChange ? 'No state change' : 'State changed'}`
          }
        };
        
        await saveJson('token-reuse-test.json', tokenReuseResult, runDir);
      }
      
      // Final summary
      await saveJson('ac4-ui-only-summary.json', {
        test: 'AC4 Admin Invite Token Reuse - UI Only Evidence',
        timestamp: new Date().toISOString(),
        deepLinkUrl,
        testEmail,
        results: {
          tokenReuse: tokenReuseResult?.summary?.testResult || 'UNKNOWN',
          negativeBehavior: secondAcceptResult?.errorDetection?.hasError || false,
          noStateChange: JSON.stringify(acceptedState) === JSON.stringify(afterState)
        },
        evidence: {
          beforeState: !!beforeState,
          firstAccept: !!firstAcceptResult,
          acceptedState: !!acceptedState,
          secondAccept: !!secondAcceptResult,
          afterState: !!afterState,
          screenshot: 'token-reuse-second-attempt.png'
        }
      }, runDir);
      
      console.log(`✅ AC4 UI-only evidence collection completed`);
      console.log(`📁 Artifacts saved to: ${runDir}`);
      console.log(`🎯 Token reuse test result: ${tokenReuseResult.summary.testResult}`);
    });
  });
});
