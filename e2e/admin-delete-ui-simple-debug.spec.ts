import { test, expect, Page } from '@playwright/test';

/**
 * Simple Admin Delete UI Debug Test
 * 
 * This test focuses on the specific UI refresh issue after admin delete.
 * It uses the exact DOM structure from AdminsTab.tsx
 */

test.describe('Admin Delete UI Simple Debug', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set authentication cookie
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
    await page.waitForLoadState('networkidle');
  });

  test('Debug admin delete UI refresh issue', async () => {
    console.log('\n🔍 Starting Simple Admin Delete UI Debug Test');
    
    // Wait for the admins table to load
    await page.waitForSelector('[data-testid="admins-table"]', { timeout: 10000 });
    console.log('✅ Admins table loaded');
    
    // Get initial admin count
    const initialRows = await page.locator('[data-testid^="admins-row-"]').count();
    console.log(`Initial admin rows: ${initialRows}`);
    
    if (initialRows === 0) {
      console.log('❌ No admin rows found');
      return;
    }
    
    // Find a deletable admin (role === "admin", not "super_admin")
    let targetRow = null;
    let targetAdminId = '';
    
    for (let i = 0; i < initialRows; i++) {
      const row = page.locator('[data-testid^="admins-row-"]').nth(i);
      const testId = await row.getAttribute('data-testid');
      const adminId = testId?.replace('admins-row-', '') || '';
      
      // Check if this admin has a delete button (only admin role has delete button)
      const deleteButton = row.locator('[data-testid="admins-action-delete"]');
      if (await deleteButton.isVisible()) {
        targetRow = row;
        targetAdminId = adminId;
        console.log(`✅ Found deletable admin: ${adminId}`);
        break;
      }
    }
    
    if (!targetRow) {
      console.log('❌ No deletable admin found (all are super_admin or delete disabled)');
      return;
    }
    
    // Capture state before delete
    const beforeDeleteState = {
      adminCount: await page.locator('[data-testid^="admins-row-"]').count(),
      targetRowVisible: await targetRow.isVisible(),
      targetRowHTML: await targetRow.innerHTML()
    };
    console.log('Before delete state:', beforeDeleteState);
    
    // Monitor network requests
    const deleteRequests: any[] = [];
    const deleteResponses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes(`/api/admin/management/admins/${targetAdminId}`)) {
        deleteRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
        console.log(`[DELETE REQUEST] ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes(`/api/admin/management/admins/${targetAdminId}`)) {
        deleteResponses.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
        console.log(`[DELETE RESPONSE] ${response.status()} ${response.url()}`);
      }
    });
    
    // Click delete button
    const deleteButton = targetRow.locator('[data-testid="admins-action-delete"]');
    await deleteButton.click();
    console.log('✅ Delete button clicked');
    
    // Wait for confirmation dialog
    await page.waitForSelector('[role="dialog"], .modal, .confirmation-dialog', { timeout: 5000 });
    console.log('✅ Confirmation dialog appeared');
    
    // Find and click confirm button
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button[type="submit"]').first();
    await confirmButton.click();
    console.log('✅ Delete confirmed');
    
    // Wait for delete operation to complete
    await page.waitForTimeout(3000);
    
    // Capture state after delete
    const afterDeleteState = {
      adminCount: await page.locator('[data-testid^="admins-row-"]').count(),
      targetRowVisible: await targetRow.isVisible(),
      loadingState: await page.locator('[data-testid="admins-action-delete"]:has-text("Deleting")').isVisible()
    };
    console.log('After delete state:', afterDeleteState);
    
    // Wait a bit more for potential refresh
    await page.waitForTimeout(2000);
    
    // Capture final state
    const finalState = {
      adminCount: await page.locator('[data-testid^="admins-row-"]').count(),
      targetRowVisible: await targetRow.isVisible()
    };
    console.log('Final state:', finalState);
    
    // Analysis
    console.log('\n📊 ANALYSIS RESULTS');
    console.log('==================');
    console.log('Delete requests:', deleteRequests.length);
    console.log('Delete responses:', deleteResponses.length);
    
    deleteRequests.forEach((req, i) => {
      console.log(`Request ${i + 1}: ${req.method()} ${req.url()}`);
    });
    
    deleteResponses.forEach((res, i) => {
      console.log(`Response ${i + 1}: ${res.status()} ${res.url()}`);
    });
    
    console.log('\nState Changes:');
    console.log(`Admin count: ${beforeDeleteState.adminCount} → ${afterDeleteState.adminCount} → ${finalState.adminCount}`);
    console.log(`Target row visible: ${beforeDeleteState.targetRowVisible} → ${afterDeleteState.targetRowVisible} → ${finalState.targetRowVisible}`);
    
    // Check if UI refreshed properly
    const adminCountDecreased = finalState.adminCount < beforeDeleteState.adminCount;
    const targetRowRemoved = !finalState.targetRowVisible;
    
    console.log('\n🎯 UI REFRESH ANALYSIS');
    console.log('======================');
    
    if (adminCountDecreased && targetRowRemoved) {
      console.log('✅ UI REFRESH WORKING: Admin count decreased and target row removed');
    } else if (!adminCountDecreased && !targetRowRemoved) {
      console.log('❌ UI REFRESH FAILED: Admin count unchanged and target row still visible');
      console.log('🔍 ROOT CAUSE: Frontend state not updating after successful delete');
      
      // Check if manual refresh fixes it
      console.log('\n🔄 Testing manual refresh...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="admins-table"]');
      
      const afterRefreshState = {
        adminCount: await page.locator('[data-testid^="admins-row-"]').count(),
        targetRowVisible: await targetRow.isVisible()
      };
      console.log('After manual refresh:', afterRefreshState);
      
      if (afterRefreshState.adminCount < beforeDeleteState.adminCount) {
        console.log('✅ MANUAL REFRESH CONFIRMS: Delete was successful, UI just needs to refresh');
        console.log('🔧 SOLUTION: Fix frontend state management in AdminsTab component');
      }
    } else {
      console.log('⚠️ PARTIAL UI REFRESH: Mixed results');
    }
    
    console.log('\n🏁 Test completed');
  });
  
  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
});
