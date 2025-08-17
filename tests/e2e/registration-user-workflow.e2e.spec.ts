import { test, expect } from '@playwright/test';

test.describe('Registration User Workflow', () => {
  test('should complete registration flow successfully', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Fill out the registration form
    await page.fill('[name="title"]', 'Mr');
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    await page.fill('[name="nickname"]', 'TestUser');
    await page.fill('[name="phone"]', '0123456789');
    await page.fill('[name="lineId"]', 'testuser123');
    await page.fill('[name="email"]', 'test-user-e2e@example.com');
    await page.fill('[name="companyName"]', 'Test Company');
    await page.selectOption('[name="businessType"]', 'technology');
    await page.selectOption('[name="yecProvince"]', 'bangkok');
    await page.selectOption('[name="hotelChoice"]', 'in-quota');
    await page.selectOption('[name="roomType"]', 'single');
    await page.selectOption('[name="travelType"]', 'private-car');
    
    // Check PDPA consent
    await page.check('[name="pdpaConsent"]');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to preview page
    await page.waitForURL('/preview');
    
    // Verify we're on the preview page
    await expect(page).toHaveURL('/preview');
    
    // Accept PDPA consent on preview page
    await page.check('[name="pdpaConsent"]');
    
    // Submit the registration
    await page.click('button[type="submit"]');
    
    // Wait for navigation to success page
    await page.waitForURL('/success');
    
    // Verify we're on the success page
    await expect(page).toHaveURL(/\/success/);
    
    // Verify success message
    await expect(page.locator('text=ลงทะเบียนสำเร็จ')).toBeVisible();
    
    // Verify registration ID is displayed
    await expect(page.locator('text=YEC-')).toBeVisible();
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should stay on the same page (no navigation)
    await expect(page).toHaveURL('/');
    
    // Should show validation errors
    await expect(page.locator('text=กรุณากรอกข้อมูลให้ครบถ้วน')).toBeVisible();
  });

  test('should handle duplicate email gracefully', async ({ page }) => {
    // First, create a registration via API to ensure we have a duplicate
    const response = await page.request.post('/api/register', {
      data: {
        title: 'Mr',
        firstName: 'Duplicate',
        lastName: 'User',
        nickname: 'DuplicateUser',
        phone: '0123456799',
        lineId: 'duplicateuser123',
        email: 'duplicate-test@example.com',
        companyName: 'Test Company',
        businessType: 'technology',
        yecProvince: 'bangkok',
        hotelChoice: 'in-quota',
        roomType: 'single',
        travelType: 'private-car',
        pdpaConsent: true,
      },
    });
    
    expect(response.status()).toBe(200);
    
    // Now try to register with the same email
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Fill out the form with the same email
    await page.fill('[name="title"]', 'Mr');
    await page.fill('[name="firstName"]', 'Another');
    await page.fill('[name="lastName"]', 'User');
    await page.fill('[name="nickname"]', 'AnotherUser');
    await page.fill('[name="phone"]', '0123456798');
    await page.fill('[name="lineId"]', 'anotheruser123');
    await page.fill('[name="email"]', 'duplicate-test@example.com'); // Same email
    await page.fill('[name="companyName"]', 'Test Company');
    await page.selectOption('[name="businessType"]', 'technology');
    await page.selectOption('[name="yecProvince"]', 'bangkok');
    await page.selectOption('[name="hotelChoice"]', 'in-quota');
    await page.selectOption('[name="roomType"]', 'single');
    await page.selectOption('[name="travelType"]', 'private-car');
    await page.check('[name="pdpaConsent"]');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to preview page
    await page.waitForURL('/preview');
    
    // Accept PDPA consent on preview page
    await page.check('[name="pdpaConsent"]');
    
    // Submit the registration
    await page.click('button[type="submit"]');
    
    // Should show error message for duplicate email
    await expect(page.locator('text=email address already exists')).toBeVisible();
  });

  test('should handle server errors gracefully', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Fill out the form with invalid data that might cause server errors
    await page.fill('[name="title"]', 'Mr');
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    await page.fill('[name="nickname"]', 'TestUser');
    await page.fill('[name="phone"]', '0123456789');
    await page.fill('[name="lineId"]', 'testuser123');
    await page.fill('[name="email"]', 'test-user-error@example.com');
    await page.fill('[name="companyName"]', 'Test Company');
    await page.selectOption('[name="businessType"]', 'technology');
    await page.selectOption('[name="yecProvince"]', 'bangkok');
    await page.selectOption('[name="hotelChoice"]', 'in-quota');
    await page.selectOption('[name="roomType"]', 'single');
    await page.selectOption('[name="travelType"]', 'private-car');
    await page.check('[name="pdpaConsent"]');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to preview page
    await page.waitForURL('/preview');
    
    // Accept PDPA consent on preview page
    await page.check('[name="pdpaConsent"]');
    
    // Submit the registration
    await page.click('button[type="submit"]');
    
    // Should either succeed or show a proper error message
    // (not a generic 500 error)
    const currentUrl = page.url();
    if (currentUrl.includes('/success')) {
      // Success case
      await expect(page.locator('text=ลงทะเบียนสำเร็จ')).toBeVisible();
    } else {
      // Error case - should show structured error, not generic 500
      await expect(page.locator('text=Server error')).not.toBeVisible();
      await expect(page.locator('text=An unexpected error occurred')).not.toBeVisible();
    }
  });
});
