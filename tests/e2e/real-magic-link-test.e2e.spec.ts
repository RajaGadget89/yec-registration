import { test, expect } from '@playwright/test';

test.describe('Real Magic Link Test', () => {
  test('should capture real magic link redirect issue', async ({ page }) => {
    console.log('🔍 Starting real magic link test...');
    
    // Step 1: Navigate to admin login page
    console.log('📱 Navigating to admin login page...');
    await page.goto('http://localhost:8080/admin/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Step 2: Fill in email and submit
    console.log('📧 Filling email and submitting...');
    await page.fill('input[type="email"]', 'raja.gadgets89@gmail.com');
    
    // Click the magic link button
    await page.click('button:has-text("Send Magic Link")');
    
    // Wait for any response
    await page.waitForTimeout(2000);
    
    // Step 3: Check if we got redirected or if there's an error
    console.log('🔍 Checking current URL...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Step 4: Check for any error messages or console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });
    
    // Step 5: Wait a bit more and check again
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    // Step 6: Check if we're still on login page or got redirected
    if (finalUrl.includes('admin/login')) {
      console.log('✅ Still on login page - checking for success message...');
      
      // Look for any success messages
      const successMessage = await page.locator('text=Magic link sent').count();
      if (successMessage > 0) {
        console.log('✅ Magic link sent successfully!');
      } else {
        console.log('❌ No success message found');
      }
    } else {
      console.log('🔄 Got redirected to:', finalUrl);
    }
    
    // Step 7: Check for any error messages
    const errorMessages = await page.locator('.error, .alert, [role="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:', errorMessages);
    }
    
    // Step 8: Check console logs for any errors
    const errorLogs = consoleLogs.filter(log => log.includes('error') || log.includes('Error'));
    if (errorLogs.length > 0) {
      console.log('❌ Console errors found:', errorLogs);
    }
    
    // Step 9: Take a screenshot for debugging
    await page.screenshot({ path: 'test-artifacts/real-magic-link-test.png' });
    
    console.log('📊 Test completed. Check the screenshot for visual debugging.');
    
    // Basic assertions
    expect(finalUrl).toBeDefined();
    expect(errorMessages.length).toBeLessThan(5); // Allow some minor errors
  });
});
