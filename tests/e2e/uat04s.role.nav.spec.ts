import { test, expect } from '@playwright/test';
import { sendAdminInvite, getAcceptUrl } from './helpers/invite-helpers';
import { loginViaMagicLink, checkAuthStatus, logout } from './helpers/auth-helpers';
import { cleanupTestEmails } from './helpers/email-helpers';

const TEST_EMAIL = `uat04s-admin-role-${Date.now()}@example.com`;

test.describe('UAT-04S: Admin Role-Based Navigation & Access Control', () => {
  test.afterEach(async () => {
    // Clean up test data
    try {
      await cleanupTestEmails(TEST_EMAIL, 'uat04s-role');
    } catch (error) {
      console.log(`[cleanup] Error cleaning up test emails: ${error}`);
    }
  });

  test('login + role nav (admin) - complete flow', async ({ page, request, browser }) => {
    console.log(`[test] Starting complete admin role navigation test for ${TEST_EMAIL}`);
    
    // Step 1: Send admin invitation
    console.log(`[test] Step 1: Sending admin invitation...`);
    const { id, token } = await sendAdminInvite(request, TEST_EMAIL);
    console.log(`[test] Invitation sent successfully - ID: ${id}`);
    
    // Step 2: Accept invitation once (incognito context)
    console.log(`[test] Step 2: Accepting invitation...`);
    const inc = await browser.newContext();
    const acceptPage = await inc.newPage();
    
    const acceptUrl = await getAcceptUrl(request, TEST_EMAIL);
    await acceptPage.goto(acceptUrl);
    
    // Wait for acceptance to complete
    await acceptPage.waitForSelector('h1, h2, h3', { timeout: 10000 });
    const acceptText = await acceptPage.textContent('body');
    expect(acceptText).toContain('Welcome to YEC Day Admin Console');
    console.log(`[test] Invitation accepted successfully`);
    
    await inc.close();

    // Step 3: Login via Magic Link (UI-auth, not bypass)
    console.log(`[test] Step 3: Logging in via magic link...`);
    await loginViaMagicLink(page, TEST_EMAIL);
    console.log(`[test] Magic link login completed`);

    // Step 4: Verify /api/admin/me returns 200 with role=admin
    console.log(`[test] Step 4: Verifying authentication status...`);
    const me = await page.request.get('/api/admin/me', { 
      headers: { 'cache-control': 'no-store' } 
    });
    expect(me.status()).toBe(200);
    
    const body = await me.json();
    expect(body.role).toBe('admin');
    expect(body.email).toBe(TEST_EMAIL);
    console.log(`[test] /api/admin/me verified - role: ${body.role}, email: ${body.email}`);

    // Step 5: Verify top bar shows "Admin" role chip
    console.log(`[test] Step 5: Verifying top bar role display...`);
    await expect(page.getByText('Admin').first()).toBeVisible();
    console.log(`[test] Top bar shows "Admin" role correctly`);

    // Step 6: Verify "Admin Management Team" is hidden for admin users
    console.log(`[test] Step 6: Verifying Admin Management Team is hidden...`);
    const adminManagementLinks = page.getByRole('link', { name: /Admin Management Team/i });
    await expect(adminManagementLinks).toHaveCount(0);
    console.log(`[test] Admin Management Team link correctly hidden`);

    // Step 7: Verify direct access to /admin/management returns 401/403
    console.log(`[test] Step 7: Verifying access control to super-admin routes...`);
    const directAccess = await page.request.get('/admin/management');
    expect([401, 403]).toContain(directAccess.status());
    console.log(`[test] Direct access to /admin/management correctly blocked with status: ${directAccess.status()}`);

    console.log(`[test] Complete admin role navigation test completed successfully`);
  });

  test('admin cannot access super-admin only features', async ({ page, request, browser }) => {
    console.log(`[test] Starting super-admin feature access test for ${TEST_EMAIL}`);
    
    // Setup: Send invitation and accept it
    const { id, token } = await sendAdminInvite(request, TEST_EMAIL);
    const acceptUrl = await getAcceptUrl(request, TEST_EMAIL);
    
    const inc = await browser.newContext();
    const acceptPage = await inc.newPage();
    await acceptPage.goto(acceptUrl);
    await acceptPage.waitForSelector('h1, h2, h3', { timeout: 10000 });
    await inc.close();

    // Login as admin
    await loginViaMagicLink(page, TEST_EMAIL);
    
    // Verify we're authenticated as admin
    const authStatus = await checkAuthStatus(page);
    expect(authStatus.authenticated).toBe(true);
    expect(authStatus.role).toBe('admin');
    
    // Test various super-admin only endpoints
    const protectedEndpoints = [
      '/admin/management',
      '/admin/management/invite',
      '/api/admin/management/invite'
    ];
    
    for (const endpoint of protectedEndpoints) {
      console.log(`[test] Testing access to: ${endpoint}`);
      const response = await page.request.get(endpoint);
      expect([401, 403]).toContain(response.status());
      console.log(`[test] ${endpoint} correctly blocked with status: ${response.status()}`);
    }
    
    console.log(`[test] Super-admin feature access test completed successfully`);
  });

  test('admin can access regular admin features', async ({ page, request, browser }) => {
    console.log(`[test] Starting regular admin feature access test for ${TEST_EMAIL}`);
    
    // Setup: Send invitation and accept it
    const { id, token } = await sendAdminInvite(request, TEST_EMAIL);
    const acceptUrl = await getAcceptUrl(request, TEST_EMAIL);
    
    const inc = await browser.newContext();
    const acceptPage = await inc.newPage();
    await acceptPage.goto(acceptUrl);
    await acceptPage.waitForSelector('h1, h2, h3', { timeout: 10000 });
    await inc.close();

    // Login as admin
    await loginViaMagicLink(page, TEST_EMAIL);
    
    // Verify we're authenticated as admin
    const authStatus = await checkAuthStatus(page);
    expect(authStatus.authenticated).toBe(true);
    expect(authStatus.role).toBe('admin');
    
    // Test regular admin endpoints that should be accessible
    const accessibleEndpoints = [
      '/admin',
      '/admin/audit',
      '/api/admin/me'
    ];
    
    for (const endpoint of accessibleEndpoints) {
      console.log(`[test] Testing access to: ${endpoint}`);
      const response = await page.request.get(endpoint);
      expect(response.status()).toBeLessThan(400);
      console.log(`[test] ${endpoint} accessible with status: ${response.status()}`);
    }
    
    console.log(`[test] Regular admin feature access test completed successfully`);
  });

  test('logout clears authentication state', async ({ page, request, browser }) => {
    console.log(`[test] Starting logout test for ${TEST_EMAIL}`);
    
    // Setup: Send invitation and accept it
    const { id, token } = await sendAdminInvite(request, TEST_EMAIL);
    const acceptUrl = await getAcceptUrl(request, TEST_EMAIL);
    
    const inc = await browser.newContext();
    const acceptPage = await inc.newPage();
    await acceptPage.goto(acceptUrl);
    await acceptPage.waitForSelector('h1, h2, h3', { timeout: 10000 });
    await inc.close();

    // Login as admin
    await loginViaMagicLink(page, TEST_EMAIL);
    
    // Verify we're authenticated
    const authStatusBefore = await checkAuthStatus(page);
    expect(authStatusBefore.authenticated).toBe(true);
    expect(authStatusBefore.role).toBe('admin');
    
    // Logout
    await logout(page);
    
    // Verify we're no longer authenticated
    const authStatusAfter = await checkAuthStatus(page);
    expect(authStatusAfter.authenticated).toBe(false);
    
    // Verify we're on the login page
    await expect(page.getByText('Admin Login')).toBeVisible();
    
    console.log(`[test] Logout test completed successfully`);
  });
});
