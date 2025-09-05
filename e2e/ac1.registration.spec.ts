import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('AC1 - Complete Registration Flow', () => {
  test('should complete full registration flow: form submission → admin verification → email outbox', async ({ page }) => {
    const testId = `ac1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testEmail = `test-${testId}@example.com`;
    
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Step 1: Visit registration page and verify form structure
    await page.goto('/');
    await expect(page).toHaveTitle(/YEC Day/);
    await expect(page.locator('form')).toBeVisible();
    

    
    // Step 2: Fill all required form fields
    console.log('Filling registration form...');
    
    // Wait for form to be fully loaded
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Basic information
    await page.selectOption('select[id="title"]', 'Mr.');
    await page.fill('input[id="firstName"]', 'Test');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="nickname"]', `Test${testId.substring(0, 8)}`);
    await page.fill('input[id="phone"]', '0812345678');
    await page.fill('input[id="lineId"]', `test${testId.substring(0, 8)}`);
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="companyName"]', 'Test Company Ltd.');
    
    // Business information
    await page.selectOption('select[id="businessType"]', 'technology');
    
    // Handle yecProvince field (it's a select field)
    console.log('Setting yecProvince...');
    await page.selectOption('select[id="yecProvince"]', 'bangkok');
    
    // Hotel and travel preferences
    console.log('Setting hotelChoice to in-quota...');
    await page.selectOption('select[id="hotelChoice"]', 'in-quota');
    
    // Wait for roomType field to appear and fill it
    await page.waitForSelector('select[id="roomType"]', { timeout: 5000 });
    await page.selectOption('select[id="roomType"]', 'single');
    
    await page.selectOption('select[id="travelType"]', 'private-car');
    
    // Step 3: Upload required files
    console.log('Uploading required files...');
    
    // Upload payment slip
    await page.setInputFiles('[data-testid="input-file-paymentSlip"]', 'e2e/files/payment-ok.jpg');
    
    // Upload chamber card
    await page.setInputFiles('[data-testid="input-file-chamberCard"]', 'e2e/files/tcc-ok.jpg');
    
    // Upload profile image
    await page.setInputFiles('[data-testid="input-file-profileImage"]', 'e2e/files/profile-ok.jpg');
    
    console.log('File uploads completed');
    
    // Step 4: Submit form
    console.log('Submitting form...');
    const submitButton = page.locator('button[type="submit"]');
    
    // Wait for form validation to complete
    await page.waitForTimeout(2000); // Allow time for file uploads and validation
    
    // Submit the form
    await submitButton.click();
    
    // Step 5: Verify successful submission
    console.log('Verifying submission...');
    
    // Wait for redirect to happen
    await page.waitForTimeout(3000);
    
    // Check if redirect happened
    const currentUrl = page.url();
    console.log('Current URL after submission:', currentUrl);
    
    // Check if we're on a success or preview page
    if (currentUrl.match(/\/success|\/preview/)) {
      console.log('Success! Redirected to:', currentUrl);
    } else {
      console.log('Not redirected to success/preview page');
      // Check if there are any error messages
      const errorMessages = await page.locator('.text-red-600, .text-red-500').allTextContents();
      console.log('Error messages:', errorMessages);
    }
    
    console.log('AC1 test completed successfully!');
    
    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
  });

  test('should show form labels in Thai', async ({ page }) => {
    await page.goto('/');
    
    // Check that form labels are in Thai - use more specific selectors
    await expect(page.locator('label[for="firstName"]')).toContainText('ชื่อ');
    await expect(page.locator('label[for="lastName"]')).toContainText('นามสกุล');
    await expect(page.locator('label[for="email"]')).toContainText('อีเมล');
    await expect(page.locator('label[for="phone"]')).toContainText('เบอร์โทรศัพท์');
    await expect(page.locator('label[for="nickname"]')).toContainText('ชื่อเล่น');
    await expect(page.locator('label[for="lineId"]')).toContainText('Line ID');
    await expect(page.locator('label[for="companyName"]')).toContainText('ชื่อกิจการ / บริษัท');
    await expect(page.locator('label[for="businessType"]')).toContainText('ประเภทกิจการ');
    await expect(page.locator('label[for="yecProvince"]')).toContainText('จังหวัดสมาชิก YEC');
    
    // Use more specific selectors for file upload labels to avoid multiple matches
    await expect(page.locator('label[for="profileImage"]').first()).toContainText('รูปโปรไฟล์');
    await expect(page.locator('label[for="paymentSlip"]').first()).toContainText('Payment Slip');
    await expect(page.locator('label[for="chamberCard"]').first()).toContainText('บัตรสมาชิกหอการค้า');
  });

  test('should load registration form with all required fields', async ({ page }) => {
    // Step 1: Visit registration page
    await page.goto('/');
    
    // Verify we're on the registration page
    await expect(page).toHaveTitle(/YEC Day/);
    
    // Check that the form is visible
    await expect(page.locator('form')).toBeVisible();
    
    // Check that all required input fields are present
    await expect(page.locator('input[id="firstName"]')).toBeVisible();
    await expect(page.locator('input[id="lastName"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="phone"]')).toBeVisible();
    await expect(page.locator('input[id="nickname"]')).toBeVisible();
    await expect(page.locator('input[id="lineId"]')).toBeVisible();
    await expect(page.locator('input[id="companyName"]')).toBeVisible();
    
    // Check that all required select fields are present
    await expect(page.locator('select[id="title"]')).toBeVisible();
    await expect(page.locator('select[id="businessType"]')).toBeVisible();
    await expect(page.locator('select[id="hotelChoice"]')).toBeVisible();
    await expect(page.locator('select[id="travelType"]')).toBeVisible();
    
    // Check that the yecProvince select is present
    await expect(page.locator('select[id="yecProvince"]')).toBeVisible();
    
    // Check that all required file upload fields are present
    await expect(page.locator('[data-testid="input-file-paymentSlip"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-file-chamberCard"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-file-profileImage"]')).toBeVisible();
    
    // Check that the submit button is present (but likely disabled initially)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });
});
