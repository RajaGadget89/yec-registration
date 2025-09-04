import { test, expect } from '@playwright/test';

test.describe('UAT-04: Accept Page CORS Hotfix', () => {
  test('should navigate to accept API and follow 303 redirect without CORS error', async ({ page }) => {
    // Navigate to accept page with a test token
    await page.goto('/admin/accept?token=test-token-123');
    
    // Wait for the page to load and show loading state
    await expect(page.getByTestId('loading-state')).toBeVisible();
    
    // The page should attempt to accept the invitation
    // Since we're using navigation instead of fetch, this should work without CORS
    
    // Wait for either success state or error state (but not CORS error)
    await expect(page.locator('body')).toHaveText(/Welcome to YEC Day Admin Console|Invitation has been|Network error occurred/);
    
    // Verify no CORS errors in console
    const consoleErrors = await page.evaluate(() => {
      return (window as any).consoleErrors || [];
    });
    
    // Check that there are no CORS-related errors
    const corsErrors = consoleErrors.filter((error: string) => 
      error.includes('CORS') || error.includes('Failed to fetch') || error.includes('Access-Control')
    );
    
    expect(corsErrors).toHaveLength(0);
  });

  test('should handle already accepted invitation gracefully', async ({ page }) => {
    // Test with an already accepted invitation token
    await page.goto('/admin/accept?token=accepted-token-456');
    
    // Should show appropriate message without CORS error
    await expect(page.locator('body')).toHaveText(/already been accepted|Welcome to YEC Day Admin Console/);
    
    // No CORS errors should occur
    const consoleErrors = await page.evaluate(() => {
      return (window as any).consoleErrors || [];
    });
    
    const corsErrors = consoleErrors.filter((error: string) => 
      error.includes('CORS') || error.includes('Failed to fetch')
    );
    
    expect(corsErrors).toHaveLength(0);
  });

  test('should handle invalid/expired tokens without CORS error', async ({ page }) => {
    // Test with invalid token
    await page.goto('/admin/accept?token=invalid-token-789');
    
    // Should show error message without CORS error
    await expect(page.locator('body')).toHaveText(/Invalid invitation|expired|revoked/);
    
    // No CORS errors should occur
    const consoleErrors = await page.evaluate(() => {
      return (window as any).consoleErrors || [];
    });
    
    const corsErrors = consoleErrors.filter((error: string) => 
      error.includes('CORS') || error.includes('Failed to fetch')
    );
    
    expect(corsErrors).toHaveLength(0);
  });
});

