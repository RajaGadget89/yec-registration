import { test, expect } from '@playwright/test';
import { createTestContext } from './helpers/testData';

test.describe('Admin Management - Staging Smoke Test', () => {
  let testContext: any;
  let superAdminEmail: string;

  test.beforeAll(async () => {
    // Create test context
    testContext = createTestContext('admin-management-smoke');
    
    // Use allowlisted super admin email for testing
    superAdminEmail = 'raja.gadgets89@gmail.com';
    
    console.log(`[admin-management-smoke] Test setup: superAdmin=${superAdminEmail}`);
  });

  test('@smoke @admin-management should complete basic admin management workflow', async ({ request, page }) => {
    const testAdminEmail = `smoke-test-${testContext.testId}@example.com`;
    const rid = `admin-smoke-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Step 1: Create admin invitation via API
    console.log('[smoke] Step 1: Creating admin invitation...');
    const inviteResponse = await request.post('/api/admin/management/invite', {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': rid,
        'admin-email': superAdminEmail,
      },
      data: {
        email: testAdminEmail,
        roles: ['admin']
      },
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    expect(inviteData.id).toBeDefined();
    expect(inviteData.email).toBe(testAdminEmail);
    expect(inviteData.message).toBe("Invitation created successfully");
    expect(inviteData.token).toBeDefined();
    
    const invitationToken = inviteData.token;
    console.log(`[smoke] Invitation created: ${inviteData.id} with token: ${invitationToken}`);

    // Step 2: Accept invitation via API
    console.log('[smoke] Step 2: Accepting invitation...');
    const acceptResponse = await request.post(`/api/admin/management/invitations/${invitationToken}/accept`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': rid,
      },
      data: {
        name: 'Smoke Test Admin'
      },
    });

    expect(acceptResponse.status()).toBe(200);
    const acceptData = await acceptResponse.json();
    expect(acceptData.ok).toBe(true);
    expect(acceptData.admin_user_id).toBeTruthy();
    
    const adminUserId = acceptData.admin_user_id;
    console.log(`[smoke] Invitation accepted: ${adminUserId}`);

    // Step 3: Verify admin appears in list
    console.log('[smoke] Step 3: Verifying admin in list...');
    const listResponse = await request.get('/api/admin/management/admins', {
      headers: {
        'X-Request-ID': rid,
        'admin-email': superAdminEmail,
      },
    });

    expect(listResponse.status()).toBe(200);
    const listData = await listResponse.json();
    const newAdmin = listData.admins.find((admin: any) => admin.email === testAdminEmail);
    expect(newAdmin).toBeTruthy();
    expect(newAdmin.role).toBe('admin');
    expect(newAdmin.status).toBe('active');
    console.log(`[smoke] Admin verified in list: ${newAdmin.id}`);

    // Step 4: Update admin role
    console.log('[smoke] Step 4: Updating admin role...');
    const updateResponse = await request.put(`/api/admin/management/admins/${adminUserId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': rid,
        'admin-email': superAdminEmail,
      },
      data: {
        roles: ['super_admin']
      },
    });

    expect(updateResponse.status()).toBe(200);
    const updateData = await updateResponse.json();
    expect(updateData.ok).toBe(true);
    console.log(`[smoke] Admin role updated to super_admin`);

    // Step 5: Verify activity log
    console.log('[smoke] Step 5: Verifying activity log...');
    const activityResponse = await request.get('/api/admin/management/activity', {
      headers: {
        'X-Request-ID': rid,
        'admin-email': superAdminEmail,
      },
    });

    expect(activityResponse.status()).toBe(200);
    const activityData = await activityResponse.json();
    expect(activityData.activities).toBeInstanceOf(Array);
    
    // Should include our test activities
    const recentActivities = activityData.activities.slice(0, 5);
    const activityActions = recentActivities.map((activity: any) => activity.action);
    expect(activityActions).toContain('admin_invitation_created');
    expect(activityActions).toContain('admin_invitation_accepted');
    expect(activityActions).toContain('admin_role_assigned');
    console.log(`[smoke] Activity log verified: ${activityActions.length} activities found`);

    // Step 6: UI smoke test - load admin management page
    console.log('[smoke] Step 6: Testing UI...');
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: superAdminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/admin/management');
    await page.waitForLoadState('networkidle');
    
    // Verify page loads
    await expect(page.locator('h1')).toContainText('Admin Management');
    await expect(page.locator('text=Invite Admin')).toBeVisible();
    await expect(page.locator('text=Admin Users')).toBeVisible();
    console.log(`[smoke] UI loaded successfully`);

    // Step 7: Verify new admin appears in UI
    console.log('[smoke] Step 7: Verifying admin in UI...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Look for the new admin in the admin users table
    await expect(page.locator(`text=${testAdminEmail}`)).toBeVisible();
    console.log(`[smoke] Admin verified in UI`);

    console.log('[smoke] ✅ All smoke tests passed!');
  });

  test('@smoke @admin-management-negative should handle negative cases', async ({ request }) => {
    const rid = `admin-smoke-negative-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Test 1: Unauthorized access
    console.log('[smoke-negative] Test 1: Unauthorized access...');
    const unauthorizedResponse = await request.get('/api/admin/management/admins', {
      headers: {
        'X-Request-ID': rid,
        'admin-email': 'regular-admin@example.com',
      },
    });

    expect(unauthorizedResponse.status()).toBe(401);
    const unauthorizedData = await unauthorizedResponse.json();
    expect(unauthorizedData.error).toBe('Unauthorized');
    console.log(`[smoke-negative] Unauthorized access blocked correctly`);

    // Test 2: Invalid invitation token
    console.log('[smoke-negative] Test 2: Invalid invitation token...');
    const invalidTokenResponse = await request.post('/api/admin/management/invitations/invalid-token-123/accept', {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': rid,
      },
      data: {},
    });

    expect(invalidTokenResponse.status()).toBe(410);
    const invalidTokenData = await invalidTokenResponse.json();
    expect(invalidTokenData.error).toBe('Invalid or expired invitation token');
    expect(invalidTokenData.code).toBe('INVALID_TOKEN');
    console.log(`[smoke-negative] Invalid token handled correctly`);

    // Test 3: Validation error
    console.log('[smoke-negative] Test 3: Validation error...');
    const validationResponse = await request.post('/api/admin/management/invite', {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': rid,
        'admin-email': superAdminEmail,
      },
      data: {
        email: 'invalid-email',
        roles: ['admin']
      },
    });

    expect(validationResponse.status()).toBe(422);
    const validationData = await validationResponse.json();
    expect(validationData.error).toBe('Validation failed');
    expect(validationData.details).toBeTruthy();
    console.log(`[smoke-negative] Validation error handled correctly`);

    console.log('[smoke-negative] ✅ All negative tests passed!');
  });

  test('@smoke @admin-management-performance should complete within reasonable time', async ({ request }) => {
    const startTime = Date.now();
    const rid = `admin-smoke-perf-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Test API response times
    console.log('[smoke-performance] Testing API response times...');
    
    // Test admin list endpoint
    const listStart = Date.now();
    const listResponse = await request.get('/api/admin/management/admins', {
      headers: {
        'X-Request-ID': rid,
        'admin-email': superAdminEmail,
      },
    });
    const listTime = Date.now() - listStart;
    
    expect(listResponse.status()).toBe(200);
    expect(listTime).toBeLessThan(5000); // Should complete within 5 seconds
    console.log(`[smoke-performance] Admin list: ${listTime}ms`);

    // Test activity endpoint
    const activityStart = Date.now();
    const activityResponse = await request.get('/api/admin/management/activity', {
      headers: {
        'X-Request-ID': rid,
        'admin-email': superAdminEmail,
      },
    });
    const activityTime = Date.now() - activityStart;
    
    expect(activityResponse.status()).toBe(200);
    expect(activityTime).toBeLessThan(5000); // Should complete within 5 seconds
    console.log(`[smoke-performance] Activity list: ${activityTime}ms`);

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(15000); // Total test should complete within 15 seconds
    console.log(`[smoke-performance] Total test time: ${totalTime}ms`);
    console.log('[smoke-performance] ✅ Performance tests passed!');
  });
});


