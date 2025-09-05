import { test, expect } from '../fixtures/auth';

/**
 * Job Scope — Payment Slip (NEGATIVE → RED)
 * 
 * Goal: An admin without `payment_slip` scope must NOT be able to approve or mark-pass any payment slip.
 * 
 * These tests are intentionally RED (failing) because:
 * 1. The current system doesn't have granular job scopes yet
 * 2. All admins can currently approve/mark-pass payment slips
 * 3. These tests document the expected behavior for the PATCH phase
 */

test.describe('Job Scope — Payment Slip (negative)', () => {
  test('admin without payment scope cannot approve slip (UI)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as non-super admin WITHOUT payment scope
    // Note: This will be a test account created in the PATCH phase
    // For now, we use a regular admin account that should be blocked
    await programmaticLogin('test@example.com'); // Non-admin account
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // 2) Navigate to a registration with a pending payment slip
    await page.goto(`${base}/admin/registrations?status=pending_payment`);
    
    // 3) Try to find and interact with payment approval buttons
    // These selectors are based on the existing admin UI structure
    const paymentApproveButton = page.getByTestId('btn-pass-payment');
    const paymentRequestButton = page.getByTestId('btn-request-payment');
    
    // 4) Verify that payment-related buttons are either hidden or show error
    // This test will FAIL (RED) because current system doesn't enforce scopes
    if (await paymentApproveButton.isVisible()) {
      // If button is visible, clicking should show permission error
      await paymentApproveButton.click();
      
      // Should show permission denied message
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      // Button should be hidden for users without payment scope
      await expect(paymentApproveButton).toBeHidden();
    }
    
    // Same check for request update button
    if (await paymentRequestButton.isVisible()) {
      await paymentRequestButton.click();
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      await expect(paymentRequestButton).toBeHidden();
    }
    
    // Placeholder assertion to trigger RED until granular scopes are implemented
    expect(false, 'UI must block payment actions without payment_slip scope').toBe(true);
  });

  test('admin without payment scope cannot approve slip (API)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without payment scope
    await programmaticLogin('test@example.com'); // Non-admin account
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // 2) Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // 3) Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // 4) Try to mark payment as passed via API
    const paymentResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'payment' }
    });
    
    // 5) Should get 403 Forbidden for users without payment_slip scope
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    expect(paymentResponse.status()).toBe(403);
    
    const result = await paymentResponse.json();
    expect(result.error).toContain('insufficient permissions');
    expect(result.error).toContain('payment_slip');
    
    // Placeholder assertion to trigger RED until API enforcement is implemented
    expect(false, 'API must respond 403 without payment_slip scope').toBe(true);
  });

  test('admin without payment scope cannot request payment update (API)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without payment scope
    await programmaticLogin('test@example.com'); // Non-admin account
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // 2) Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // 3) Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // 4) Try to request payment update via API
    const requestResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/request-update`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { 
        dimension: 'payment',
        reason: 'Test payment scope enforcement'
      }
    });
    
    // 5) Should get 403 Forbidden for users without payment_slip scope
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    expect(requestResponse.status()).toBe(403);
    
    const result = await requestResponse.json();
    expect(result.error).toContain('insufficient permissions');
    expect(result.error).toContain('payment_slip');
    
    // Placeholder assertion to trigger RED until API enforcement is implemented
    expect(false, 'API must respond 403 for payment update requests without payment_slip scope').toBe(true);
  });

  test('admin with payment scope can approve slip (positive control)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin WITH payment scope
    // Note: This will be a test account with payment_slip scope in the PATCH phase
    // For now, we use a super admin that should have all permissions
    await programmaticLogin('raja.gadgets89@gmail.com'); // Super admin
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // 2) Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // 3) Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // 4) Mark payment as passed via API (should succeed)
    const paymentResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'payment' }
    });
    
    // 5) Should succeed for users with payment_slip scope
    expect([200, 201]).toContain(paymentResponse.status());
    
    const result = await paymentResponse.json();
    expect(result.ok).toBe(true);
    expect(result.dimension).toBe('payment');
    
    // This test should PASS (GREEN) as it validates the positive case
    expect(true, 'Admin with payment_slip scope should be able to approve payment').toBe(true);
  });
});
