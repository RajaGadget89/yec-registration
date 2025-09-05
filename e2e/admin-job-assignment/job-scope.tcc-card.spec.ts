import { test, expect } from '../fixtures/auth';

/**
 * Job Scope — TCC Card (NEGATIVE → RED)
 * 
 * Goal: An admin without `tcc_card` scope cannot approve TCC card.
 * 
 * These tests are intentionally RED (failing) because:
 * 1. The current system doesn't have granular job scopes yet
 * 2. All admins can currently approve TCC cards
 * 3. These tests document the expected behavior for the PATCH phase
 */

test.describe('Job Scope — TCC Card (negative)', () => {
  test('admin without TCC scope cannot approve TCC card (UI)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin WITHOUT TCC scope
    // Note: This will be a test account created in the PATCH phase
    // For now, we use a regular admin account that should be blocked
    await programmaticLogin('test@example.com'); // Non-admin account
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // 2) Navigate to a registration with TCC card information
    await page.goto(`${base}/admin/registrations?status=pending_tcc`);
    
    // 3) Try to find and interact with TCC-related buttons
    // These selectors are based on the existing admin UI structure
    const tccApproveButton = page.getByTestId('btn-pass-tcc');
    const tccRequestButton = page.getByTestId('btn-request-tcc');
    
    // 4) Verify that TCC-related buttons are either hidden or show error
    // This test will FAIL (RED) because current system doesn't enforce scopes
    if (await tccApproveButton.isVisible()) {
      // If button is visible, clicking should show permission error
      await tccApproveButton.click();
      
      // Should show permission denied message
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      // Button should be hidden for users without TCC scope
      await expect(tccApproveButton).toBeHidden();
    }
    
    // Same check for request update button
    if (await tccRequestButton.isVisible()) {
      await tccRequestButton.click();
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      await expect(tccRequestButton).toBeHidden();
    }
    
    // Placeholder assertion to trigger RED until granular scopes are implemented
    expect(false, 'UI must block TCC actions without tcc_card scope').toBe(true);
  });

  test('admin without TCC scope cannot approve TCC card (API)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without TCC scope
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
    
    // 4) Try to mark TCC as passed via API
    const tccResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'tcc' }
    });
    
    // 5) Should get 403 Forbidden for users without tcc_card scope
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    expect(tccResponse.status()).toBe(403);
    
    const result = await tccResponse.json();
    expect(result.error).toContain('insufficient permissions');
    expect(result.error).toContain('tcc_card');
    
    // Placeholder assertion to trigger RED until API enforcement is implemented
    expect(false, 'API must respond 403 without tcc_card scope').toBe(true);
  });

  test('admin without TCC scope cannot request TCC update (API)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without TCC scope
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
    
    // 4) Try to request TCC update via API
    const requestResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/request-update`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { 
        dimension: 'tcc',
        reason: 'Test TCC scope enforcement'
      }
    });
    
    // 5) Should get 403 Forbidden for users without tcc_card scope
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    expect(requestResponse.status()).toBe(403);
    
    const result = await requestResponse.json();
    expect(result.error).toContain('insufficient permissions');
    expect(result.error).toContain('tcc_card');
    
    // Placeholder assertion to trigger RED until API enforcement is implemented
    expect(false, 'API must respond 403 for TCC update requests without tcc_card scope').toBe(true);
  });

  test('admin without TCC scope cannot view TCC card details', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without TCC scope
    await programmaticLogin('test@example.com'); // Non-admin account
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // 2) Navigate to a specific registration detail page
    // First get a registration ID
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // 3) Navigate to registration detail page
    await page.goto(`${base}/admin/registrations/${registration.id}`);
    
    // 4) Try to find TCC-related elements
    const tccSection = page.locator('[data-testid*="tcc"], [data-testid*="TCC"]');
    const tccImage = page.locator('img[alt*="TCC"], img[alt*="tcc"]');
    const tccDownloadButton = page.getByRole('button', { name: /download.*tcc|view.*tcc/i });
    
    // 5) Verify that TCC-related elements are either hidden or show error
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    if (await tccSection.count() > 0) {
      // TCC section should be hidden or show permission error
      await expect(tccSection.first()).toBeHidden();
    }
    
    if (await tccImage.count() > 0) {
      // TCC images should be hidden
      await expect(tccImage.first()).toBeHidden();
    }
    
    if (await tccDownloadButton.isVisible()) {
      // If download button is visible, clicking should show permission error
      await tccDownloadButton.click();
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      // Download button should be hidden for users without TCC scope
      await expect(tccDownloadButton).toBeHidden();
    }
    
    // Placeholder assertion to trigger RED until granular scopes are implemented
    expect(false, 'TCC card access must be blocked without tcc_card scope').toBe(true);
  });

  test('admin without TCC scope cannot access TCC API endpoints', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without TCC scope
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
    
    // 4) Try to access TCC-specific API endpoints
    // These endpoints would be for TCC-specific operations
    const tccEndpoints = [
      `/api/admin/registrations/${registration.id}/tcc/validate`,
      `/api/admin/registrations/${registration.id}/tcc/download`,
      `/api/admin/registrations/${registration.id}/tcc/approve`
    ];
    
    for (const endpoint of tccEndpoints) {
      const tccResponse = await page.request.get(`${base}${endpoint}`, {
        headers: { 
          'X-E2E-RLS-BYPASS': '1',
          'Cookie': cookieHeader
        }
      });
      
      // 5) Should get 403 Forbidden for users without tcc_card scope
      // This test will FAIL (RED) because current system doesn't enforce granular scopes
      expect(tccResponse.status()).toBe(403);
      
      const result = await tccResponse.json();
      expect(result.error).toContain('insufficient permissions');
      expect(result.error).toContain('tcc_card');
    }
    
    // Placeholder assertion to trigger RED until API enforcement is implemented
    expect(false, 'TCC API endpoints must be blocked without tcc_card scope').toBe(true);
  });

  test('admin with TCC scope can approve TCC card (positive control)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin WITH TCC scope
    // Note: This will be a test account with tcc_card scope in the PATCH phase
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
    
    // 4) Mark TCC as passed via API (should succeed)
    const tccResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'tcc' }
    });
    
    // 5) Should succeed for users with tcc_card scope
    expect([200, 201]).toContain(tccResponse.status());
    
    const result = await tccResponse.json();
    expect(result.ok).toBe(true);
    expect(result.dimension).toBe('tcc');
    
    // This test should PASS (GREEN) as it validates the positive case
    expect(true, 'Admin with tcc_card scope should be able to approve TCC card').toBe(true);
  });
});
