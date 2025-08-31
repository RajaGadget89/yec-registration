import { test, expect } from '@playwright/test';

test.describe('Admin Management Console', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin management page
    await page.goto('/admin/management');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="admin-management-tabs"]');
  });

  test('should display all four tabs', async ({ page }) => {
    // Check that all tabs are present
    await expect(page.locator('[data-testid="tab-invite"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-admins"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-activity"]')).toBeVisible();
  });

  test('should switch between tabs and persist selection', async ({ page }) => {
    // Click on Pending tab
    await page.click('[data-testid="tab-pending"]');
    await expect(page.locator('[data-testid="pending-tab-content"]')).toBeVisible();
    
    // Check URL has tab parameter
    await expect(page).toHaveURL(/tab=pending/);
    
    // Click on Activity tab
    await page.click('[data-testid="tab-activity"]');
    await expect(page.locator('[data-testid="activity-tab-content"]')).toBeVisible();
    await expect(page).toHaveURL(/tab=activity/);
    
    // Click on Admins tab
    await page.click('[data-testid="tab-admins"]');
    await expect(page.locator('[data-testid="admins-tab-content"]')).toBeVisible();
    await expect(page).toHaveURL(/tab=admins/);
    
    // Click on Invite tab
    await page.click('[data-testid="tab-invite"]');
    await expect(page.locator('[data-testid="invite-tab-content"]')).toBeVisible();
    await expect(page).toHaveURL(/tab=invite/);
  });

  test('Invite tab should have proper form elements', async ({ page }) => {
    // Navigate to invite tab
    await page.click('[data-testid="tab-invite"]');
    
    // Check form elements
    await expect(page.locator('[data-testid="invite-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="invite-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="invite-roles"]')).toBeVisible();
    await expect(page.locator('[data-testid="invite-submit"]')).toBeVisible();
    
    // Check role checkboxes
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2); // admin and super_admin
  });

  test('Pending tab should display invitations table', async ({ page }) => {
    // Navigate to pending tab
    await page.click('[data-testid="tab-pending"]');
    
    // Check table elements
    await expect(page.locator('[data-testid="pending-invitations-table"]')).toBeVisible();
    
    // Check table headers
    await expect(page.locator('[data-testid="pending-table-header"]')).toBeVisible();
  });

  test('Admins tab should display admin users table', async ({ page }) => {
    // Navigate to admins tab
    await page.click('[data-testid="tab-admins"]');
    
    // Check table elements
    await expect(page.locator('[data-testid="admins-table"]')).toBeVisible();
    
    // Check search and filter elements
    await expect(page.locator('[data-testid="admins-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="admins-role-filter"]')).toBeVisible();
  });

  test('Activity tab should display audit log table', async ({ page }) => {
    // Navigate to activity tab
    await page.click('[data-testid="tab-activity"]');
    
    // Check table elements
    await expect(page.locator('[data-testid="activity-table"]')).toBeVisible();
    
    // Check filter elements
    await expect(page.locator('[data-testid="activity-correlation-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-action-filter"]')).toBeVisible();
  });

  test('should handle form validation in invite tab', async ({ page }) => {
    // Navigate to invite tab
    await page.click('[data-testid="tab-invite"]');
    
    // Try to submit without filling required fields
    await page.click('[data-testid="invite-submit"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="invite-error"]')).toBeVisible();
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Navigate to pending tab
    await page.click('[data-testid="tab-pending"]');
    
    // If no pending invitations, should show empty state
    const emptyState = page.locator('[data-testid="pending-empty-state"]');
    const table = page.locator('[data-testid="pending-invitations-table"]');
    
    // Either empty state or table should be visible
    await expect(emptyState.or(table)).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to invite tab
    await page.click('[data-testid="tab-invite"]');
    
    // Fill form with invalid data
    await page.fill('[data-testid="invite-email"]', 'invalid-email');
    await page.check('input[type="checkbox"]:first-child');
    
    // Submit form
    await page.click('[data-testid="invite-submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="invite-error"]')).toBeVisible();
  });

  test('should maintain tab state on page refresh', async ({ page }) => {
    // Navigate to activity tab
    await page.click('[data-testid="tab-activity"]');
    await expect(page).toHaveURL(/tab=activity/);
    
    // Refresh page
    await page.reload();
    
    // Should still be on activity tab
    await expect(page).toHaveURL(/tab=activity/);
    await expect(page.locator('[data-testid="activity-tab-content"]')).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check tab navigation accessibility
    await expect(page.locator('[data-testid="tab-invite"]')).toHaveAttribute('role', 'tab');
    await expect(page.locator('[data-testid="tab-pending"]')).toHaveAttribute('role', 'tab');
    await expect(page.locator('[data-testid="tab-admins"]')).toHaveAttribute('role', 'tab');
    await expect(page.locator('[data-testid="tab-activity"]')).toHaveAttribute('role', 'tab');
    
    // Check form accessibility
    await page.click('[data-testid="tab-invite"]');
    await expect(page.locator('[data-testid="invite-email"]')).toHaveAttribute('type', 'email');
    await expect(page.locator('[data-testid="invite-submit"]')).toHaveAttribute('type', 'submit');
  });
});
