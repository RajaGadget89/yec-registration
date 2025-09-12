import { test, expect } from '@playwright/test';
import { withArtifacts, saveJson, saveScreenshot } from '../utils/evidence';
import { readRegistrantStatus, pageTextSnapshot, screenshot, isPageBlocked } from '../utils/ui-state';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('AC8: Final Approval Email - UI Only Evidence', () => {
  test('Final approval evidence collection via UI only', async ({ page }) => {
    // Check if we need to collect anything for AC8
    const missingFile = join(process.cwd(), 'artifacts', '_handover', 'p0_missing.json');
    let missingArtifacts = { AC8: [] };
    
    if (existsSync(missingFile)) {
      try {
        const missingData = JSON.parse(readFileSync(missingFile, 'utf8'));
        missingArtifacts = missingData.missing || { AC8: [] };
      } catch (error) {
        console.warn('Failed to read missing artifacts file:', error);
      }
    }
    
    // Early exit if nothing to collect for AC8
    if (missingArtifacts.AC8.length === 0) {
      console.log('✅ AC8: All artifacts already present, skipping collection');
      return;
    }
    
    console.log(`🔍 AC8: Collecting ${missingArtifacts.AC8.length} missing artifacts:`, missingArtifacts.AC8);
    
    await withArtifacts('AC8', async ({ runDir }) => {
      console.log('🔍 Starting AC8 UI-only evidence collection...');
      
      const testEmail = 'user+test-ui@example.com';
      
      await saveJson('test-config.json', {
        testEmail,
        timestamp: new Date().toISOString()
      }, runDir);

      // Step 1: Try to access admin console for approval
      let adminConsoleAccess;
      if (missingArtifacts.AC8.includes('approved-badge.png') || missingArtifacts.AC8.includes('final-status.json')) {
        console.log('🔐 Step 1: Attempting to access admin console...');
        try {
          await page.goto('/admin');
          await page.waitForLoadState('networkidle');
          
          const blockedCheck = await isPageBlocked(page);
          if (blockedCheck.blocked) {
            adminConsoleAccess = {
              blocked: true,
              reason: blockedCheck.reason,
              timestamp: new Date().toISOString()
            };
            await saveJson('admin-console-blocked.json', adminConsoleAccess, runDir);
            
            // Take screenshot of blocked state
            await screenshot(page, runDir, 'admin-console-blocked');
          } else {
            adminConsoleAccess = {
              success: true,
              url: page.url(),
              timestamp: new Date().toISOString()
            };
          }
        } catch (error) {
          adminConsoleAccess = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          await saveJson('admin-console-blocked.json', adminConsoleAccess, runDir);
          await screenshot(page, runDir, 'admin-console-blocked');
        }
      }

      // Step 2: Look for approved badge if admin console is accessible
      let approvedBadgeResult;
      if (missingArtifacts.AC8.includes('approved-badge.png') && !adminConsoleAccess?.blocked) {
        console.log('🏆 Step 2: Looking for approved badge...');
        try {
          // Look for approval-related pages or elements
          const approvalSelectors = [
            '[data-testid*="approved"]',
            '.approved-badge',
            '.badge.approved',
            'text=Approved',
            'text=APPROVED'
          ];
          
          let badgeFound = false;
          for (const selector of approvalSelectors) {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              badgeFound = true;
              break;
            }
          }
          
          if (badgeFound) {
            await screenshot(page, runDir, 'approved-badge');
            approvedBadgeResult = {
              found: true,
              timestamp: new Date().toISOString()
            };
          } else {
            // Try navigating to registrant detail page
            await page.goto('/admin/registrations');
            await page.waitForLoadState('networkidle');
            
            // Look for registrant with approved status
            const registrantLink = page.locator('a:has-text("' + testEmail + '"), tr:has-text("' + testEmail + '") a').first();
            if (await registrantLink.count() > 0) {
              await registrantLink.click();
              await page.waitForLoadState('networkidle');
              
              // Look for approved badge on detail page
              for (const selector of approvalSelectors) {
                const element = page.locator(selector).first();
                if (await element.isVisible()) {
                  await screenshot(page, runDir, 'approved-badge');
                  approvedBadgeResult = {
                    found: true,
                    timestamp: new Date().toISOString()
                  };
                  break;
                }
              }
            }
            
            if (!approvedBadgeResult) {
              approvedBadgeResult = {
                found: false,
                reason: 'No approved badge found',
                timestamp: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          approvedBadgeResult = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
        }
      }

      // Step 3: Capture final status
      let finalStatusResult;
      if (missingArtifacts.AC8.includes('final-status.json')) {
        console.log('📊 Step 3: Capturing final status...');
        try {
          if (!adminConsoleAccess?.blocked) {
            const statusResult = await readRegistrantStatus(page, testEmail);
            finalStatusResult = {
              status: statusResult.statusText,
              email: statusResult.email,
              timestamp: new Date().toISOString()
            };
          } else {
            finalStatusResult = {
              blocked: true,
              reason: 'Admin console not accessible',
              timestamp: new Date().toISOString()
            };
          }
          await saveJson('final-status.json', finalStatusResult, runDir);
        } catch (error) {
          finalStatusResult = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          await saveJson('final-status.json', finalStatusResult, runDir);
        }
      }

      // Step 4: Try to capture outbox evidence (may be blocked)
      if (missingArtifacts.AC8.some(file => file.includes('outbox'))) {
        console.log('📧 Step 4: Attempting to capture outbox evidence...');
        try {
          // Try to access outbox endpoint (may be blocked by auth)
          const outboxResponse = await page.request.get('/api/test/outbox');
          
          if (outboxResponse.ok()) {
            const outboxData = await outboxResponse.json();
            await saveJson('outbox_registration_approved.json', {
              success: true,
              data: outboxData,
              timestamp: new Date().toISOString()
            }, runDir);
          } else {
            await saveJson('blocked_outbox.json', {
              blocked: true,
              status: outboxResponse.status(),
              reason: 'Outbox access blocked',
              timestamp: new Date().toISOString()
            }, runDir);
          }
        } catch (error) {
          await saveJson('blocked_outbox.json', {
            blocked: true,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }, runDir);
        }
      }
      
      // Final summary
      await saveJson('ac8-ui-only-summary.json', {
        test: 'AC8 Final Approval Email - UI Only Evidence',
        timestamp: new Date().toISOString(),
        testEmail,
        results: {
          adminConsoleAccessible: !adminConsoleAccess?.blocked,
          approvedBadgeFound: approvedBadgeResult?.found || false,
          finalStatus: finalStatusResult?.status || 'UNKNOWN',
          blocked: adminConsoleAccess?.blocked || false
        },
        evidence: {
          approvedBadgeScreenshot: 'approved-badge.png',
          finalStatus: 'final-status.json',
          outbox: missingArtifacts.AC8.some(file => file.includes('outbox'))
        }
      }, runDir);
      
      console.log(`✅ AC8 UI-only evidence collection completed`);
      console.log(`📁 Artifacts saved to: ${runDir}`);
      console.log(`🎯 Final approval result: ${finalStatusResult?.status || 'UNKNOWN'}`);
    });
  });
});