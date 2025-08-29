import { test, expect } from '@playwright/test';

// Test configuration for different user roles
const testUsers = {
  superAdmin: 'alice@company.com',
  paymentAdmin: 'carol@company.com', 
  profileAdmin: 'dave@company.com',
  tccAdmin: 'eve@company.com',
  nonAdmin: 'unknown@company.com',
};

// Mock environment setup for testing
const mockEnv = {
  ADMIN_SUPER_EMAILS: 'alice@company.com, bob@company.com',
  ADMIN_PAYMENT_EMAILS: 'bob@company.com, carol@company.com',
  ADMIN_PROFILE_EMAILS: 'carol@company.com, dave@company.com',
  ADMIN_TCC_EMAILS: 'dave@company.com, eve@company.com',
};

test.describe('RBAC E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up environment variables for testing
    await page.addInitScript(() => {
      // Mock environment variables in browser context
      (window as any).__RBAC_TEST_ENV__ = {
        ADMIN_SUPER_EMAILS: 'alice@company.com, bob@company.com',
        ADMIN_PAYMENT_EMAILS: 'bob@company.com, carol@company.com',
        ADMIN_PROFILE_EMAILS: 'carol@company.com, dave@company.com',
        ADMIN_TCC_EMAILS: 'dave@company.com, eve@company.com',
      };
    });
  });

  test('super admin can access all dimensions and approve', async ({ page }) => {
    // Set admin email cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: testUsers.superAdmin,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Navigate to admin dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');

    // Verify that all dimension buttons are enabled
    await expect(page.locator('[data-testid="payment-request-update"]')).toBeEnabled();
    await expect(page.locator('[data-testid="payment-mark-pass"]')).toBeEnabled();
    await expect(page.locator('[data-testid="profile-request-update"]')).toBeEnabled();
    await expect(page.locator('[data-testid="profile-mark-pass"]')).toBeEnabled();
    await expect(page.locator('[data-testid="tcc-request-update"]')).toBeEnabled();
    await expect(page.locator('[data-testid="tcc-mark-pass"]')).toBeEnabled();
    await expect(page.locator('[data-testid="approve-all"]')).toBeEnabled();
  });

  test('payment admin can only access payment dimension', async ({ page }) => {
    // Set admin email cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: testUsers.paymentAdmin,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Navigate to admin dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');

    // Verify that payment buttons are enabled
    await expect(page.locator('[data-testid="payment-request-update"]')).toBeEnabled();
    await expect(page.locator('[data-testid="payment-mark-pass"]')).toBeEnabled();

    // Verify that profile buttons are enabled (payment admin also has profile access)
    await expect(page.locator('[data-testid="profile-request-update"]')).toBeEnabled();
    await expect(page.locator('[data-testid="profile-mark-pass"]')).toBeEnabled();

    // Verify that TCC buttons are disabled
    await expect(page.locator('[data-testid="tcc-request-update"]')).toBeDisabled();
    await expect(page.locator('[data-testid="tcc-mark-pass"]')).toBeDisabled();

    // Verify that approve button is disabled
    await expect(page.locator('[data-testid="approve-all"]')).toBeDisabled();
  });

  test('profile admin can only access profile and TCC dimensions', async ({ page }) => {
    // Set admin email cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: testUsers.profileAdmin,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Navigate to admin dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');

    // Verify that payment buttons are disabled
    await expect(page.locator('[data-testid="payment-request-update"]')).toBeDisabled();
    await expect(page.locator('[data-testid="payment-mark-pass"]')).toBeDisabled();

    // Verify that profile buttons are enabled
    await expect(page.locator('[data-testid="profile-request-update"]')).toBeEnabled();
    await expect(page.locator('[data-testid="profile-mark-pass"]')).toBeEnabled();

    // Verify that TCC buttons are enabled
    await expect(page.locator('[data-testid="tcc-request-update"]')).toBeEnabled();
    await expect(page.locator('[data-testid="tcc-mark-pass"]')).toBeEnabled();

    // Verify that approve button is disabled
    await expect(page.locator('[data-testid="approve-all"]')).toBeDisabled();
  });

  test('non-admin user cannot access admin dashboard', async ({ page }) => {
    // Set non-admin email cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: testUsers.nonAdmin,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Try to navigate to admin dashboard
    await page.goto('/admin');
    
    // Should be redirected to login or show access denied
    await expect(page).not.toHaveURL('/admin');
  });

  test('API endpoints enforce RBAC for request-update', async ({ request }) => {
    // Test super admin access
    const superAdminResponse = await request.post('/api/admin/review/test-id/request-update', {
      headers: {
        'Cookie': `admin-email=${testUsers.superAdmin}`,
        'Content-Type': 'application/json',
      },
      data: {
        dimension: 'payment',
        notes: 'Test notes',
      },
    });
    
    // Should get 404 (registration not found) but not 403 (forbidden)
    expect(superAdminResponse.status()).not.toBe(403);

    // Test payment admin access to payment dimension
    const paymentAdminResponse = await request.post('/api/admin/review/test-id/request-update', {
      headers: {
        'Cookie': `admin-email=${testUsers.paymentAdmin}`,
        'Content-Type': 'application/json',
      },
      data: {
        dimension: 'payment',
        notes: 'Test notes',
      },
    });
    
    // Should get 404 (registration not found) but not 403 (forbidden)
    expect(paymentAdminResponse.status()).not.toBe(403);

    // Test payment admin access to TCC dimension (should be forbidden)
    const paymentAdminTccResponse = await request.post('/api/admin/review/test-id/request-update', {
      headers: {
        'Cookie': `admin-email=${testUsers.paymentAdmin}`,
        'Content-Type': 'application/json',
      },
      data: {
        dimension: 'tcc',
        notes: 'Test notes',
      },
    });
    
    // Should get 403 (forbidden)
    expect(paymentAdminTccResponse.status()).toBe(403);

    // Test non-admin access
    const nonAdminResponse = await request.post('/api/admin/review/test-id/request-update', {
      headers: {
        'Cookie': `admin-email=${testUsers.nonAdmin}`,
        'Content-Type': 'application/json',
      },
      data: {
        dimension: 'payment',
        notes: 'Test notes',
      },
    });
    
    // Should get 403 (forbidden)
    expect(nonAdminResponse.status()).toBe(403);
  });

  test('API endpoints enforce RBAC for mark-pass', async ({ request }) => {
    // Test super admin access
    const superAdminResponse = await request.post('/api/admin/review/test-id/mark-pass', {
      headers: {
        'Cookie': `admin-email=${testUsers.superAdmin}`,
        'Content-Type': 'application/json',
      },
      data: {
        dimension: 'payment',
        notes: 'Test notes',
      },
    });
    
    // Should get 404 (registration not found) but not 403 (forbidden)
    expect(superAdminResponse.status()).not.toBe(403);

    // Test payment admin access to payment dimension
    const paymentAdminResponse = await request.post('/api/admin/review/test-id/mark-pass', {
      headers: {
        'Cookie': `admin-email=${testUsers.paymentAdmin}`,
        'Content-Type': 'application/json',
      },
      data: {
        dimension: 'payment',
        notes: 'Test notes',
      },
    });
    
    // Should get 404 (registration not found) but not 403 (forbidden)
    expect(paymentAdminResponse.status()).not.toBe(403);

    // Test payment admin access to TCC dimension (should be forbidden)
    const paymentAdminTccResponse = await request.post('/api/admin/review/test-id/mark-pass', {
      headers: {
        'Cookie': `admin-email=${testUsers.paymentAdmin}`,
        'Content-Type': 'application/json',
      },
      data: {
        dimension: 'tcc',
        notes: 'Test notes',
      },
    });
    
    // Should get 403 (forbidden)
    expect(paymentAdminTccResponse.status()).toBe(403);
  });

  test('API endpoints enforce RBAC for approve', async ({ request }) => {
    // Test super admin access
    const superAdminResponse = await request.post('/api/admin/review/test-id/approve', {
      headers: {
        'Cookie': `admin-email=${testUsers.superAdmin}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Should get 404 (registration not found) but not 403 (forbidden)
    expect(superAdminResponse.status()).not.toBe(403);

    // Test payment admin access (should be forbidden)
    const paymentAdminResponse = await request.post('/api/admin/review/test-id/approve', {
      headers: {
        'Cookie': `admin-email=${testUsers.paymentAdmin}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Should get 403 (forbidden)
    expect(paymentAdminResponse.status()).toBe(403);

    // Test non-admin access
    const nonAdminResponse = await request.post('/api/admin/review/test-id/approve', {
      headers: {
        'Cookie': `admin-email=${testUsers.nonAdmin}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Should get 403 (forbidden)
    expect(nonAdminResponse.status()).toBe(403);
  });

  test('whoami endpoint returns user roles', async ({ request }) => {
    // Test super admin
    const superAdminResponse = await request.get('/api/whoami', {
      headers: {
        'Cookie': `admin-email=${testUsers.superAdmin}`,
      },
    });
    
    expect(superAdminResponse.status()).toBe(200);
    const superAdminData = await superAdminResponse.json();
    expect(superAdminData.roles).toContain('super_admin');

    // Test payment admin
    const paymentAdminResponse = await request.get('/api/whoami', {
      headers: {
        'Cookie': `admin-email=${testUsers.paymentAdmin}`,
      },
    });
    
    expect(paymentAdminResponse.status()).toBe(200);
    const paymentAdminData = await paymentAdminResponse.json();
    expect(paymentAdminData.roles).toContain('admin_payment');
    expect(paymentAdminData.roles).toContain('admin_profile');

    // Test non-admin
    const nonAdminResponse = await request.get('/api/whoami', {
      headers: {
        'Cookie': `admin-email=${testUsers.nonAdmin}`,
      },
    });
    
    expect(nonAdminResponse.status()).toBe(200);
    const nonAdminData = await nonAdminResponse.json();
    expect(nonAdminData.roles).toBeUndefined();
  });

  test('tooltips show permission information', async ({ page }) => {
    // Set payment admin email cookie
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: testUsers.paymentAdmin,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Navigate to admin dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');

    // Check tooltip for disabled TCC button
    const tccButton = page.locator('[data-testid="tcc-request-update"]');
    await expect(tccButton).toBeDisabled();
    
    // Hover over the button to see tooltip
    await tccButton.hover();
    
    // Check if tooltip contains permission information
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toContainText('No permission to review tcc');

    // Check tooltip for disabled approve button
    const approveButton = page.locator('[data-testid="approve-all"]');
    await expect(approveButton).toBeDisabled();
    
    // Hover over the button to see tooltip
    await approveButton.hover();
    
    // Check if tooltip contains permission information
    const approveTooltip = page.locator('[role="tooltip"]');
    await expect(approveTooltip).toContainText('Only super admin can approve registrations');
  });
});
