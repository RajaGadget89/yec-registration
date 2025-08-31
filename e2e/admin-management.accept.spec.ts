import { test, expect } from '@playwright/test';

test.describe('Admin Management - Accept Invitation UX', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:8080';

  test('should accept invitation successfully via UX page', async ({ page, request }) => {
    // First, create an invitation to get a valid token
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    // Set up admin authentication for creating invitation
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Create invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'accept-ux-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    
    // Get token from response (for E2E tests)
    const token = inviteData.token;
    expect(token).toBeTruthy();

    // Navigate to accept page with token
    await page.goto(`${baseUrl}/admin/accept?token=${token}`);

    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();
    await expect(page.locator('text=Verifying Invitation')).toBeVisible();

    // Should transition to success state
    await expect(page.locator('[data-testid="success-state"]')).toBeVisible();
    await expect(page.locator('text=Welcome to YEC Day Admin Console!')).toBeVisible();
    await expect(page.locator('text=Your invitation has been accepted successfully')).toBeVisible();

    // Should show "Go to Admin Console" button
    const goToAdminButton = page.locator('[data-testid="go-to-admin-button"]');
    await expect(goToAdminButton).toBeVisible();
    await expect(goToAdminButton).toHaveText('Go to Admin Console');

    // Click the button to go to admin console
    await goToAdminButton.click();

    // Should navigate to admin page
    await expect(page).toHaveURL(`${baseUrl}/admin`);
  });

  test('should show expired state for expired invitation', async ({ page, request }) => {
    // Create an invitation and manually expire it in the database
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'expired-ux-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    const token = inviteData.token;

    // Manually expire the invitation by updating the database
    const supabase = require('@supabase/supabase-js').createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from('admin_invitations')
      .update({ 
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
      })
      .eq('token', token);

    // Navigate to accept page with expired token
    await page.goto(`${baseUrl}/admin/accept?token=${token}`);

    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();

    // Should transition to expired state
    await expect(page.locator('[data-testid="expired-state"]')).toBeVisible();
    await expect(page.locator('text=Invitation Expired')).toBeVisible();
    await expect(page.locator('text=This invitation has expired')).toBeVisible();
    await expect(page.locator('text=Request New Invitation')).toBeVisible();
  });

  test('should show used state for already accepted invitation', async ({ page, request }) => {
    // First, create and accept an invitation
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'used-ux-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    const token = inviteData.token;

    // Accept the invitation via API
    const acceptResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
      data: {
        name: 'Test User'
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(acceptResponse.status()).toBe(200);

    // Now try to access the accept page with the same token
    await page.goto(`${baseUrl}/admin/accept?token=${token}`);

    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();

    // Should transition to used state
    await expect(page.locator('[data-testid="used-state"]')).toBeVisible();
    await expect(page.locator('text=Invitation Already Used')).toBeVisible();
    await expect(page.locator('text=This invitation has already been accepted')).toBeVisible();
    await expect(page.locator('text=Request New Invitation')).toBeVisible();
  });

  test('should show invalid state for missing token', async ({ page }) => {
    // Navigate to accept page without token
    await page.goto(`${baseUrl}/admin/accept`);

    // Should show invalid state immediately
    await expect(page.locator('[data-testid="invalid-state"]')).toBeVisible();
    await expect(page.locator('text=Invalid Invitation')).toBeVisible();
    await expect(page.locator('text=The invitation link is invalid or missing')).toBeVisible();
    await expect(page.locator('text=Request New Invitation')).toBeVisible();
  });

  test('should show invalid state for malformed token', async ({ page }) => {
    // Navigate to accept page with malformed token
    await page.goto(`${baseUrl}/admin/accept?token=invalid-token`);

    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();

    // Should transition to invalid state
    await expect(page.locator('[data-testid="invalid-state"]')).toBeVisible();
    await expect(page.locator('text=Invalid Invitation')).toBeVisible();
    await expect(page.locator('text=Request New Invitation')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page, request }) => {
    // Create a valid invitation
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'network-error-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    const token = inviteData.token;

    // Mock network failure by using an invalid base URL
    await page.route('**/api/admin/management/invitations/*/accept', route => {
      route.abort('failed');
    });

    // Navigate to accept page
    await page.goto(`${baseUrl}/admin/accept?token=${token}`);

    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();

    // Should transition to error state
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
    await expect(page.locator('text=Error Processing Invitation')).toBeVisible();
    await expect(page.locator('text=Try Again')).toBeVisible();
    await expect(page.locator('text=Contact Support')).toBeVisible();
  });

  test('should fire analytics events correctly', async ({ page, request }) => {
    // Mock gtag function
    await page.addInitScript(() => {
      (window as any).gtag = (event: string, params: any) => {
        (window as any).lastGtagEvent = { event, params };
      };
    });

    // Create and accept an invitation
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'analytics-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    const token = inviteData.token;

    // Navigate to accept page
    await page.goto(`${baseUrl}/admin/accept?token=${token}`);

    // Wait for success state
    await expect(page.locator('[data-testid="success-state"]')).toBeVisible();

    // Check that analytics event was fired
    const gtagEvent = await page.evaluate(() => (window as any).lastGtagEvent);
    expect(gtagEvent).toBeTruthy();
    expect(gtagEvent.event).toBe('accept_invite_result');
    expect(gtagEvent.params.event_category).toBe('admin_invitation');
    expect(gtagEvent.params.event_label).toBe('success');
    expect(gtagEvent.params.value).toBe(1);
  });

  test('should accept invitation via API successfully (200)', async ({ request }) => {
    // First, create an invitation to get a valid token
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    // Set up admin authentication for creating invitation
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Create invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'accept-api-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    
    // Get token from response (for E2E tests)
    const token = inviteData.token;
    expect(token).toBeTruthy();

    // Accept invitation
    const response = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
      data: {
        name: 'Test User'
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('correlation_id');
    expect(data).toHaveProperty('message', 'Invitation accepted successfully');
    expect(data).toHaveProperty('admin_user_id');
  });

  test('should return 410 for expired invitation via API', async ({ request }) => {
    // Create an invitation and manually expire it
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'expired-api-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    const token = inviteData.token;

    // Manually expire the invitation
    const supabase = require('@supabase/supabase-js').createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from('admin_invitations')
      .update({ 
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('token', token);

    // Try to accept expired invitation
    const response = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
      data: {
        name: 'Test User'
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(response.status()).toBe(410);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Invitation has expired');
    expect(data).toHaveProperty('code', 'EXPIRED_TOKEN');
  });
});
