import { test, expect, Page } from '@playwright/test';

/**
 * Admin Delete UI Refresh Debug Test
 * 
 * This test captures the exact runtime behavior and DOM state
 * to identify why the UI doesn't refresh after admin delete operations.
 */

test.describe('Admin Delete UI Refresh Debug', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create a new page with detailed logging
    page = await browser.newPage();
    
    // Enable console logging to capture all runtime events
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // Enable network logging to capture API calls
    page.on('request', request => {
      console.log(`[NETWORK REQUEST] ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`[NETWORK RESPONSE] ${response.status()} ${response.url()}`);
    });

    // Set authentication cookie before navigating
    await page.context().addCookies([{
      name: 'admin-email',
      value: 'raja.gadgets89@gmail.com',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }]);

    // Navigate to admin management page
    await page.goto('http://localhost:8080/admin/management');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for admin list to load
    await page.waitForSelector('[data-testid="admin-list"], .admin-list, table', { timeout: 10000 });
  });

  test('Capture admin delete UI refresh behavior', async () => {
    console.log('\n🔍 Starting Admin Delete UI Refresh Debug Test');
    
    // Step 1: Capture initial DOM state
    console.log('\n📸 Step 1: Capturing initial DOM state');
    
    // Try multiple selectors for admin rows
    const adminRowSelectors = [
      '[data-testid="admin-row"]',
      'tr[data-admin-id]',
      'tbody tr',
      '.admin-row',
      'tr'
    ];
    
    let adminRows = null;
    let initialAdminRows = 0;
    
    for (const selector of adminRowSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        adminRows = page.locator(selector);
        initialAdminRows = count;
        console.log(`Found admin rows using selector: ${selector} (count: ${count})`);
        break;
      }
    }
    
    if (!adminRows) {
      console.log('❌ No admin rows found with any selector');
      return;
    }
    
    // Capture initial admin list HTML
    const adminListSelectors = [
      '[data-testid="admin-list"]',
      '.admin-list',
      'table',
      'tbody',
      'main'
    ];
    
    let initialAdminListHTML = '';
    for (const selector of adminListSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          initialAdminListHTML = await element.innerHTML();
          console.log(`Captured HTML using selector: ${selector} (length: ${initialAdminListHTML.length})`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Step 2: Find a deletable admin (not the current user)
    console.log('\n🎯 Step 2: Finding deletable admin');
    const adminCount = await adminRows.count();
    console.log(`Total admin rows found: ${adminCount}`);
    
    let targetAdminRow = null;
    let targetAdminEmail = '';
    let targetAdminId = '';
    
    // Find an admin that's not the current user (raja.gadgets89@gmail.com)
    for (let i = 0; i < adminCount; i++) {
      const row = adminRows.nth(i);
      
      // Try multiple selectors for email
      const emailSelectors = [
        '[data-testid="admin-email"]',
        '.admin-email',
        'td:nth-child(2)', // Usually email is in second column
        'td:nth-child(1)', // Sometimes email is in first column
        'td'
      ];
      
      let email = '';
      for (const selector of emailSelectors) {
        try {
          const emailElement = row.locator(selector);
          if (await emailElement.isVisible()) {
            const emailText = await emailElement.textContent();
            if (emailText && emailText.includes('@')) {
              email = emailText.trim();
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      console.log(`Checking admin ${i}: ${email}`);
      
      if (email && !email.includes('raja.gadgets89@gmail.com')) {
        targetAdminRow = row;
        targetAdminEmail = email;
        targetAdminId = await row.getAttribute('data-admin-id') || '';
        console.log(`✅ Found target admin: ${targetAdminEmail} (ID: ${targetAdminId})`);
        break;
      }
    }
    
    if (!targetAdminRow) {
      console.log('❌ No deletable admin found');
      return;
    }
    
    // Step 3: Capture state before delete
    console.log('\n📊 Step 3: Capturing state before delete');
    const beforeDeleteState = {
      adminCount: await adminRows.count(),
      targetAdminVisible: await targetAdminRow.isVisible(),
      adminListHTML: await page.locator('[data-testid="admin-list"]').innerHTML(),
      loadingState: await page.locator('[data-testid="loading"]').isVisible(),
      errorState: await page.locator('[data-testid="error"]').isVisible()
    };
    console.log('Before delete state:', beforeDeleteState);
    
    // Step 4: Monitor network requests during delete
    console.log('\n🌐 Step 4: Monitoring network requests during delete');
    const deleteRequests: any[] = [];
    const deleteResponses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/admin/management/admins/') && request.method() === 'DELETE') {
        deleteRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        });
        console.log(`[DELETE REQUEST] ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/admin/management/admins/') && response.request().method() === 'DELETE') {
        deleteResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now()
        });
        console.log(`[DELETE RESPONSE] ${response.status()} ${response.url()}`);
      }
    });
    
    // Step 5: Perform delete operation
    console.log('\n🗑️ Step 5: Performing delete operation');
    
    // Try multiple selectors for delete button
    const deleteButtonSelectors = [
      '[data-testid="delete-button"]',
      '.delete-button',
      'button[aria-label*="delete" i]',
      'button[title*="delete" i]',
      'button:has-text("Delete")',
      'button:has-text("🗑️")',
      'button:has-text("Delete")',
      'button'
    ];
    
    let deleteButton = null;
    for (const selector of deleteButtonSelectors) {
      try {
        const button = targetAdminRow.locator(selector);
        if (await button.isVisible()) {
          deleteButton = button;
          console.log(`Found delete button using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!deleteButton) {
      console.log('❌ No delete button found');
      return;
    }
    
    // Click delete button
    await deleteButton.click();
    
    // Wait for confirmation dialog
    const confirmationSelectors = [
      '[data-testid="delete-confirmation"]',
      '.delete-confirmation',
      '.modal',
      '.dialog',
      '[role="dialog"]',
      '.confirmation-dialog'
    ];
    
    let confirmationDialog = null;
    for (const selector of confirmationSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        confirmationDialog = page.locator(selector);
        console.log(`✅ Delete confirmation dialog appeared using selector: ${selector}`);
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!confirmationDialog) {
      console.log('⚠️ No confirmation dialog found, proceeding with delete');
    } else {
      // Confirm delete
      const confirmButtonSelectors = [
        '[data-testid="confirm-delete"]',
        '.confirm-delete',
        'button:has-text("Confirm")',
        'button:has-text("Delete")',
        'button:has-text("Yes")',
        'button[type="submit"]',
        'button'
      ];
      
      let confirmButton = null;
      for (const selector of confirmButtonSelectors) {
        try {
          const button = confirmationDialog.locator(selector);
          if (await button.isVisible()) {
            confirmButton = button;
            console.log(`Found confirm button using selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (confirmButton) {
        await confirmButton.click();
        console.log('✅ Delete confirmed');
      } else {
        console.log('⚠️ No confirm button found, trying to click any button in dialog');
        await confirmationDialog.locator('button').first().click();
      }
    }
    
    // Step 6: Monitor UI changes after delete
    console.log('\n👀 Step 6: Monitoring UI changes after delete');
    
    // Wait for delete operation to complete (check for loading states)
    await page.waitForTimeout(2000);
    
    // Capture immediate state after delete
    const immediateAfterState = {
      adminCount: await adminRows.count(),
      targetAdminVisible: await targetAdminRow.isVisible(),
      loadingState: await page.locator('[data-testid="loading"]').isVisible(),
      errorState: await page.locator('[data-testid="error"]').isVisible(),
      successMessage: await page.locator('[data-testid="success-message"]').isVisible()
    };
    console.log('Immediate after delete state:', immediateAfterState);
    
    // Wait for potential refresh
    await page.waitForTimeout(3000);
    
    // Capture final state
    const finalState = {
      adminCount: await adminRows.count(),
      targetAdminVisible: await targetAdminRow.isVisible(),
      adminListHTML: await page.locator('[data-testid="admin-list"]').innerHTML(),
      loadingState: await page.locator('[data-testid="loading"]').isVisible(),
      errorState: await page.locator('[data-testid="error"]').isVisible(),
      successMessage: await page.locator('[data-testid="success-message"]').isVisible()
    };
    console.log('Final state:', finalState);
    
    // Step 7: Analyze the results
    console.log('\n📈 Step 7: Analysis Results');
    console.log('=== DELETE REQUESTS ===');
    deleteRequests.forEach((req, i) => {
      console.log(`Request ${i + 1}:`, req);
    });
    
    console.log('\n=== DELETE RESPONSES ===');
    deleteResponses.forEach((res, i) => {
      console.log(`Response ${i + 1}:`, res);
    });
    
    console.log('\n=== STATE COMPARISON ===');
    console.log('Before delete admin count:', beforeDeleteState.adminCount);
    console.log('Immediate after admin count:', immediateAfterState.adminCount);
    console.log('Final admin count:', finalState.adminCount);
    
    console.log('\n=== UI REFRESH ANALYSIS ===');
    const adminCountChanged = beforeDeleteState.adminCount !== finalState.adminCount;
    const targetAdminStillVisible = finalState.targetAdminVisible;
    const htmlChanged = beforeDeleteState.adminListHTML !== finalState.adminListHTML;
    
    console.log(`Admin count changed: ${adminCountChanged}`);
    console.log(`Target admin still visible: ${targetAdminStillVisible}`);
    console.log(`HTML content changed: ${htmlChanged}`);
    
    // Step 8: Check for JavaScript errors
    console.log('\n🚨 Step 8: Checking for JavaScript errors');
    const jsErrors: string[] = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.log(`[JS ERROR] ${error.message}`);
    });
    
    // Step 9: Capture component state (if possible)
    console.log('\n🔧 Step 9: Capturing component state');
    try {
      const componentState = await page.evaluate(() => {
        // Try to access React component state or any global state
        const reactRoot = document.querySelector('#__next');
        if (reactRoot && (reactRoot as any)._reactInternalFiber) {
          return 'React component state accessible';
        }
        return 'React component state not accessible';
      });
      console.log('Component state:', componentState);
    } catch (error) {
      console.log('Could not access component state:', error);
    }
    
    // Step 10: Test manual refresh
    console.log('\n🔄 Step 10: Testing manual refresh');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const afterRefreshState = {
      adminCount: await adminRows.count(),
      targetAdminVisible: await targetAdminRow.isVisible()
    };
    console.log('After manual refresh state:', afterRefreshState);
    
    // Final analysis
    console.log('\n🎯 FINAL ANALYSIS');
    console.log('=====================================');
    
    if (adminCountChanged && !targetAdminStillVisible) {
      console.log('✅ UI REFRESH WORKING: Admin count decreased and target admin removed');
    } else if (!adminCountChanged && targetAdminStillVisible) {
      console.log('❌ UI REFRESH FAILED: Admin count unchanged and target admin still visible');
      console.log('🔍 ROOT CAUSE: Frontend state not updating after successful delete');
    } else if (adminCountChanged && targetAdminStillVisible) {
      console.log('⚠️ PARTIAL UI REFRESH: Admin count changed but target admin still visible');
      console.log('🔍 ROOT CAUSE: Inconsistent state update');
    } else {
      console.log('❓ UNCLEAR STATE: Need further investigation');
    }
    
    // Check if manual refresh fixes the issue
    if (afterRefreshState.adminCount < beforeDeleteState.adminCount) {
      console.log('✅ MANUAL REFRESH CONFIRMS: Delete was successful, UI just needs to refresh');
    }
    
    console.log('\n📋 RECOMMENDATIONS');
    console.log('=====================================');
    
    if (!adminCountChanged && targetAdminStillVisible) {
      console.log('1. Check if delete success callback is triggering UI refresh');
      console.log('2. Verify state management in AdminsTab component');
      console.log('3. Check if API response is being handled correctly');
      console.log('4. Ensure React state updates are properly triggered');
    }
    
    console.log('\n🏁 Test completed');
  });
  
  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
});
