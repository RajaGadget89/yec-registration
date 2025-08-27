import { test, expect } from './fixtures';
import { getTestEnv } from './utils/env';

test.describe('Unauthenticated Admin Access', () => {
  test('should handle unauthenticated access gracefully without console errors', async ({ 
    page, 
    appUrl 
  }) => {
    const env = getTestEnv();
    
    // Clear all cookies to ensure unauthenticated state
    await page.context().clearCookies();
    
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to admin page
    console.log('[UNAUTH] Navigating to admin page');
    await page.goto(`${appUrl}/admin`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we see the "Not Authenticated" indicator
    console.log('[UNAUTH] Checking for unauthenticated state');
    await expect(page.locator('text=Not Authenticated')).toBeVisible();
    
    // Verify no console errors related to session or authentication
    const sessionErrors = consoleErrors.filter(error => 
      error.includes('Error getting session') || 
      error.includes('null') ||
      error.includes('Error getting current user')
    );
    
    console.log('[UNAUTH] Console errors found:', consoleErrors);
    console.log('[UNAUTH] Session-related errors:', sessionErrors);
    
    // Should not have any session-related console errors
    expect(sessionErrors).toHaveLength(0);
    
    // Verify the page doesn't show a red Dev Overlay error
    const hasErrorOverlay = await page.locator('[data-nextjs-error-overlay]').isVisible();
    expect(hasErrorOverlay).toBe(false);
    
    console.log('[UNAUTH] Unauthenticated access test completed successfully');
  });
  
  test('should redirect to login when accessing protected admin routes', async ({ 
    page, 
    appUrl 
  }) => {
    // Clear all cookies to ensure unauthenticated state
    await page.context().clearCookies();
    
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to a protected admin route
    console.log('[UNAUTH] Navigating to protected admin route');
    await page.goto(`${appUrl}/admin/audit`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Should either show "Not Authenticated" or redirect to login
    const notAuthenticated = await page.locator('text=Not Authenticated').isVisible();
    const loginPage = await page.locator('text=YEC Day Admin Login').isVisible();
    
    expect(notAuthenticated || loginPage).toBe(true);
    
    // Verify no session-related console errors
    const sessionErrors = consoleErrors.filter(error => 
      error.includes('Error getting session') || 
      error.includes('null') ||
      error.includes('Error getting current user')
    );
    
    expect(sessionErrors).toHaveLength(0);
    
    console.log('[UNAUTH] Protected route access test completed successfully');
  });
});
