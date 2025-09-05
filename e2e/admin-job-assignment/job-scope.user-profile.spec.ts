import { test, expect } from '../fixtures/auth';

/**
 * Job Scope — User Profile (NEGATIVE → RED)
 * 
 * Goal: An admin without `user_profile` scope cannot edit or approve profile info.
 * 
 * These tests are intentionally RED (failing) because:
 * 1. The current system doesn't have granular job scopes yet
 * 2. All admins can currently edit/approve profile fields
 * 3. These tests document the expected behavior for the PATCH phase
 */

test.describe('Job Scope — User Profile (negative)', () => {
  test('admin without profile scope cannot edit profile fields (UI)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin WITHOUT profile scope
    // Note: This will be a test account created in the PATCH phase
    // For now, we use a regular admin account that should be blocked
    await programmaticLogin('test@example.com'); // Non-admin account
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // 2) Navigate to a registration with profile information
    await page.goto(`${base}/admin/registrations?status=pending_profile`);
    
    // 3) Try to find and interact with profile-related buttons
    // These selectors are based on the existing admin UI structure
    const profileApproveButton = page.getByTestId('btn-pass-profile');
    const profileRequestButton = page.getByTestId('btn-request-profile');
    
    // 4) Verify that profile-related buttons are either hidden or show error
    // This test will FAIL (RED) because current system doesn't enforce scopes
    if (await profileApproveButton.isVisible()) {
      // If button is visible, clicking should show permission error
      await profileApproveButton.click();
      
      // Should show permission denied message
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      // Button should be hidden for users without profile scope
      await expect(profileApproveButton).toBeHidden();
    }
    
    // Same check for request update button
    if (await profileRequestButton.isVisible()) {
      await profileRequestButton.click();
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      await expect(profileRequestButton).toBeHidden();
    }
    
    // Placeholder assertion to trigger RED until granular scopes are implemented
    expect(false, 'UI must block profile actions without user_profile scope').toBe(true);
  });

  test('admin without profile scope cannot approve profile (API)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without profile scope
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
    
    // 4) Try to mark profile as passed via API
    const profileResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'profile' }
    });
    
    // 5) Should get 403 Forbidden for users without user_profile scope
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    expect(profileResponse.status()).toBe(403);
    
    const result = await profileResponse.json();
    expect(result.error).toContain('insufficient permissions');
    expect(result.error).toContain('user_profile');
    
    // Placeholder assertion to trigger RED until API enforcement is implemented
    expect(false, 'API must respond 403 without user_profile scope').toBe(true);
  });

  test('admin without profile scope cannot request profile update (API)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without profile scope
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
    
    // 4) Try to request profile update via API
    const requestResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/request-update`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { 
        dimension: 'profile',
        reason: 'Test profile scope enforcement'
      }
    });
    
    // 5) Should get 403 Forbidden for users without user_profile scope
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    expect(requestResponse.status()).toBe(403);
    
    const result = await requestResponse.json();
    expect(result.error).toContain('insufficient permissions');
    expect(result.error).toContain('user_profile');
    
    // Placeholder assertion to trigger RED until API enforcement is implemented
    expect(false, 'API must respond 403 for profile update requests without user_profile scope').toBe(true);
  });

  test('admin without profile scope cannot edit profile fields in registration form', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin without profile scope
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
    
    // 4) Try to find profile editing elements
    // These would be form fields for editing profile information
    const profileEditFields = page.locator('input[name*="profile"], input[name*="name"], input[name*="email"]');
    const profileSaveButton = page.getByRole('button', { name: /save profile|update profile/i });
    
    // 5) Verify that profile editing is blocked
    // This test will FAIL (RED) because current system doesn't enforce granular scopes
    if (await profileEditFields.count() > 0) {
      // If fields are visible, they should be disabled
      await expect(profileEditFields.first()).toBeDisabled();
    }
    
    if (await profileSaveButton.isVisible()) {
      // If save button is visible, clicking should show permission error
      await profileSaveButton.click();
      await expect(page.getByText(/not authorized|insufficient permissions|access denied/i)).toBeVisible();
    } else {
      // Save button should be hidden for users without profile scope
      await expect(profileSaveButton).toBeHidden();
    }
    
    // Placeholder assertion to trigger RED until granular scopes are implemented
    expect(false, 'Profile editing must be blocked without user_profile scope').toBe(true);
  });

  test('admin with profile scope can approve profile (positive control)', async ({ page, programmaticLogin }) => {
    // 1) Sign in as admin WITH profile scope
    // Note: This will be a test account with user_profile scope in the PATCH phase
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
    
    // 4) Mark profile as passed via API (should succeed)
    const profileResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'profile' }
    });
    
    // 5) Should succeed for users with user_profile scope
    expect([200, 201]).toContain(profileResponse.status());
    
    const result = await profileResponse.json();
    expect(result.ok).toBe(true);
    expect(result.dimension).toBe('profile');
    
    // This test should PASS (GREEN) as it validates the positive case
    expect(true, 'Admin with user_profile scope should be able to approve profile').toBe(true);
  });
});
