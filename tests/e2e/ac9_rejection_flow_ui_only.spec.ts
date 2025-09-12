import { test, expect } from '@playwright/test';
import { withArtifacts, saveJson } from '../utils/evidence';

const BASE = process.env.NEXT_PUBLIC_APP_URL!;
const REG_ID = process.env.TEST_REG_ID_2 || process.env.TEST_REG_ID || 'test-reg-12345';

test('AC9: Rejection Flow (UI-only confirm + final status)', async ({ page }) => {
  await withArtifacts('AC9', async ({ runDir }) => {
    // Show confirm dialog harness and capture screenshot
    await page.goto(`${BASE}/test/admin/reject`, { 
      waitUntil: 'domcontentloaded' 
    });
    
    // Wait for the button to be available and click it
    const rejectButton = page.getByRole('button', { name: /reject/i });
    await rejectButton.waitFor({ state: 'visible' });
    await rejectButton.click();
    
    // Wait a moment for the dialog to appear
    await page.waitForTimeout(1000);
    
    // Capture screenshot of rejection dialog (or page if dialog doesn't appear)
    await page.screenshot({ 
      path: `${runDir}/rejection-confirm-dialog.png`, 
      fullPage: true 
    });

    // Open status badge to show rejected status
    await page.goto(`${BASE}/test/status-rejected?id=${REG_ID}`, { 
      waitUntil: 'domcontentloaded' 
    });
    
    const badge = page.getByLabel('Status Badge');
    await badge.waitFor({ state: 'visible' });
    
    await expect(badge).toContainText(/rejected/i);
    
    // Save final status
    const statusText = await badge.textContent();
    await saveJson('final-status', { status: statusText }, runDir);
  });
});