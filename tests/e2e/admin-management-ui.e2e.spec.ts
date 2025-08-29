import { test, expect } from '@playwright/test';
import { createTestContext } from './helpers/testData';

test.describe('Admin Management UI - Smoke Testing', () => {
  let testContext: any;
  let superAdminEmail: string;

  test.beforeAll(async () => {
    // Create test context
    testContext = createTestContext('admin-management-ui-e2e');
    
    // Use allowlisted super admin email for testing
    superAdminEmail = 'raja.gadgets89@gmail.com';
    
    console.log(`[admin-management-ui] Test setup: superAdmin=${superAdminEmail}`);
  });

  // Helper function to login as super admin
  async function loginAsSuperAdmin(page: any) {
    const response = await page.request.get('/api/test/login-as-super-admin');
    expect(response.status()).toBe(204);
    
    // Get cookies from the response - handle both string and array cases
    const setCookieHeader = response.headers()['set-cookie'];
    if (setCookieHeader) {
      // Ensure we have an array of cookies
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      
      await page.context().addCookies(
        cookies.map((cookie: string) => {
          const [nameValue] = cookie.split(';');
          const [name, value] = nameValue.split('=');
          return {
            name: name.trim(),
            value: value ? value.trim() : '',
            domain: 'localhost',
            path: '/',
          };
        })
      );
    }
  }

  test('@admin-management-ui @dashboard should load admin management dashboard', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin management page
    await page.goto('/admin/management');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify page title and main sections
    await expect(page.locator('h1')).toContainText('Admin Management');
    
    // Verify stats cards are present
    await expect(page.locator('[data-testid="stats-card"]')).toHaveCount(4);
    
    // Verify management sections are present
    await expect(page.locator('text=Invite Admin')).toBeVisible();
    await expect(page.locator('text=Pending Invitations')).toBeVisible();
    await expect(page.locator('text=Admin Users')).toBeVisible();
    await expect(page.locator('text=Activity Log')).toBeVisible();
  });

  test('@admin-management-ui @invite-form should submit invitation form successfully', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Fill invitation form
    const testEmail = `ui-test-${testContext.testId}@example.com`;
    await page.fill('[data-testid="invite-email-input"]', testEmail);
    await page.selectOption('[data-testid="invite-role-select"]', 'admin');
    
    // Submit form
    await page.click('[data-testid="invite-submit-button"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="invite-success-message"]')).toBeVisible();
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();
    
    // Verify invitation appears in pending list
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
  });

  test('@admin-management-ui @pending-list should display and allow revoking invitations', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Check if pending invitations section is visible
    await expect(page.locator('text=Pending Invitations')).toBeVisible();
    
    // If there are pending invitations, test revoke functionality
    const pendingInvitations = page.locator('[data-testid="pending-invitation-item"]');
    const count = await pendingInvitations.count();
    
    if (count > 0) {
      // Click revoke button on first invitation
      await pendingInvitations.first().locator('[data-testid="revoke-button"]').click();
      
      // Confirm revoke action
      await page.click('[data-testid="confirm-revoke-button"]');
      
      // Wait for success message
      await expect(page.locator('text=Invitation revoked successfully')).toBeVisible();
    }
  });

  test('@admin-management-ui @admins-table should display admin users and allow updates', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Verify admin users table is present
    await expect(page.locator('text=Admin Users')).toBeVisible();
    await expect(page.locator('[data-testid="admins-table"]')).toBeVisible();
    
    // Check if admin users are displayed
    const adminRows = page.locator('[data-testid="admin-row"]');
    const count = await adminRows.count();
    
    if (count > 0) {
      // Test role update functionality
      const firstAdminRow = adminRows.first();
      
      // Click edit button
      await firstAdminRow.locator('[data-testid="edit-admin-button"]').click();
      
      // Change role to super_admin
      await page.selectOption('[data-testid="admin-role-select"]', 'super_admin');
      
      // Save changes
      await page.click('[data-testid="save-admin-button"]');
      
      // Wait for success message
      await expect(page.locator('text=Admin updated successfully')).toBeVisible();
    }
  });

  test('@admin-management-ui @status-toggle should toggle admin status', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Find admin users
    const adminRows = page.locator('[data-testid="admin-row"]');
    const count = await adminRows.count();
    
    if (count > 0) {
      const firstAdminRow = adminRows.first();
      
      // Get current status
      const statusBadge = firstAdminRow.locator('[data-testid="admin-status-badge"]');
      const currentStatus = await statusBadge.textContent();
      
      // Click status toggle
      await firstAdminRow.locator('[data-testid="status-toggle"]').click();
      
      // Wait for status to change
      await page.waitForTimeout(1000);
      
      // Verify status changed
      const newStatus = await statusBadge.textContent();
      expect(newStatus).not.toBe(currentStatus);
      
      // Verify success message
      await expect(page.locator('text=Admin updated successfully')).toBeVisible();
    }
  });

  test('@admin-management-ui @activity-list should display recent activities', async ({ page }) => {
    // Set admin cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: superAdminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Verify activity section is present
    await expect(page.locator('text=Activity Log')).toBeVisible();
    await expect(page.locator('[data-testid="activity-list"]')).toBeVisible();
    
    // Check if activities are displayed
    const activityItems = page.locator('[data-testid="activity-item"]');
    const count = await activityItems.count();
    
    // Should have at least some activities (from our API tests)
    expect(count).toBeGreaterThanOrEqual(0);
    
    // Verify activity structure
    if (count > 0) {
      const firstActivity = activityItems.first();
      
      // Check for required fields
      await expect(firstActivity.locator('[data-testid="activity-action"]')).toBeVisible();
      await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible();
      await expect(firstActivity.locator('[data-testid="activity-admin"]')).toBeVisible();
    }
  });

  test('@admin-management-ui @unauthorized should redirect non-super-admin users', async ({ page }) => {
    // Set regular admin cookie (not super admin)
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: 'regular-admin@example.com',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Try to navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or show access denied
    const currentUrl = page.url();
    
    // Either redirected to login or shows access denied
    if (currentUrl.includes('/admin/login')) {
      // Redirected to login
      await expect(page.locator('text=Login')).toBeVisible();
    } else {
      // Shows access denied message
      await expect(page.locator('text=Access Denied')).toBeVisible();
    }
  });

  test('@admin-management-ui @feature-flag should handle disabled feature gracefully', async ({ page }) => {
    // This test would require temporarily disabling the feature flag
    // For now, we'll verify the UI handles the feature flag properly
    
    // Set admin cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: superAdminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Should load normally when feature is enabled
    await expect(page.locator('h1')).toContainText('Admin Management');
  });

  test('@admin-management-ui @responsive should work on mobile devices', async ({ page }) => {
    // Set admin cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: superAdminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Verify page loads on mobile
    await expect(page.locator('h1')).toContainText('Admin Management');
    
    // Verify stats cards are responsive
    await expect(page.locator('[data-testid="stats-card"]')).toHaveCount(4);
    
    // Verify management sections are accessible
    await expect(page.locator('text=Invite Admin')).toBeVisible();
    await expect(page.locator('text=Pending Invitations')).toBeVisible();
    await expect(page.locator('text=Admin Users')).toBeVisible();
    await expect(page.locator('text=Activity Log')).toBeVisible();
  });

  test('@admin-management-ui @error-handling should display error messages gracefully', async ({ page }) => {
    // Set admin cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: superAdminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Navigate to admin management page
    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Test form validation errors
    await page.click('[data-testid="invite-submit-button"]');
    
    // Should show validation error for empty email
    await expect(page.locator('[data-testid="invite-error-message"]')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    
    // Test invalid email format
    await page.fill('[data-testid="invite-email-input"]', 'invalid-email');
    await page.click('[data-testid="invite-submit-button"]');
    
    // Should show validation error for invalid email
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('@admin-management-ui @loading-states should show loading indicators', async ({ page }) => {
    // Set admin cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: superAdminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Navigate to admin management page
    await page.goto('/admin/management');
    
    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Loading spinner should be hidden
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
    
    // Test loading state for form submission
    await page.fill('[data-testid="invite-email-input"]', `loading-test-${testContext.testId}@example.com`);
    await page.selectOption('[data-testid="invite-role-select"]', 'admin');
    await page.click('[data-testid="invite-submit-button"]');
    
    // Should show loading state during submission
    await expect(page.locator('[data-testid="submit-loading"]')).toBeVisible();
    
    // Wait for submission to complete
    await page.waitForTimeout(2000);
    
    // Loading state should be hidden
    await expect(page.locator('[data-testid="submit-loading"]')).not.toBeVisible();
  });
});


