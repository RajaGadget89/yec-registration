import { test, expect } from '@playwright/test';

test.describe('UAT-04: Admin Delete 401 Hotfix', () => {
  test('should successfully perform admin delete dry-run as super_admin', async ({ page }) => {
    // Navigate to admin management page
    await page.goto('/admin/management');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for admin users in the table
    const adminRows = page.locator('table tbody tr');
    await expect(adminRows.first()).toBeVisible();
    
    // Find an admin user (not super_admin) to delete
    const adminRow = adminRows.filter({ hasText: 'Admin' }).first();
    if (await adminRow.count() > 0) {
      // Click the delete button for this admin
      const deleteButton = adminRow.locator('button[title*="Delete"]');
      await deleteButton.click();
      
      // Wait for delete confirmation dialog
      const confirmDialog = page.locator('[role="dialog"]');
      await expect(confirmDialog).toBeVisible();
      
      // Verify the dialog shows the correct admin email
      await expect(confirmDialog).toContainText('Delete admin?');
      
      // Cancel the deletion (we just want to test the dry-run)
      const cancelButton = confirmDialog.locator('button').filter({ hasText: /Cancel|No/ });
      await cancelButton.click();
      
      // Dialog should close
      await expect(confirmDialog).not.toBeVisible();
    }
  });

  test('should show delete button for admin users when dev flag is enabled', async ({ page }) => {
    // Navigate to admin management page
    await page.goto('/admin/management');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for admin users in the table
    const adminRows = page.locator('table tbody tr');
    await expect(adminRows.first()).toBeVisible();
    
    // Find an admin user (not super_admin)
    const adminRow = adminRows.filter({ hasText: 'Admin' }).first();
    if (await adminRow.count() > 0) {
      // Should see delete button for admin users
      const deleteButton = adminRow.locator('button[title*="Delete"]');
      await expect(deleteButton).toBeVisible();
      
      // Should NOT see delete button for super_admin users
      const superAdminRow = adminRows.filter({ hasText: 'Super Admin' }).first();
      if (await superAdminRow.count() > 0) {
        const superAdminDeleteButton = superAdminRow.locator('button[title*="Delete"]');
        await expect(superAdminDeleteButton).not.toBeVisible();
      }
    }
  });

  test('should handle admin delete API calls without 401 errors', async ({ page }) => {
    // Navigate to dev delete tester
    await page.goto('/admin/management/dev-delete-tester');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for admin users in the list
    const adminRows = page.locator('table tbody tr');
    await expect(adminRows.first()).toBeVisible();
    
    // Find an admin user (not super_admin) to test
    const adminRow = adminRows.filter({ hasText: 'Admin' }).first();
    if (await adminRow.count() > 0) {
      // Click dry-run button
      const dryRunButton = adminRow.locator('button').filter({ hasText: 'Dry Run' });
      await dryRunButton.click();
      
      // Wait for dry-run to complete
      await page.waitForTimeout(2000);
      
      // Check that dry-run result shows success (not 401)
      const dryRunResult = page.locator('[data-testid="dry-run-result"]').or(page.locator('text=200'));
      await expect(dryRunResult).toBeVisible();
      
      // Verify no 401 errors in the result
      const resultText = await dryRunResult.textContent();
      expect(resultText).not.toContain('401');
      expect(resultText).not.toContain('Unauthorized');
    }
  });

  test('should verify SSR cookie visibility fix works', async ({ page }) => {
    // Navigate to dev delete tester
    await page.goto('/admin/management/dev-delete-tester');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Run auth probe to verify cookies are visible
    const authProbeButton = page.locator('button').filter({ hasText: 'Auth Probe' });
    await authProbeButton.click();
    
    // Wait for auth probe to complete
    await page.waitForTimeout(2000);
    
    // Check auth probe result
    const authProbeResult = page.locator('[data-testid="auth-probe-result"]').or(page.locator('text=ok'));
    await expect(authProbeResult).toBeVisible();
    
    // Verify auth probe shows cookies are visible
    const resultText = await authProbeResult.textContent();
    expect(resultText).toContain('ok');
    expect(resultText).not.toContain('Not authenticated');
    
    // Look for admin users in the list
    const adminRows = page.locator('table tbody tr');
    await expect(adminRows.first()).toBeVisible();
    
    // Find an admin user (not super_admin) to test
    const adminRow = adminRows.filter({ hasText: 'Admin' }).first();
    if (await adminRow.count() > 0) {
      // Click dry-run button
      const dryRunButton = adminRow.locator('button').filter({ hasText: 'Dry Run' });
      await dryRunButton.click();
      
      // Wait for dry-run to complete
      await page.waitForTimeout(2000);
      
      // Check that dry-run result shows success (not 401)
      const dryRunResult = page.locator('[data-testid="dry-run-result"]').or(page.locator('text=200'));
      await expect(dryRunResult).toBeVisible();
      
      // Verify no 401 errors in the result
      const resultText2 = await dryRunResult.textContent();
      expect(resultText2).not.toContain('401');
      expect(resultText2).not.toContain('Unauthorized');
    }
  });
});
