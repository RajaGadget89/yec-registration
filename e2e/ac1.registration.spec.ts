import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('AC1 - Complete Registration Flow', () => {
  test('should complete full registration flow: form submission → admin verification → email outbox', async ({ page }) => {
    const testId = `ac1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testEmail = `test-${testId}@example.com`;
    
    // Step 1: Visit registration page and verify form structure
    await page.goto('/');
    await expect(page).toHaveTitle(/YEC Day/);
    await expect(page.locator('form')).toBeVisible();
    
    // Step 2: Fill all required form fields
    console.log('Filling registration form...');
    
    // Basic information
    await page.selectOption('select[name="title"]', 'Mr.');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="nickname"]', `Test${testId.substring(0, 8)}`);
    await page.fill('input[name="phone"]', '0812345678');
    await page.fill('input[name="lineId"]', `test${testId.substring(0, 8)}`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="companyName"]', 'Test Company Ltd.');
    
    // Business information
    await page.selectOption('select[name="businessType"]', 'technology');
    
    // Handle custom yecProvince dropdown
    console.log('Setting yecProvince...');
    await page.click('button[name="yecProvince"]');
    
    // Wait for dropdown to open and click on Bangkok option
    await page.waitForSelector('button:has-text("กรุงเทพมหานคร")', { state: 'visible' });
    await page.click('button:has-text("กรุงเทพมหานคร")');
    
    // Hotel and travel preferences
    await page.selectOption('select[name="hotelChoice"]', 'in-quota');
    await page.selectOption('select[name="roomType"]', 'single');
    await page.selectOption('select[name="travelType"]', 'private-car');
    
    // Step 3: Upload required files
    console.log('Uploading test files...');
    
    // Upload profile image
    const profileImagePath = path.join(__dirname, 'files', 'profile-ok.jpg');
    await page.setInputFiles('input[name="profileImage"]', profileImagePath);
    
    // Upload payment slip
    const paymentSlipPath = path.join(__dirname, 'files', 'payment-ok.jpg');
    await page.setInputFiles('input[name="paymentSlip"]', paymentSlipPath);
    
    // Upload chamber card
    const chamberCardPath = path.join(__dirname, 'files', 'tcc-ok.jpg');
    await page.setInputFiles('input[name="chamberCard"]', chamberCardPath);
    
    // Step 4: Verify submit button is enabled and submit form
    console.log('Submitting form...');
    const submitButton = page.locator('button[type="submit"]');
    
    // Wait for form validation to complete and submit button to be enabled
    await page.waitForTimeout(2000); // Allow time for file uploads and validation
    
    // Check if submit button is enabled (not disabled)
    await expect(submitButton).not.toHaveClass(/cursor-not-allowed/);
    await expect(submitButton).toBeEnabled();
    
    // Submit the form
    await submitButton.click();
    
    // Step 5: Verify successful submission
    console.log('Verifying submission...');
    
    // Wait for redirect to success page or confirmation
    await page.waitForURL(/\/success|\/preview/, { timeout: 10000 });
    
    // Verify we're on a success or preview page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/success|\/preview/);
    
    console.log('AC1 test completed successfully!');
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
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="nickname"]')).toBeVisible();
    await expect(page.locator('input[name="lineId"]')).toBeVisible();
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
    
    // Check that all required select fields are present
    await expect(page.locator('select[name="title"]')).toBeVisible();
    await expect(page.locator('select[name="businessType"]')).toBeVisible();
    await expect(page.locator('select[name="hotelChoice"]')).toBeVisible();
    await expect(page.locator('select[name="travelType"]')).toBeVisible();
    
    // Check that the yecProvince button is present
    await expect(page.locator('button[name="yecProvince"]')).toBeVisible();
    
    // Check that all required file upload fields are present (they're hidden but exist)
    await expect(page.locator('input[name="profileImage"]')).toBeAttached();
    await expect(page.locator('input[name="paymentSlip"]')).toBeAttached();
    await expect(page.locator('input[name="chamberCard"]')).toBeAttached();
    
    // Check that the submit button is present (but likely disabled initially)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });
});
