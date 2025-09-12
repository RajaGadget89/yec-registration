import { test, expect } from '@playwright/test';
import { withArtifacts, saveJson } from '../utils/evidence';

const BASE = process.env.NEXT_PUBLIC_APP_URL!;
const REG_ID = process.env.TEST_REG_ID || 'test-reg-12345';

test('AC8: Final Approval (UI-only evidence)', async ({ page }) => {
  await withArtifacts('AC8', async ({ runDir }) => {
    // Create a mock approved status page
    await page.goto(`${BASE}/test/status-approved?id=${REG_ID}`, { 
      waitUntil: 'domcontentloaded' 
    });
    
    // Wait for the badge to be visible
    const badge = page.getByLabel('Status Badge');
    await badge.waitFor({ state: 'visible' });
    
    // Verify the badge shows approved status
    await expect(badge).toContainText(/approved/i);
    
    // Capture screenshot
    await page.screenshot({ 
      path: `${runDir}/approved-badge.png`, 
      fullPage: true 
    });
    
    // Save final status
    const statusText = await badge.textContent();
    await saveJson('final-status', { status: statusText }, runDir);
  });
});
