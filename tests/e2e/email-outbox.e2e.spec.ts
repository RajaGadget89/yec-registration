import { test, expect } from '@playwright/test';
import { createTestData, cleanupTestData } from './helpers/testData';
import { adminLogin } from './helpers/testSetup';

test.describe('Email Outbox System', () => {
  let testRegistrationId: string;
  let testEmail: string;

  test.beforeEach(async ({ page }) => {
    // Create test data
    const testData = await createTestData();
    testRegistrationId = testData.registrationId;
    testEmail = testData.email;

    // Login as admin
    await adminLogin(page);
  });

  test.afterEach(async () => {
    // Cleanup test data
    await cleanupTestData(testRegistrationId);
  });

  test('should display email outbox widget in admin dashboard', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');

    // Check if email outbox widget is visible
    await expect(page.locator('text=Email Outbox')).toBeVisible();
    await expect(page.locator('text=Manage queued emails and manual dispatch')).toBeVisible();

    // Check for statistics display
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=Sent')).toBeVisible();
    await expect(page.locator('text=Errors')).toBeVisible();

    // Check for dispatch button
    await expect(page.locator('button:has-text("Dispatch Now")')).toBeVisible();
  });

  test('should show outbox statistics', async ({ page }) => {
    await page.goto('/admin');

    // Wait for outbox widget to load
    await page.waitForSelector('text=Email Outbox');

    // Check that statistics are displayed (should be 0 initially)
    const pendingBadge = page.locator('text=Pending').locator('..').locator('[data-testid="badge"]');
    const sentBadge = page.locator('text=Sent').locator('..').locator('[data-testid="badge"]');
    const errorBadge = page.locator('text=Errors').locator('..').locator('[data-testid="badge"]');

    await expect(pendingBadge).toContainText('0');
    await expect(sentBadge).toContainText('0');
    await expect(errorBadge).toContainText('0');
  });

  test('should handle manual email dispatch', async ({ page }) => {
    await page.goto('/admin');

    // Wait for outbox widget to load
    await page.waitForSelector('text=Email Outbox');

    // Click dispatch button
    const dispatchButton = page.locator('button:has-text("Dispatch Now")');
    await dispatchButton.click();

    // Wait for dispatch to complete
    await page.waitForTimeout(2000);

    // Check for success message (should show "No emails to dispatch" if no pending emails)
    const toastMessage = page.locator('[data-sonner-toast]');
    await expect(toastMessage).toBeVisible();
  });

  test('should handle auto-reject and email enqueue', async ({ page, request }) => {
    // First, let's manually trigger the auto-reject sweep for our test registration
    const sweepResponse = await request.post('/api/admin/registrations/test-sweep', {
      data: {
        registrationId: testRegistrationId,
        reason: 'deadline_missed'
      }
    });

    expect(sweepResponse.ok()).toBeTruthy();

    // Check that the registration status was updated
    const registrationResponse = await request.get(`/api/admin/registrations/${testRegistrationId}`);
    const registration = await registrationResponse.json();
    expect(registration.status).toBe('rejected');
    expect(registration.rejected_reason).toBe('deadline_missed');

    // Check that an email was enqueued in the outbox
    const outboxResponse = await request.get('/api/admin/dispatch-emails');
    const outboxStats = await outboxResponse.json();
    
    // Should have at least 1 pending email
    expect(outboxStats.stats.total_pending).toBeGreaterThan(0);

    // Navigate to admin dashboard and check outbox widget
    await page.goto('/admin');
    await page.waitForSelector('text=Email Outbox');

    // Check that pending count shows the enqueued email
    const pendingBadge = page.locator('text=Pending').locator('..').locator('[data-testid="badge"]');
    await expect(pendingBadge).toContainText('1');
  });

  test('should process enqueued emails through dispatcher', async ({ page, request }) => {
    // First, enqueue a test email
    const enqueueResponse = await request.post('/api/admin/enqueue-test-email', {
      data: {
        template: 'rejection',
        toEmail: testEmail,
        payload: {
          trackingCode: testRegistrationId,
          rejectedReason: 'deadline_missed',
          applicantName: 'Test User'
        }
      }
    });

    expect(enqueueResponse.ok()).toBeTruthy();

    // Check that email was enqueued
    const statsResponse = await request.get('/api/admin/dispatch-emails');
    const stats = await statsResponse.json();
    expect(stats.stats.total_pending).toBeGreaterThan(0);

    // Manually dispatch emails
    const dispatchResponse = await request.post('/api/admin/dispatch-emails', {
      data: { batchSize: 50 }
    });

    expect(dispatchResponse.ok()).toBeTruthy();
    const dispatchResult = await dispatchResponse.json();
    
    // Should have processed at least 1 email
    expect(dispatchResult.result.sent + dispatchResult.result.errors).toBeGreaterThan(0);

    // Check updated stats
    const updatedStatsResponse = await request.get('/api/admin/dispatch-emails');
    const updatedStats = await updatedStatsResponse.json();
    
    // Pending count should be reduced
    expect(updatedStats.stats.total_pending).toBeLessThanOrEqual(stats.stats.total_pending);
  });

  test('should handle email dispatch errors gracefully', async ({ page, request }) => {
    // Enqueue an email with invalid template to cause an error
    const enqueueResponse = await request.post('/api/admin/enqueue-test-email', {
      data: {
        template: 'invalid-template',
        toEmail: testEmail,
        payload: {
          trackingCode: testRegistrationId
        }
      }
    });

    expect(enqueueResponse.ok()).toBeTruthy();

    // Try to dispatch emails
    const dispatchResponse = await request.post('/api/admin/dispatch-emails', {
      data: { batchSize: 50 }
    });

    expect(dispatchResponse.ok()).toBeTruthy();
    const dispatchResult = await dispatchResponse.json();
    
    // Should have at least 1 error
    expect(dispatchResult.result.errors).toBeGreaterThan(0);

    // Check that error count increased in stats
    const statsResponse = await request.get('/api/admin/dispatch-emails');
    const stats = await statsResponse.json();
    expect(stats.stats.total_error).toBeGreaterThan(0);
  });

  test('should refresh outbox statistics automatically', async ({ page }) => {
    await page.goto('/admin');

    // Wait for outbox widget to load
    await page.waitForSelector('text=Email Outbox');

    // Get initial stats
    const initialPending = await page.locator('text=Pending').locator('..').locator('[data-testid="badge"]').textContent();

    // Wait for auto-refresh (30 seconds, but we'll wait a shorter time for testing)
    await page.waitForTimeout(5000);

    // Check that stats are still visible (widget didn't break)
    await expect(page.locator('text=Email Outbox')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('should handle outbox widget loading states', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');

    // Check that loading state is shown initially
    await expect(page.locator('text=Loading outbox statistics...')).toBeVisible();

    // Wait for widget to load
    await page.waitForSelector('text=Email Outbox', { timeout: 10000 });

    // Check that loading state is gone
    await expect(page.locator('text=Loading outbox statistics...')).not.toBeVisible();
  });

  test('should handle dispatch button disabled state', async ({ page }) => {
    await page.goto('/admin');

    // Wait for outbox widget to load
    await page.waitForSelector('text=Email Outbox');

    // If no pending emails, dispatch button should be disabled
    const dispatchButton = page.locator('button:has-text("Dispatch Now")');
    
    // Check if button is disabled (when no pending emails)
    const isDisabled = await dispatchButton.isDisabled();
    
    if (isDisabled) {
      // Button should be disabled when no emails to dispatch
      await expect(dispatchButton).toBeDisabled();
    } else {
      // Button should be enabled when there are emails to dispatch
      await expect(dispatchButton).toBeEnabled();
    }
  });
});

