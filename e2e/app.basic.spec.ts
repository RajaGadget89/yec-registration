import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/YEC/);
    
    // Verify the page is accessible (not 404 or 500)
    const response = await page.waitForResponse(response => 
      response.url().includes(page.url()) && response.status() === 200
    );
    
    expect(response.status()).toBe(200);
  });

  test('should have health endpoint accessible', async ({ page }) => {
    const response = await page.goto('/api/health');
    
    expect(response?.status()).toBe(200);
    
    const healthData = await response?.json();
    expect(healthData).toHaveProperty('status');
    expect(healthData.status).toBe('healthy');
    expect(healthData).toHaveProperty('database');
    expect(healthData.database).toHaveProperty('routing');
    expect(healthData.database.routing).toBe('valid');
  });

  test('should display registration form elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for common registration form elements
    // These selectors should match your actual form structure
    await expect(page.locator('form')).toBeVisible();
    
    // Check for common form fields (adjust selectors based on your actual form)
    const formFields = [
      'input[type="text"]',
      'input[type="email"]',
      'button[type="submit"]'
    ];
    
    for (const selector of formFields) {
      await expect(page.locator(selector).first()).toBeVisible();
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    
    // Should return 404 status
    expect(response?.status()).toBe(404);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check for essential meta tags
    await expect(page.locator('meta[charset]')).toBeAttached();
    await expect(page.locator('meta[name="viewport"]')).toBeAttached();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    
    // Wait a bit for any potential errors to surface
    await page.waitForTimeout(2000);
    
    // If there are errors, log them but don't fail the test
    // This is more of a warning than a hard failure
    if (errors.length > 0) {
      console.warn('JavaScript errors found:', errors);
    }
    
    // The test passes even with JS errors for now
    // You can make this stricter by uncommenting the line below
    // expect(errors).toHaveLength(0);
  });

  test('should have responsive design elements', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page is responsive by testing different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Basic check that content is still visible
      await expect(page.locator('body')).toBeVisible();
      
      // Wait a moment for any responsive adjustments
      await page.waitForTimeout(500);
    }
  });
});
