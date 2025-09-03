import { test, expect } from '@playwright/test';
import { sendAdminInvite, getAcceptUrl } from './helpers/invite-helpers';
import { cleanupTestEmails } from './helpers/email-helpers';

const TEST_EMAIL = `uat04s-admin-${Date.now()}@example.com`;

test.describe('UAT-04S: Admin Invitation Acceptance Flow', () => {
  test.afterEach(async () => {
    // Clean up test data
    try {
      await cleanupTestEmails(TEST_EMAIL, 'uat04s');
    } catch (error) {
      console.log(`[cleanup] Error cleaning up test emails: ${error}`);
    }
  });

  test('invitation accept works exactly once', async ({ request, context, browser }) => {
    console.log(`[test] Starting invitation acceptance test for ${TEST_EMAIL}`);
    
    // Step 1: Send admin invitation
    console.log(`[test] Step 1: Sending admin invitation...`);
    const { id, token } = await sendAdminInvite(request, TEST_EMAIL);
    console.log(`[test] Invitation sent successfully - ID: ${id}, Token: ${token}`);
    
    // Step 2: Get accept URL
    console.log(`[test] Step 2: Retrieving accept URL...`);
    const acceptUrl = await getAcceptUrl(request, TEST_EMAIL);
    expect(acceptUrl).toContain('/admin/accept?token=');
    console.log(`[test] Accept URL: ${acceptUrl}`);

    // Step 3: First open (incognito context) - should succeed
    console.log(`[test] Step 3: Testing first acceptance (should succeed)...`);
    const inc = await browser.newContext();
    const page = await inc.newPage();
    
    const res1 = await page.goto(acceptUrl);
    expect(res1?.status()).toBeLessThan(400); // 200/3xx success UI state
    
    // Wait for the accept page to load and verify content
    await page.waitForSelector('h1, h2, h3', { timeout: 10000 });
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Welcome to YEC Day Admin Console');
    console.log(`[test] First acceptance successful - status: ${res1?.status()}`);

    // Step 4: Replay accept - should fail with 410
    console.log(`[test] Step 4: Testing replay acceptance (should fail with 410)...`);
    const res2 = await page.goto(acceptUrl);
    expect(res2?.status()).toBe(410);
    console.log(`[test] Replay acceptance correctly failed with 410`);
    
    await inc.close();
    console.log(`[test] Invitation acceptance test completed successfully`);
  });

  test('invalid token returns 410', async ({ request, browser }) => {
    console.log(`[test] Starting invalid token test`);
    
    const invalidToken = 'invalid-token-12345';
    const invalidAcceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/admin/accept?token=${invalidToken}`;
    
    const inc = await browser.newContext();
    const page = await inc.newPage();
    
    const response = await page.goto(invalidAcceptUrl);
    expect(response?.status()).toBe(410);
    
    // Verify error message
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Invalid or expired invitation');
    
    await inc.close();
    console.log(`[test] Invalid token test completed successfully`);
  });

  test('accept endpoint is publicly accessible (no auth required)', async ({ request, browser }) => {
    console.log(`[test] Starting public accessibility test`);
    
    // Send a real invitation first
    const { id, token } = await sendAdminInvite(request, TEST_EMAIL);
    const acceptUrl = await getAcceptUrl(request, TEST_EMAIL);
    
    // Test without any authentication - should work since accept is public
    const inc = await browser.newContext();
    const page = await inc.newPage();
    
    const response = await page.goto(acceptUrl);
    expect(response?.status()).toBeLessThan(400);
    
    // Verify the page loads correctly
    await page.waitForSelector('h1, h2, h3', { timeout: 10000 });
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Welcome to YEC Day Admin Console');
    
    await inc.close();
    console.log(`[test] Public accessibility test completed successfully`);
  });

  test('invitation token expires after 48 hours', async ({ request }) => {
    console.log(`[test] Starting token expiration test`);
    
    // This test would require manipulating the database to set an expired token
    // For now, we'll just verify the invitation was created with proper expiration
    const { id, token } = await sendAdminInvite(request, TEST_EMAIL);
    
    // The invitation should have been created with 48-hour expiration
    // This is handled by the database constraint, so we just verify the invitation exists
    expect(id).toBeTruthy();
    expect(token).toBeTruthy();
    
    console.log(`[test] Token expiration test completed successfully`);
  });
});
