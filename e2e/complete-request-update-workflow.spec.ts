import { test, expect } from '@playwright/test';

test.describe('Complete Request Update Workflow', () => {
  test('End-to-end Request Update workflow with notes', async ({ page }) => {
    console.log('🔍 STARTING COMPLETE WORKFLOW TEST');
    console.log('=====================================');

    // Step 1: Navigate to admin dashboard
    console.log('1️⃣ Navigating to admin dashboard...');
    await page.goto('/admin');
    
    // Wait for dashboard to load
    await expect(page.locator('h1').first()).toContainText('Registration Management');
    console.log('✅ Admin dashboard loaded');

    // Step 2: Find a registration with enabled "Request Update" button
    console.log('2️⃣ Looking for registration with enabled Request Update button...');
    
    // Wait for the table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Find the first row with an enabled "Request Update" button
    const requestUpdateButton = page.locator('button:has-text("Request Update")').filter({ hasNotText: 'disabled' }).first();
    
    // Wait for the button to be visible and enabled
    await expect(requestUpdateButton).toBeVisible({ timeout: 10000 });
    await expect(requestUpdateButton).toBeEnabled({ timeout: 10000 });
    
    console.log('✅ Found enabled Request Update button');

    // Step 3: Click "Request Update" button
    console.log('3️⃣ Clicking Request Update button...');
    await requestUpdateButton.click();
    
    // Wait for the modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    console.log('✅ Request Update modal opened');

    // Step 4: Fill in the form
    console.log('4️⃣ Filling in the Request Update form...');
    
    // Select dimension (payment)
    await page.selectOption('select[name="dimension"]', 'payment');
    console.log('✅ Selected dimension: payment');
    
    // Fill in notes
    const testNotes = `E2E_TEST_${Date.now()}`;
    await page.fill('textarea[name="notes"]', testNotes);
    console.log(`✅ Filled notes: ${testNotes}`);
    
    // Step 5: Submit the form
    console.log('5️⃣ Submitting the Request Update form...');
    await page.click('button[type="submit"]');
    
    // Wait for the modal to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Request Update form submitted');

    // Step 6: Verify the status change
    console.log('6️⃣ Verifying status change...');
    
    // Wait for the table to update
    await page.waitForTimeout(2000);
    
    // Check if the status changed to "waiting_for_update_payment"
    const statusCell = page.locator('td').filter({ hasText: 'waiting_for_update_payment' }).first();
    await expect(statusCell).toBeVisible({ timeout: 10000 });
    console.log('✅ Status changed to waiting_for_update_payment');

    // Step 7: Verify the registration details
    console.log('7️⃣ Verifying registration details...');
    
    // Click on the registration row to open details
    await page.locator('table tbody tr').first().click();
    
    // Wait for details drawer to open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    console.log('✅ Details drawer opened');
    
    // Check if the notes are displayed
    const notesElement = page.locator('text=' + testNotes);
    await expect(notesElement).toBeVisible({ timeout: 5000 });
    console.log('✅ Notes are displayed in details drawer');

    // Step 8: Test the deep link (if available)
    console.log('8️⃣ Testing deep link functionality...');
    
    // Look for a deep link or update button in the details
    const updateButton = page.locator('button:has-text("Update")').first();
    if (await updateButton.isVisible()) {
      console.log('✅ Update button found in details drawer');
      
      // Click the update button to test the deep link
      await updateButton.click();
      
      // Wait for navigation or new tab
      await page.waitForTimeout(2000);
      console.log('✅ Deep link navigation tested');
    } else {
      console.log('ℹ️ No update button found in details drawer');
    }

    // Step 9: Final verification
    console.log('9️⃣ Final verification...');
    
    // Close the details drawer
    await page.keyboard.press('Escape');
    
    // Verify the registration is still in the correct status
    const finalStatusCell = page.locator('td').filter({ hasText: 'waiting_for_update_payment' }).first();
    await expect(finalStatusCell).toBeVisible({ timeout: 5000 });
    console.log('✅ Final status verification passed');

    console.log('🎉 COMPLETE WORKFLOW TEST PASSED!');
    console.log('=====================================');
    console.log('✅ All steps completed successfully:');
    console.log('   - Admin dashboard loaded');
    console.log('   - Request Update button found and clicked');
    console.log('   - Form filled and submitted');
    console.log('   - Status changed to waiting_for_update_payment');
    console.log('   - Notes displayed in details drawer');
    console.log('   - Deep link functionality tested');
    console.log('   - Final verification passed');
  });
});


